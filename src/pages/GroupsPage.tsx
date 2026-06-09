import { useState, useMemo, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as XLSX from 'xlsx'
import {
    getInstituteGroups, createInstituteGroup, updateInstituteGroup,
    deleteInstituteGroup, upsertInstituteGroups,
    type InstituteGroupInput,
} from '../services/instituteGroups'
import { parseGroupsSheet, detectAcademicYear, type ParsedGroup } from '../utils/parseGroupsXlsx'
import { useSettings } from '../contexts/SettingsContext'
import type { InstituteGroup } from '../types/database'
import { Layers, Plus, Trash2, Save, X, Edit2, Search, Upload, FileSpreadsheet, ChevronUp, GraduationCap, Users, Filter } from 'lucide-react'
import Select from '../components/Select'

const card: React.CSSProperties = {
    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.08)',
}
const inputStyle: React.CSSProperties = {
    padding: '7px 10px', background: '#f9fafb', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '13px', color: '#111827', outline: 'none', width: '100%', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500' }

const DEFAULT_YEAR = '2025-2026'

const emptyForm = (): InstituteGroupInput => ({
    group_name: '', faculty: 1, course: 1, student_count: 0,
    is_masters: false, specialty_code: '', academic_year: DEFAULT_YEAR,
})

const courseLabel = (g: { course: number; is_masters: boolean }) =>
    g.is_masters ? `М${g.course}` : `${g.course} курс`

const courseKey = (g: { course: number; is_masters: boolean }) => `${g.course}|${g.is_masters}`

export default function GroupsPage() {
    const queryClient = useQueryClient()
    const { academicYear } = useSettings()
    const [search, setSearch] = useState('')
    const [facultyFilter, setFacultyFilter] = useState('')
    const [courseFilter, setCourseFilter] = useState('')      // ключ "курс|магістр", напр. "4|false"
    const [specialtyFilter, setSpecialtyFilter] = useState('')
    const [yearFilter, setYearFilter] = useState('')
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editForm, setEditForm] = useState<InstituteGroupInput | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [addForm, setAddForm] = useState<InstituteGroupInput>(emptyForm())
    const [showImport, setShowImport] = useState(false)

    const { data: groups = [], isLoading } = useQuery({ queryKey: ['institute-groups'], queryFn: getInstituteGroups })
    const inv = () => queryClient.invalidateQueries({ queryKey: ['institute-groups'] })

    const createMut = useMutation({
        mutationFn: () => createInstituteGroup({ ...addForm, academic_year: academicYear }),
        onSuccess: () => { inv(); setAddForm(emptyForm()); setShowAddForm(false) },
    })
    const updateMut = useMutation({
        mutationFn: () => updateInstituteGroup(editingId!, editForm!),
        onSuccess: () => { inv(); setEditingId(null); setEditForm(null) },
    })
    const deleteMut = useMutation({ mutationFn: deleteInstituteGroup, onSuccess: inv })

    const faculties = useMemo(() => [...new Set(groups.map(g => g.faculty))].sort((a, b) => a - b), [groups])

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase()
        return groups.filter(g => {
            if (facultyFilter && g.faculty !== Number(facultyFilter)) return false
            if (courseFilter && courseKey(g) !== courseFilter) return false
            if (specialtyFilter && g.specialty_code !== specialtyFilter) return false
            if (yearFilter && g.academic_year !== yearFilter) return false
            if (q && !g.group_name.toLowerCase().includes(q) && !g.specialty_code.toLowerCase().includes(q)) return false
            return true
        })
    }, [groups, search, facultyFilter, courseFilter, specialtyFilter, yearFilter])

    const anyFilter = !!(facultyFilter || courseFilter || specialtyFilter || yearFilter || search)
    const resetFilters = () => { setFacultyFilter(''); setCourseFilter(''); setSpecialtyFilter(''); setYearFilter(''); setSearch('') }

    // Групуємо по факультету для відображення
    const byFaculty = useMemo(() => {
        const map: Record<number, InstituteGroup[]> = {}
        for (const g of filtered) (map[g.faculty] ??= []).push(g)
        return Object.entries(map).map(([f, gs]) => ({ faculty: Number(f), groups: gs }))
            .sort((a, b) => a.faculty - b.faculty)
    }, [filtered])

    const totalStudents = useMemo(() => filtered.reduce((s, g) => s + (g.student_count || 0), 0), [filtered])

    const facultyOptions = [
        { value: '', label: 'Всі факультети' },
        ...faculties.map(f => ({ value: String(f), label: `Факультет ${f}` })),
    ]
    // Курс-фільтр: унікальні комбінації курс+рівень, що присутні в даних
    const courseFilterOptions = useMemo(() => {
        const keys = [...new Set(groups.map(courseKey))]
            .sort((a, b) => {
                const [ca, ma] = a.split('|'); const [cb, mb] = b.split('|')
                return ma === mb ? Number(ca) - Number(cb) : (ma === 'true' ? 1 : -1)
            })
        return [{ value: '', label: 'Всі курси' }, ...keys.map(k => {
            const [c, m] = k.split('|')
            return { value: k, label: courseLabel({ course: Number(c), is_masters: m === 'true' }) }
        })]
    }, [groups])
    const specialtyFilterOptions = useMemo(() => [
        { value: '', label: 'Всі спеціальності' },
        ...[...new Set(groups.map(g => g.specialty_code).filter(Boolean))]
            .sort().map(c => ({ value: c, label: `спец. ${c}` })),
    ], [groups])
    const yearFilterOptions = useMemo(() => [
        { value: '', label: 'Всі роки' },
        ...[...new Set(groups.map(g => g.academic_year).filter(Boolean))]
            .sort().reverse().map(y => ({ value: y, label: y })),
    ], [groups])

    const courseOptions = [1, 2, 3, 4, 5].map(c => ({ value: String(c), label: `${c} курс` }))
    const mastersOptions = [{ value: 'false', label: 'Бакалавр' }, { value: 'true', label: 'Магістр' }]

    const startEdit = (g: InstituteGroup) => {
        setEditingId(g.id)
        setEditForm({
            group_name: g.group_name, faculty: g.faculty, course: g.course,
            student_count: g.student_count, is_masters: g.is_masters,
            specialty_code: g.specialty_code, academic_year: g.academic_year,
        })
    }

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Навчальні групи</h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>Нумерація потоків та груп · {groups.length} груп · {totalStudents} осіб</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Пошук групи або спец..."
                            style={{ ...inputStyle, width: '200px', paddingLeft: '34px', paddingRight: search ? '30px' : '10px' }} />
                        {search && (
                            <button onClick={() => setSearch('')} style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <button onClick={() => { setShowImport(v => !v); setShowAddForm(false) }}
                        style={{ padding: '9px 14px', background: showImport ? '#eef2ff' : '#f9fafb', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FileSpreadsheet size={15} /> Імпорт Excel
                    </button>
                    <button onClick={() => { setShowAddForm(v => !v); setShowImport(false) }}
                        style={{ padding: '9px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {showAddForm ? <ChevronUp size={15} /> : <Plus size={15} />} Додати групу
                    </button>
                </div>
            </div>

            {/* Filter bar */}
            <div style={{ ...card, padding: '10px 14px', marginBottom: '14px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <Filter size={15} color="#9ca3af" style={{ flexShrink: 0 }} />
                <Select value={facultyFilter} onChange={setFacultyFilter} options={facultyOptions} style={{ minWidth: '150px' }} />
                <Select value={courseFilter} onChange={setCourseFilter} options={courseFilterOptions} style={{ minWidth: '120px' }} />
                <Select value={specialtyFilter} onChange={setSpecialtyFilter} options={specialtyFilterOptions} style={{ minWidth: '160px' }} />
                <Select value={yearFilter} onChange={setYearFilter} options={yearFilterOptions} style={{ minWidth: '130px' }} />
                <span style={{ fontSize: '13px', color: '#6b7280', marginLeft: 'auto' }}>
                    Знайдено: <b style={{ color: '#111827' }}>{filtered.length}</b>
                </span>
                {anyFilter && (
                    <button onClick={resetFilters}
                        style={{ padding: '7px 12px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <X size={13} /> Скинути
                    </button>
                )}
            </div>

            {/* Import panel */}
            {showImport && <ImportPanel onDone={inv} defaultYear={academicYear} />}

            {/* Add form */}
            {showAddForm && (
                <div style={{ ...card, padding: '18px 20px', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '14px' }}>Нова група</h3>
                    <GroupFields form={addForm} setForm={setAddForm} courseOptions={courseOptions} mastersOptions={mastersOptions} />
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                        <button onClick={() => createMut.mutate()} disabled={!addForm.group_name || createMut.isPending}
                            style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Save size={14} /> {createMut.isPending ? 'Збереження...' : 'Зберегти'}
                        </button>
                        <button onClick={() => setShowAddForm(false)} style={{ padding: '8px 14px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>Скасувати</button>
                    </div>
                </div>
            )}

            {/* Groups list */}
            <div style={{ ...card, overflow: 'hidden' }}>
                {isLoading && <div style={{ padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Завантаження...</div>}
                {!isLoading && filtered.length === 0 && (
                    <div style={{ padding: '48px', textAlign: 'center' }}>
                        <Layers size={40} style={{ margin: '0 auto 12px', opacity: 0.12, color: '#9ca3af' }} />
                        <div style={{ fontSize: '14px', color: '#9ca3af' }}>Груп не знайдено</div>
                    </div>
                )}
                {byFaculty.map(({ faculty, groups: fgroups }) => (
                    <div key={faculty}>
                        <div onClick={() => setFacultyFilter(facultyFilter === String(faculty) ? '' : String(faculty))}
                            title="Фільтрувати за факультетом"
                            style={{ padding: '10px 20px', background: '#f9fafb', borderBottom: '1px solid #f3f4f6', borderTop: '1px solid #f3f4f6', fontSize: '12px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', cursor: 'pointer' }}>
                            Факультет {faculty} · {fgroups.length} груп
                        </div>
                        {fgroups.map(g => editingId === g.id && editForm ? (
                            <div key={g.id} style={{ padding: '12px 20px', borderBottom: '1px solid #f9fafb', background: '#fffbeb' }}>
                                <GroupFields form={editForm} setForm={setEditForm as (f: InstituteGroupInput) => void} courseOptions={courseOptions} mastersOptions={mastersOptions} />
                                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                    <button onClick={() => updateMut.mutate()} disabled={updateMut.isPending}
                                        style={{ padding: '6px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '12px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Save size={13} /> Зберегти
                                    </button>
                                    <button onClick={() => { setEditingId(null); setEditForm(null) }} style={{ padding: '6px 12px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '12px' }}>Скасувати</button>
                                </div>
                            </div>
                        ) : (
                            <div key={g.id} style={{ padding: '11px 20px', borderBottom: '1px solid #f9fafb', display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{ width: '52px', fontWeight: '700', fontSize: '14px', color: '#111827' }}>{g.group_name}</div>
                                <span onClick={() => setCourseFilter(courseFilter === courseKey(g) ? '' : courseKey(g))}
                                    title="Фільтрувати за курсом"
                                    style={{
                                        fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '3px', cursor: 'pointer',
                                        background: g.is_masters ? '#f5f3ff' : '#eff6ff', color: g.is_masters ? '#8b5cf6' : '#3b82f6',
                                        border: `1px solid ${courseFilter === courseKey(g) ? (g.is_masters ? '#8b5cf6' : '#3b82f6') : (g.is_masters ? '#ddd6fe' : '#bfdbfe')}`,
                                    }}>
                                    {g.is_masters && <GraduationCap size={11} />}{courseLabel(g)}
                                </span>
                                {g.specialty_code && (
                                    <span onClick={() => setSpecialtyFilter(specialtyFilter === g.specialty_code ? '' : g.specialty_code)}
                                        title="Фільтрувати за спеціальністю"
                                        style={{ fontSize: '12px', color: specialtyFilter === g.specialty_code ? '#f97316' : '#6b7280', cursor: 'pointer', fontWeight: specialtyFilter === g.specialty_code ? 600 : 400 }}>
                                        спец. {g.specialty_code}
                                    </span>
                                )}
                                <span style={{ fontSize: '12px', color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                    <Users size={12} /> {g.student_count} ос.
                                </span>
                                <span onClick={() => setYearFilter(yearFilter === g.academic_year ? '' : g.academic_year)}
                                    title="Фільтрувати за навчальним роком"
                                    style={{ fontSize: '11px', color: yearFilter === g.academic_year ? '#f97316' : '#d1d5db', marginLeft: 'auto', cursor: 'pointer', fontWeight: yearFilter === g.academic_year ? 600 : 400 }}>
                                    {g.academic_year}
                                </span>
                                <button onClick={() => startEdit(g)} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '2px' }}><Edit2 size={14} /></button>
                                <button onClick={() => { if (confirm(`Видалити групу "${g.group_name}"?`)) deleteMut.mutate(g.id) }} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '2px' }}><Trash2 size={14} /></button>
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Поля форми групи ────────────────────────────────────────────────────────
function GroupFields({ form, setForm, courseOptions, mastersOptions }: {
    form: InstituteGroupInput
    setForm: (f: InstituteGroupInput) => void
    courseOptions: { value: string; label: string }[]
    mastersOptions: { value: string; label: string }[]
}) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '10px' }}>
            <div>
                <label style={lbl}>Назва групи</label>
                <input style={inputStyle} value={form.group_name} onChange={e => setForm({ ...form, group_name: e.target.value })} placeholder="161" />
            </div>
            <div>
                <label style={lbl}>Факультет</label>
                <input style={inputStyle} type="number" min={1} value={form.faculty} onChange={e => setForm({ ...form, faculty: Number(e.target.value) })} />
            </div>
            <div>
                <label style={lbl}>Курс</label>
                <Select value={String(form.course)} onChange={v => setForm({ ...form, course: Number(v) })} options={courseOptions} />
            </div>
            <div>
                <label style={lbl}>Рівень</label>
                <Select value={form.is_masters ? 'true' : 'false'} onChange={v => setForm({ ...form, is_masters: v === 'true' })} options={mastersOptions} />
            </div>
            <div>
                <label style={lbl}>Спеціальність</label>
                <input style={inputStyle} value={form.specialty_code} onChange={e => setForm({ ...form, specialty_code: e.target.value })} placeholder="172" />
            </div>
            <div>
                <label style={lbl}>За списком</label>
                <input style={inputStyle} type="number" min={0} value={form.student_count} onChange={e => setForm({ ...form, student_count: Number(e.target.value) })} />
            </div>
        </div>
    )
}

// ── Панель імпорту з Excel (Додаток 2) ───────────────────────────────────────
function ImportPanel({ onDone, defaultYear }: { onDone: () => void; defaultYear: string }) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [fileName, setFileName] = useState('')
    const [parsed, setParsed] = useState<ParsedGroup[]>([])
    const [year, setYear] = useState(defaultYear)
    const [includeZaochna, setIncludeZaochna] = useState(true)
    const [importing, setImporting] = useState(false)
    const [result, setResult] = useState<{ inserted: number; updated: number } | null>(null)
    const [error, setError] = useState('')

    const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return
        setFileName(file.name); setParsed([]); setResult(null); setError('')
        const reader = new FileReader()
        reader.onload = evt => {
            try {
                const wb = XLSX.read(new Uint8Array(evt.target?.result as ArrayBuffer), { type: 'array' })
                const ws = wb.Sheets[wb.SheetNames[0]]
                const detected = detectAcademicYear(ws, DEFAULT_YEAR)
                setYear(detected)
                setParsed(parseGroupsSheet(ws, detected))
            } catch {
                setError('Не вдалося розпізнати файл')
            }
        }
        reader.readAsArrayBuffer(file)
    }

    const visible = parsed.filter(g => includeZaochna || !g.zaochna)

    const handleImport = async () => {
        setImporting(true); setError('')
        try {
            const payload: InstituteGroupInput[] = visible.map(({ zaochna, ...g }) => ({ ...g, academic_year: year }))
            setResult(await upsertInstituteGroups(payload))
            onDone()
        } catch {
            setError('Помилка під час збереження')
        }
        setImporting(false)
    }

    const zaochnaCount = parsed.filter(g => g.zaochna).length

    return (
        <div style={{ ...card, padding: '20px', marginBottom: '18px', border: '1px solid #c7d2fe' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Імпорт з «Додаток 2 — Нумерація потоків»</h3>
            <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>Розпізнає матричний макет факультетів/курсів та оновлює групи (за назвою + навч. роком)</p>

            <div onClick={() => fileRef.current?.click()}
                style={{ border: `2px dashed ${fileName ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: '12px', padding: '28px', textAlign: 'center', cursor: 'pointer', background: fileName ? '#f0fdf4' : '#fafafa', marginBottom: '16px' }}>
                <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} style={{ display: 'none' }} />
                {fileName ? (
                    <><FileSpreadsheet size={36} color="#16a34a" style={{ margin: '0 auto 10px' }} />
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#16a34a' }}>{fileName}</div>
                        <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>Натисніть щоб змінити файл</div></>
                ) : (
                    <><Upload size={36} color="#d1d5db" style={{ margin: '0 auto 10px' }} />
                        <div style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>Оберіть файл .xls / .xlsx</div></>
                )}
            </div>

            {error && <div style={{ padding: '10px 14px', background: '#fef2f2', color: '#dc2626', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', border: '1px solid #fecaca' }}>{error}</div>}

            {parsed.length > 0 && (
                <>
                    <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '14px', flexWrap: 'wrap' }}>
                        <div>
                            <label style={lbl}>Навчальний рік</label>
                            <input style={{ ...inputStyle, width: '130px' }} value={year} onChange={e => setYear(e.target.value)} />
                        </div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '13px', color: '#374151', cursor: 'pointer', padding: '7px 0' }}>
                            <input type="checkbox" checked={includeZaochna} onChange={e => setIncludeZaochna(e.target.checked)} />
                            Включати заочну форму {zaochnaCount > 0 && `(${zaochnaCount})`}
                        </label>
                        <div style={{ marginLeft: 'auto', fontSize: '13px', color: '#6b7280' }}>
                            До імпорту: <b style={{ color: '#111827' }}>{visible.length}</b> груп
                        </div>
                        <button onClick={handleImport} disabled={importing || visible.length === 0}
                            style={{ padding: '10px 20px', background: importing ? '#c7d2fe' : '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', cursor: importing ? 'default' : 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Upload size={16} /> {importing ? 'Імпортування...' : `Імпортувати ${visible.length}`}
                        </button>
                    </div>

                    {result && (
                        <div style={{ padding: '10px 14px', background: '#f0fdf4', color: '#16a34a', borderRadius: '8px', fontSize: '13px', marginBottom: '14px', border: '1px solid #bbf7d0' }}>
                            ✓ Готово: додано {result.inserted}, оновлено {result.updated}
                        </div>
                    )}

                    <div style={{ maxHeight: '320px', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '6px' }}>
                        {visible.map((g, i) => (
                            <div key={i} style={{ padding: '7px 10px', background: '#fafafa', border: '1px solid #f3f4f6', borderRadius: '8px', fontSize: '12px' }}>
                                <b style={{ color: '#111827' }}>{g.group_name}</b>
                                <span style={{ color: '#9ca3af' }}> · ф{g.faculty} · {g.is_masters ? `М${g.course}` : `${g.course}к`} · {g.student_count}ос</span>
                                {g.zaochna && <span style={{ color: '#f59e0b' }}> · заочна</span>}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    )
}
