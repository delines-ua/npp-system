import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { getDepartments } from '../services/departments'
import { createDiscipline } from '../services/disciplines'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Play } from 'lucide-react'

const card = {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
}

interface ParsedDiscipline {
    name: string
    education_level: string
    semester: number
    lecture_hours: number
    group_hours: number
    subgroup_hours: number
    practice_hours: number
    course_works: number
    control_works: number
    exams: number
    credits: number
    total_hours: number
    student_count: number
    lecture_streams: number
    group_count: number
    subgroup_count: number
    status: 'ready' | 'error' | 'imported'
    error?: string
}

export default function ImportPage() {
    const fileRef = useRef<HTMLInputElement>(null)
    const [fileName, setFileName] = useState('')
    const [sheetNames, setSheetNames] = useState<string[]>([])
    const [selectedSheet, setSelectedSheet] = useState('')
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null)
    const [parsed, setParsed] = useState<ParsedDiscipline[]>([])
    const [selectedDept, setSelectedDept] = useState('')
    const [importing, setImporting] = useState(false)
    const [importDone, setImportDone] = useState(false)
    const [step, setStep] = useState<1 | 2 | 3>(1)

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    })

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileName(file.name)
        setParsed([])
        setImportDone(false)

        const reader = new FileReader()
        reader.onload = evt => {
            const data = new Uint8Array(evt.target?.result as ArrayBuffer)
            const wb = XLSX.read(data, { type: 'array' })
            setWorkbook(wb)

            // Фільтруємо тільки аркуші кафедр (числові назви)
            const deptSheets = wb.SheetNames.filter(n =>
                /^\d+$/.test(n.trim()) &&
                !['1', '2', '3'].includes(n.trim())
            )
            setSheetNames(deptSheets.length > 0 ? deptSheets : wb.SheetNames)
            setSelectedSheet(deptSheets[0] || wb.SheetNames[0])
            setStep(2)
        }
        reader.readAsArrayBuffer(file)
    }

    const parseSheet = () => {
        if (!workbook || !selectedSheet) return

        const ws = workbook.Sheets[selectedSheet]
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null })

        const results: ParsedDiscipline[] = []
        let currentLevel = '1_Бакалавр (очна)'

        for (let i = 3; i < rows.length; i++) {
            const row = rows[i]
            if (!row) continue

            // Оновлюємо вид підготовки
            if (row[0] && String(row[0]).trim().length > 3) {
                const levelRaw = String(row[0]).trim().toLowerCase()
                if (levelRaw.includes('заочна')) currentLevel = '2_Бакалавр (заочна)'
                else if (levelRaw.includes('магістр')) currentLevel = '3_Магістр (очна)'
                else if (levelRaw.includes('філософії')) currentLevel = '4_Доктор філософії'
                else if (levelRaw.includes('загально')) currentLevel = '5_Базова загальновійськова підготовка'
                else if (levelRaw.includes('курси')) currentLevel = '7_Курси підвищення кваліфікації'
                else if (levelRaw.includes('бакалавр') && !levelRaw.includes('заочна')) currentLevel = '1_Бакалавр (очна)'
            }

            // Назва — колонка 2, номер — колонка 1
            const name = row[2] ? String(row[2]).trim() : ''
            const num = row[1]
            if (!name || !num || typeof num !== 'number') continue

            // Пропускаємо підсумкові рядки
            const nameLower = name.toLowerCase()
            if (nameLower.includes('всього') || nameLower.includes('разом') ||
                nameLower.includes('итого') || nameLower.includes('у тому числі') ||
                nameLower.includes('начальник')) continue

            const semester = Number(row[4]) || 1
            const total_hours_plan = Number(row[5]) || 0
            const lecture_hours = Number(row[7]) || 0
            const group_hours = Number(row[8]) || 0
            const subgroup_hours = Number(row[9]) || 0
            const practice_hours = Number(row[11]) || 0
            const course_works_raw = Number(row[12]) || 0
            const course_works = course_works_raw > 50 ? 0 : course_works_raw
            const control_works = Number(row[13]) || 0
            const exams = Number(row[16]) || 0
            const credits = Number(row[17]) || 0
            const student_count = Number(row[21]) || 0
            const lecture_streams = Number(row[22]) || 1
            const group_count = Number(row[23]) || 1
            const subgroup_count = Number(row[24]) || 1

            // Колонка 77 — готовий розрахований час по наказу
            const calculated_total = Number(row[77]) || 0
            const total_hours = Math.max(
                calculated_total > 0 ? calculated_total : 0,
                total_hours_plan > 0 ? total_hours_plan : 0
            )
            if (total_hours === 0 && total_hours_plan === 0) continue

            results.push({
                name,
                education_level: currentLevel,
                semester,
                lecture_hours,
                group_hours,
                subgroup_hours,
                practice_hours,
                course_works,
                control_works,
                exams,
                credits,
                total_hours,
                student_count,
                lecture_streams,
                group_count,
                subgroup_count,
                status: 'ready',
            })
        }

        setParsed(results)
        setStep(3)
    }

    const handleImport = async () => {
        if (!selectedDept || parsed.length === 0) return
        setImporting(true)

        const updated = [...parsed]
        for (let i = 0; i < updated.length; i++) {
            if (updated[i].status !== 'ready') continue
            try {
                await createDiscipline({
                    department_id: selectedDept,
                    name: updated[i].name,
                    education_level: updated[i].education_level,
                    semester: updated[i].semester,
                    total_hours: updated[i].total_hours,
                    lecture_hours: updated[i].lecture_hours,
                    group_hours: updated[i].group_hours,
                    subgroup_hours: updated[i].subgroup_hours,
                    tsz_hours: 0,
                    practice_hours: updated[i].practice_hours,
                    course_works: updated[i].course_works,
                    control_works: updated[i].control_works,
                    exams: updated[i].exams,
                    credits: updated[i].credits,
                    academic_year: '2025-2026',
                    student_count: updated[i].student_count,
                    lecture_streams: updated[i].lecture_streams,
                    group_count: updated[i].group_count,
                    subgroup_count: updated[i].subgroup_count,
                })
                updated[i] = { ...updated[i], status: 'imported' }
            } catch {
                updated[i] = { ...updated[i], status: 'error', error: 'Помилка збереження' }
            }
            setParsed([...updated])
        }

        setImporting(false)
        setImportDone(true)
    }

    const readyCount = parsed.filter(p => p.status === 'ready').length
    const importedCount = parsed.filter(p => p.status === 'imported').length
    const errorCount = parsed.filter(p => p.status === 'error').length

    return (
        <div>
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                    Імпорт Excel
                </h1>
                <p style={{ fontSize: '14px', color: '#475569' }}>
                    Завантаження дисциплін з файлу розрахунку НПП · Наказ №155/291
                </p>
            </div>

            {/* Кроки */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '28px' }}>
                {[
                    { n: 1, label: 'Завантажити файл' },
                    { n: 2, label: 'Обрати аркуш' },
                    { n: 3, label: 'Імпортувати' },
                ].map(({ n, label }, idx) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: step >= n ? '#2563eb' : 'rgba(255,255,255,0.05)',
                                border: `2px solid ${step >= n ? '#2563eb' : 'rgba(255,255,255,0.1)'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: '700',
                                color: step >= n ? '#fff' : '#475569',
                                transition: 'all 0.3s',
                            }}>
                                {step > n ? <CheckCircle size={16} /> : n}
                            </div>
                            <span style={{ fontSize: '13px', color: step >= n ? '#e2e8f0' : '#475569', fontWeight: step === n ? '600' : '400' }}>
                {label}
              </span>
                        </div>
                        {idx < 2 && (
                            <div style={{ flex: 1, height: '1px', background: step > n ? '#2563eb' : 'rgba(255,255,255,0.06)', margin: '0 16px', transition: 'all 0.3s' }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Крок 1 */}
            <div style={{ ...card, padding: '32px', marginBottom: '20px' }}>
                <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                        border: `2px dashed ${fileName ? 'rgba(34,197,94,0.4)' : 'rgba(255,255,255,0.1)'}`,
                        borderRadius: '12px', padding: '48px', textAlign: 'center', cursor: 'pointer',
                        background: fileName ? 'rgba(34,197,94,0.05)' : 'rgba(255,255,255,0.02)',
                        transition: 'all 0.2s',
                    }}
                >
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
                    {fileName ? (
                        <>
                            <FileSpreadsheet size={48} color="#22c55e" style={{ margin: '0 auto 16px' }} />
                            <div style={{ fontWeight: '600', fontSize: '16px', color: '#4ade80', marginBottom: '4px' }}>{fileName}</div>
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>Натисніть щоб змінити файл</div>
                        </>
                    ) : (
                        <>
                            <Upload size={48} color="#475569" style={{ margin: '0 auto 16px' }} />
                            <div style={{ fontWeight: '600', fontSize: '16px', color: '#94a3b8', marginBottom: '8px' }}>
                                Перетягніть файл або натисніть для вибору
                            </div>
                            <div style={{ fontSize: '13px', color: '#475569' }}>
                                Підтримується формат Розрахунку НПП ВІТІ (.xlsx)
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Крок 2 */}
            {step >= 2 && sheetNames.length > 0 && (
                <div style={{ ...card, padding: '24px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '8px' }}>
                        Оберіть аркуш кафедри
                    </h3>
                    <p style={{ fontSize: '13px', color: '#475569', marginBottom: '16px' }}>
                        Аркуші пронумеровані по номеру кафедри (11, 12, 21, 22 тощо)
                    </p>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        {sheetNames.map(name => (
                            <button
                                key={name}
                                onClick={() => setSelectedSheet(name)}
                                style={{
                                    padding: '8px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: '500',
                                    border: '1px solid', cursor: 'pointer',
                                    background: selectedSheet === name ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.03)',
                                    borderColor: selectedSheet === name ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.08)',
                                    color: selectedSheet === name ? '#60a5fa' : '#94a3b8',
                                    transition: 'all 0.2s',
                                }}
                            >
                                Каф. №{name}
                            </button>
                        ))}
                    </div>

                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                                Прив'язати до кафедри в системі
                            </label>
                            <select
                                value={selectedDept}
                                onChange={e => setSelectedDept(e.target.value)}
                                style={{ padding: '10px 14px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px', color: '#e2e8f0', outline: 'none', width: '100%' }}
                            >
                                <option value="">Оберіть кафедру</option>
                                {departments?.map(d => <option key={d.id} value={d.id}>№ {d.number} — {d.name}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={parseSheet}
                            disabled={!selectedSheet || !selectedDept}
                            style={{ padding: '10px 24px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                        >
                            <Play size={16} /> Розпізнати дані
                        </button>
                    </div>
                </div>
            )}

            {/* Крок 3 */}
            {step >= 3 && parsed.length > 0 && (
                <div style={{ ...card, padding: '24px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <div>
                            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '4px' }}>
                                Розпізнано дисциплін: {parsed.length}
                            </h3>
                            <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                                <span style={{ color: '#4ade80' }}>✓ Готово: {readyCount}</span>
                                <span style={{ color: '#60a5fa' }}>↑ Імпортовано: {importedCount}</span>
                                {errorCount > 0 && <span style={{ color: '#f87171' }}>✗ Помилки: {errorCount}</span>}
                            </div>
                        </div>
                        {!importDone ? (
                            <button
                                onClick={handleImport}
                                disabled={importing || readyCount === 0}
                                style={{ padding: '10px 24px', background: importing ? 'rgba(34,197,94,0.3)' : '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: importing ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
                            >
                                <Upload size={16} />
                                {importing ? 'Імпортування...' : `Імпортувати ${readyCount} дисциплін`}
                            </button>
                        ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontWeight: '600', fontSize: '14px' }}>
                                <CheckCircle size={18} /> Імпорт завершено!
                            </div>
                        )}
                    </div>

                    {/* Превью */}
                    <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        {parsed.map((disc, i) => (
                            <div key={i} style={{
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '10px 14px', borderRadius: '8px',
                                background: disc.status === 'imported' ? 'rgba(34,197,94,0.06)' : disc.status === 'error' ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                                border: `1px solid ${disc.status === 'imported' ? 'rgba(34,197,94,0.15)' : disc.status === 'error' ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)'}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                    {disc.status === 'imported'
                                        ? <CheckCircle size={14} color="#22c55e" />
                                        : disc.status === 'error'
                                            ? <AlertTriangle size={14} color="#ef4444" />
                                            : <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #3b82f6', flexShrink: 0 }} />
                                    }
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: '500' }}>{disc.name}</div>
                                        <div style={{ fontSize: '11px', color: '#475569', marginTop: '2px' }}>
                                            {disc.education_level.replace(/^\d+_/, '')} · Сем. {disc.semester} ·
                                            {disc.student_count > 0 && ` ${disc.student_count} курс. ·`}
                                            {disc.group_count > 0 && ` ${disc.group_count} гр. ·`}
                                            {' '}Лек: {disc.lecture_hours} · Груп: {disc.group_hours}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>
                    {disc.total_hours} год
                  </span>
                                    {disc.error && <span style={{ fontSize: '11px', color: '#f87171' }}>{disc.error}</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}