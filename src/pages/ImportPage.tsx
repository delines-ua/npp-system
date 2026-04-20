import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import { getDepartments } from '../services/departments'
import { createDiscipline } from '../services/disciplines'
import { Upload, FileSpreadsheet, CheckCircle, AlertTriangle, Play } from 'lucide-react'

const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
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

            const deptSheets = wb.SheetNames.filter(n =>
                /^\d+$/.test(n.trim()) && !['1', '2', '3'].includes(n.trim())
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

            if (row[0] && String(row[0]).trim().length > 3) {
                const levelRaw = String(row[0]).trim().toLowerCase()
                if (levelRaw.includes('заочна')) currentLevel = '2_Бакалавр (заочна)'
                else if (levelRaw.includes('магістр')) currentLevel = '3_Магістр (очна)'
                else if (levelRaw.includes('філософії')) currentLevel = '4_Доктор філософії'
                else if (levelRaw.includes('загально')) currentLevel = '5_Базова загальновійськова підготовка'
                else if (levelRaw.includes('курси')) currentLevel = '7_Курси підвищення кваліфікації'
                else if (levelRaw.includes('бакалавр') && !levelRaw.includes('заочна')) currentLevel = '1_Бакалавр (очна)'
            }

            const name = row[2] ? String(row[2]).trim() : ''
            const num = row[1]
            if (!name || !num || typeof num !== 'number') continue

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

            const calculated_total = Number(row[77]) || 0
            const total_hours = Math.max(
                calculated_total > 0 ? calculated_total : 0,
                total_hours_plan > 0 ? total_hours_plan : 0
            )
            if (total_hours === 0 && total_hours_plan === 0) continue

            results.push({
                name, education_level: currentLevel, semester,
                lecture_hours, group_hours, subgroup_hours, practice_hours,
                course_works, control_works, exams, credits, total_hours,
                student_count, lecture_streams, group_count, subgroup_count,
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
                    department_id: selectedDept, name: updated[i].name,
                    education_level: updated[i].education_level, semester: updated[i].semester,
                    total_hours: updated[i].total_hours, lecture_hours: updated[i].lecture_hours,
                    group_hours: updated[i].group_hours, subgroup_hours: updated[i].subgroup_hours,
                    tsz_hours: 0, practice_hours: updated[i].practice_hours,
                    course_works: updated[i].course_works, control_works: updated[i].control_works,
                    exams: updated[i].exams, credits: updated[i].credits,
                    academic_year: '2025-2026', student_count: updated[i].student_count,
                    lecture_streams: updated[i].lecture_streams, group_count: updated[i].group_count,
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
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                    Імпорт Excel
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    Завантаження дисциплін з файлу розрахунку НПП · Наказ №155/291
                </p>
            </div>

            {/* Кроки */}
            <div style={{ display: 'flex', gap: '0', marginBottom: '24px' }}>
                {[
                    { n: 1, label: 'Завантажити файл' },
                    { n: 2, label: 'Обрати аркуш' },
                    { n: 3, label: 'Імпортувати' },
                ].map(({ n, label }, idx) => (
                    <div key={n} style={{ display: 'flex', alignItems: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                                width: '32px', height: '32px', borderRadius: '50%',
                                background: step >= n ? '#f97316' : '#f3f4f6',
                                border: `2px solid ${step >= n ? '#f97316' : '#e5e7eb'}`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: '13px', fontWeight: '700',
                                color: step >= n ? '#fff' : '#9ca3af',
                                transition: 'all 0.3s',
                            }}>
                                {step > n ? <CheckCircle size={16} /> : n}
                            </div>
                            <span style={{ fontSize: '13px', color: step >= n ? '#111827' : '#9ca3af', fontWeight: step === n ? '600' : '400' }}>
                                {label}
                            </span>
                        </div>
                        {idx < 2 && (
                            <div style={{ flex: 1, height: '2px', background: step > n ? '#f97316' : '#e5e7eb', margin: '0 16px', transition: 'all 0.3s', borderRadius: '1px' }} />
                        )}
                    </div>
                ))}
            </div>

            {/* Крок 1 */}
            <div style={{ ...card, padding: '32px', marginBottom: '16px' }}>
                <div
                    onClick={() => fileRef.current?.click()}
                    style={{
                        border: `2px dashed ${fileName ? '#bbf7d0' : '#e5e7eb'}`,
                        borderRadius: '12px', padding: '48px', textAlign: 'center', cursor: 'pointer',
                        background: fileName ? '#f0fdf4' : '#fafafa',
                        transition: 'all 0.2s',
                    }}
                >
                    <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
                    {fileName ? (
                        <>
                            <FileSpreadsheet size={48} color="#16a34a" style={{ margin: '0 auto 16px' }} />
                            <div style={{ fontWeight: '600', fontSize: '16px', color: '#16a34a', marginBottom: '4px' }}>{fileName}</div>
                            <div style={{ fontSize: '13px', color: '#9ca3af' }}>Натисніть щоб змінити файл</div>
                        </>
                    ) : (
                        <>
                            <Upload size={48} color="#d1d5db" style={{ margin: '0 auto 16px' }} />
                            <div style={{ fontWeight: '600', fontSize: '16px', color: '#374151', marginBottom: '8px' }}>
                                Перетягніть файл або натисніть для вибору
                            </div>
                            <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                                Підтримується формат Розрахунку НПП ВІТІ (.xlsx)
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Крок 2 */}
            {step >= 2 && sheetNames.length > 0 && (
                <div style={{ ...card, padding: '24px', marginBottom: '16px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '6px' }}>
                        Оберіть аркуш кафедри
                    </h3>
                    <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>
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
                                    background: selectedSheet === name ? '#fff7ed' : '#f9fafb',
                                    borderColor: selectedSheet === name ? '#fed7aa' : '#e5e7eb',
                                    color: selectedSheet === name ? '#f97316' : '#6b7280',
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
                                style={{ padding: '10px 14px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', color: '#111827', outline: 'none', width: '100%' }}
                            >
                                <option value="">Оберіть кафедру</option>
                                {departments?.map(d => <option key={d.id} value={d.id}>№ {d.number} — {d.name}</option>)}
                            </select>
                        </div>
                        <button
                            onClick={parseSheet}
                            disabled={!selectedSheet || !selectedDept}
                            style={{ padding: '10px 24px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
                        >
                            <Play size={16} /> Розпізнати дані
                        </button>
                    </div>
                </div>
            )}

            {/* Крок 3 */}
            {step >= 3 && parsed.length > 0 && (
                <div style={card}>
                    <div style={{ padding: '24px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>
                                    Розпізнано дисциплін: {parsed.length}
                                </h3>
                                <div style={{ display: 'flex', gap: '16px', fontSize: '13px' }}>
                                    <span style={{ color: '#16a34a' }}>✓ Готово: {readyCount}</span>
                                    <span style={{ color: '#3b82f6' }}>↑ Імпортовано: {importedCount}</span>
                                    {errorCount > 0 && <span style={{ color: '#dc2626' }}>✗ Помилки: {errorCount}</span>}
                                </div>
                            </div>
                            {!importDone ? (
                                <button
                                    onClick={handleImport}
                                    disabled={importing || readyCount === 0}
                                    style={{ padding: '10px 24px', background: importing ? '#fed7aa' : '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: importing ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}
                                >
                                    <Upload size={16} />
                                    {importing ? 'Імпортування...' : `Імпортувати ${readyCount} дисциплін`}
                                </button>
                            ) : (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>
                                    <CheckCircle size={18} /> Імпорт завершено!
                                </div>
                            )}
                        </div>

                        <div style={{ maxHeight: '500px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {parsed.map((disc, i) => (
                                <div key={i} style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: '10px 14px', borderRadius: '8px',
                                    background: disc.status === 'imported' ? '#f0fdf4' : disc.status === 'error' ? '#fef2f2' : '#fafafa',
                                    border: `1px solid ${disc.status === 'imported' ? '#bbf7d0' : disc.status === 'error' ? '#fecaca' : '#f3f4f6'}`,
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                        {disc.status === 'imported'
                                            ? <CheckCircle size={14} color="#16a34a" />
                                            : disc.status === 'error'
                                                ? <AlertTriangle size={14} color="#dc2626" />
                                                : <div style={{ width: '14px', height: '14px', borderRadius: '50%', border: '2px solid #f97316', flexShrink: 0 }} />
                                        }
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: '13px', color: '#111827', fontWeight: '500' }}>{disc.name}</div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                                {disc.education_level.replace(/^\d+_/, '')} · Сем. {disc.semester} ·
                                                {disc.student_count > 0 && ` ${disc.student_count} курс. ·`}
                                                {disc.group_count > 0 && ` ${disc.group_count} гр. ·`}
                                                {' '}Лек: {disc.lecture_hours} · Груп: {disc.group_hours}
                                            </div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                                        <span style={{ fontSize: '12px', color: '#f97316', fontWeight: '600' }}>
                                            {disc.total_hours} год
                                        </span>
                                        {disc.error && <span style={{ fontSize: '11px', color: '#dc2626' }}>{disc.error}</span>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}