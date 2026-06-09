import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDisciplines, createDiscipline, updateDiscipline, deleteDiscipline } from '../services/disciplines'
import { getDepartments } from '../services/departments'
import { EDUCATION_LEVELS } from '../utils/lawNorms'
import type { Discipline } from '../types/database'
import { BookOpen, Plus, Trash2, X, Save, Search, Edit2, ChevronUp } from 'lucide-react'
import Select from '../components/Select'
import { useSettings } from '../contexts/SettingsContext'

const ACADEMIC_YEAR = '2025-2026'

const card: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.08)',
}

const inputStyle: React.CSSProperties = {
    padding: '8px 11px', background: '#f9fafb', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '13px', color: '#111827', outline: 'none', width: '100%',
    boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500',
}

type FormData = Omit<Discipline, 'id'>

const emptyForm = (): FormData => ({
    department_id: '', name: '', education_level: '1_Бакалавр (очна)',
    semester: 1, total_hours: 0, lecture_hours: 0, group_hours: 0,
    subgroup_hours: 0, tsz_hours: 0, practice_hours: 0,
    course_works: 0, control_works: 0, exams: 0, credits: 0,
    academic_year: ACADEMIC_YEAR,
    student_count: 0, lecture_streams: 1, group_count: 1, subgroup_count: 0,
    group_names: '', specialty_codes: '', is_thesis: true,
})

export default function DisciplinesPage() {
    const queryClient = useQueryClient()
    const { academicYear } = useSettings()

    const [selectedDept, setSelectedDept] = useState('')
    const [selectedDiscId, setSelectedDiscId] = useState<string | null>(null)
    const [discFilter, setDiscFilter] = useState('')
    const [filterLevel, setFilterLevel] = useState('')
    const [filterSem, setFilterSem] = useState<'' | '1' | '2'>('')
    const [showAddForm, setShowAddForm] = useState(false)
    const [addForm, setAddForm] = useState<FormData>(emptyForm())
    const [editForm, setEditForm] = useState<FormData | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
    useEffect(() => {
        if (!selectedDept && departments?.length) {
            const d = departments.find(d => d.number === '22')
            if (d) setSelectedDept(d.id)
        }
    }, [departments])

    const { data: disciplines = [], isLoading } = useQuery({
        queryKey: ['disciplines', selectedDept, academicYear],
        queryFn: () => getDisciplines(selectedDept || undefined, academicYear),
        enabled: !!selectedDept,
    })

    const invDisc = () => queryClient.invalidateQueries({ queryKey: ['disciplines'] })

    const createMutation = useMutation({
        mutationFn: () => createDiscipline({ ...addForm, academic_year: academicYear }),
        onSuccess: () => { invDisc(); setAddForm(emptyForm()); setShowAddForm(false) },
    })

    const updateMutation = useMutation({
        mutationFn: () => updateDiscipline(selectedDiscId!, editForm!),
        onSuccess: () => { invDisc(); setIsEditing(false) },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteDiscipline,
        onSuccess: () => { invDisc(); setSelectedDiscId(null); setIsEditing(false) },
    })

    const filteredDiscs = useMemo(() => disciplines.filter(d => {
        if (filterLevel && !d.education_level.includes(filterLevel)) return false
        if (filterSem === '1' && d.semester % 2 === 0) return false
        if (filterSem === '2' && d.semester % 2 === 1) return false
        if (discFilter && !d.name.toLowerCase().includes(discFilter.toLowerCase())) return false
        return true
    }), [disciplines, filterLevel, filterSem, discFilter])

    const selectedDisc = disciplines.find(d => d.id === selectedDiscId) ?? null

    const handleDiscClick = (disc: Discipline) => {
        setSelectedDiscId(disc.id)
        setIsEditing(false)
        setEditForm({ ...disc })
    }

    const handleStartEdit = () => {
        if (selectedDisc) { setEditForm({ ...selectedDisc }); setIsEditing(true) }
    }

    const handleCancelEdit = () => {
        setIsEditing(false)
        setEditForm(selectedDisc ? { ...selectedDisc } : null)
    }

    const numField = (
        form: FormData, setter: (f: FormData) => void,
        field: keyof FormData, label: string
    ) => (
        <div key={field}>
            <label style={labelStyle}>{label}</label>
            <input style={inputStyle} type="number" min={0}
                value={form[field] as number}
                onChange={e => setter({ ...form, [field]: Number(e.target.value) })}
            />
        </div>
    )

    const displayForm = isEditing && editForm ? editForm : selectedDisc

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Дисципліни</h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>Перегляд та редагування дисциплін · {academicYear}</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <Select
                        value={selectedDept}
                        onChange={v => { setSelectedDept(v); setSelectedDiscId(null); setIsEditing(false) }}
                        placeholder="Всі кафедри"
                        style={{ minWidth: '240px' }}
                        options={[
                            { value: '', label: 'Всі кафедри' },
                            ...(departments?.map(d => ({ value: d.id, label: `Каф. №${d.number} — ${d.name}` })) ?? []),
                        ]}
                    />
                    <Select
                        value={filterLevel}
                        onChange={setFilterLevel}
                        placeholder="Всі рівні"
                        style={{ minWidth: '160px' }}
                        options={[
                            { value: '', label: 'Всі рівні' },
                            ...EDUCATION_LEVELS.map(l => ({ value: l.label.split(' ')[0], label: l.label })),
                        ]}
                    />
                    <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                        {(['', '1', '2'] as const).map(v => (
                            <button key={v} onClick={() => setFilterSem(v)}
                                style={{
                                    padding: '6px 12px', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                    fontSize: '12px', fontWeight: '500',
                                    background: filterSem === v ? '#fff' : 'transparent',
                                    color: filterSem === v ? '#111827' : '#6b7280',
                                    boxShadow: filterSem === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                }}>
                                {v === '' ? 'Всі' : v === '1' ? 'І сем.' : 'ІІ сем.'}
                            </button>
                        ))}
                    </div>
                    <button onClick={() => { setShowAddForm(v => !v); setSelectedDiscId(null) }}
                        style={{ padding: '9px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {showAddForm ? <ChevronUp size={15} /> : <Plus size={15} />}
                        Додати
                    </button>
                </div>
            </div>

            {/* Add form */}
            {showAddForm && (
                <div style={{ ...card, padding: '20px', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '14px' }}>Нова дисципліна</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
                        <div>
                            <label style={labelStyle}>Назва</label>
                            <input style={inputStyle} value={addForm.name} onChange={e => setAddForm({ ...addForm, name: e.target.value })} placeholder="Назва дисципліни" />
                        </div>
                        <div>
                            <label style={labelStyle}>Кафедра</label>
                            <Select
                                value={addForm.department_id}
                                onChange={v => setAddForm({ ...addForm, department_id: v })}
                                placeholder="Оберіть"
                                options={departments?.map(d => ({ value: d.id, label: `№${d.number} ${d.name}` })) ?? []}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Вид підготовки</label>
                            <Select
                                value={addForm.education_level}
                                onChange={v => setAddForm({ ...addForm, education_level: v })}
                                options={EDUCATION_LEVELS.map(l => ({ value: l.value, label: l.label }))}
                            />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '8px', marginBottom: '10px' }}>
                        {numField(addForm, setAddForm, 'semester', 'Семестр')}
                        {numField(addForm, setAddForm, 'lecture_hours', 'Лекції')}
                        {numField(addForm, setAddForm, 'group_hours', 'ГЗ')}
                        {numField(addForm, setAddForm, 'subgroup_hours', 'ПЗ')}
                        {numField(addForm, setAddForm, 'practice_hours', 'Практика')}
                        {numField(addForm, setAddForm, 'total_hours', 'Всього год')}
                        {numField(addForm, setAddForm, 'exams', 'Іспити')}
                        {numField(addForm, setAddForm, 'credits', 'Заліки')}
                        {numField(addForm, setAddForm, 'course_works', 'Курсові')}
                        {numField(addForm, setAddForm, 'control_works', 'Контрольні')}
                        {numField(addForm, setAddForm, 'student_count', 'Курсантів')}
                        {numField(addForm, setAddForm, 'group_count', 'Груп')}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => createMutation.mutate()} disabled={!addForm.name || !addForm.department_id || createMutation.isPending}
                            style={{ padding: '8px 16px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Save size={14} /> {createMutation.isPending ? 'Збереження...' : 'Зберегти'}
                        </button>
                        <button onClick={() => setShowAddForm(false)}
                            style={{ padding: '8px 14px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px' }}>
                            Скасувати
                        </button>
                    </div>
                </div>
            )}

            {/* Main layout */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedDiscId ? '320px 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>

                {/* List */}
                <div style={{ ...card, overflow: 'hidden', position: 'sticky', top: '72px' }}>
                    <div style={{ padding: '10px 14px', borderBottom: '1px solid #f3f4f6' }}>
                        <div style={{ position: 'relative' }}>
                            <Search size={13} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                            <input value={discFilter} onChange={e => setDiscFilter(e.target.value)}
                                placeholder={`Пошук серед ${filteredDiscs.length} дисциплін...`}
                                style={{ ...inputStyle, paddingLeft: '30px' }} />
                        </div>
                    </div>
                    <div style={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                        {isLoading && <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Завантаження...</div>}
                        {!isLoading && !selectedDept && (
                            <div style={{ padding: '48px', textAlign: 'center' }}>
                                <BookOpen size={40} style={{ margin: '0 auto 12px', opacity: 0.12, color: '#9ca3af' }} />
                                <div style={{ fontSize: '14px', color: '#9ca3af' }}>Оберіть кафедру</div>
                            </div>
                        )}
                        {!isLoading && selectedDept && filteredDiscs.length === 0 && (
                            <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>Дисциплін не знайдено</div>
                        )}
                        {filteredDiscs.map(disc => {
                            const isSelected = disc.id === selectedDiscId
                            return (
                                <div key={disc.id} onClick={() => handleDiscClick(disc)}
                                    style={{
                                        padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb',
                                        background: isSelected ? '#fff7ed' : 'transparent',
                                        borderLeft: `3px solid ${isSelected ? '#f97316' : 'transparent'}`,
                                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                                    }}>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            {disc.name}
                                            {disc.is_thesis && (
                                                <span style={{ fontSize: '10px', background: '#f3f4f6', color: '#6b7280', padding: '1px 5px', borderRadius: '4px', border: '1px solid #e5e7eb', flexShrink: 0, fontWeight: '600' }}>
                                                    📋 Атестація
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>
                                            {disc.education_level.replace(/^\d+_/, '')} · Сем.{disc.semester} · {disc.student_count} ос.
                                        </div>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); if (confirm(`Видалити "${disc.name}"?`)) deleteMutation.mutate(disc.id) }}
                                        style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '2px', flexShrink: 0, marginTop: '2px' }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Detail / Edit panel */}
                {selectedDisc && displayForm && (
                    <div style={{ ...card, padding: '22px' }}>
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ flex: 1, minWidth: 0, paddingRight: '12px' }}>
                                {isEditing ? (
                                    <input style={{ ...inputStyle, fontSize: '16px', fontWeight: '600' }}
                                        value={editForm!.name}
                                        onChange={e => setEditForm({ ...editForm!, name: e.target.value })} />
                                ) : (
                                    <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>{selectedDisc.name}</h2>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                {!isEditing ? (
                                    <button onClick={handleStartEdit}
                                        style={{ padding: '7px 14px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Edit2 size={13} /> Редагувати
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                                            style={{ padding: '7px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Save size={13} /> {updateMutation.isPending ? 'Збереження...' : 'Зберегти'}
                                        </button>
                                        <button onClick={handleCancelEdit}
                                            style={{ padding: '7px 12px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <X size={13} /> Скасувати
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Top row: level + semester + academic year */}
                        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                            <div>
                                <label style={labelStyle}>Вид підготовки</label>
                                {isEditing ? (
                                    <Select
                                        value={editForm!.education_level}
                                        onChange={v => setEditForm({ ...editForm!, education_level: v })}
                                        options={EDUCATION_LEVELS.map(l => ({ value: l.value, label: l.label }))}
                                    />
                                ) : (
                                    <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>
                                        {displayForm.education_level.replace(/^\d+_/, '')}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label style={labelStyle}>Семестр</label>
                                {isEditing ? (
                                    <input style={inputStyle} type="number" min={1} max={10} value={editForm!.semester} onChange={e => setEditForm({ ...editForm!, semester: Number(e.target.value) })} />
                                ) : (
                                    <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>{displayForm.semester}</div>
                                )}
                            </div>
                            <div>
                                <label style={labelStyle}>Навч. рік</label>
                                <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>{displayForm.academic_year}</div>
                            </div>
                        </div>

                        {/* Hours grid */}
                        <div style={{ marginBottom: '6px' }}>
                            <label style={{ ...labelStyle, marginBottom: '8px', fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Години</label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '8px' }}>
                                {([
                                    ['lecture_hours', 'Лекції'],
                                    ['group_hours', 'ГЗ'],
                                    ['subgroup_hours', 'ПЗ'],
                                    ['practice_hours', 'Практика'],
                                    ['course_works', 'Курсові'],
                                    ['control_works', 'Контрольні'],
                                    ['exams', 'Іспити'],
                                    ['credits', 'Заліки'],
                                ] as [keyof FormData, string][]).map(([field, label]) => (
                                    <div key={field}>
                                        <label style={labelStyle}>{label}</label>
                                        {isEditing ? (
                                            <input style={inputStyle} type="number" min={0}
                                                value={editForm![field] as number}
                                                onChange={e => setEditForm({ ...editForm!, [field]: Number(e.target.value) })} />
                                        ) : (
                                            <div style={{ padding: '8px 11px', background: (displayForm[field] as number) > 0 ? '#eff6ff' : '#f9fafb', borderRadius: '8px', fontSize: '13px', fontWeight: (displayForm[field] as number) > 0 ? '600' : '400', color: (displayForm[field] as number) > 0 ? '#1d4ed8' : '#9ca3af', border: '1px solid #e5e7eb' }}>
                                                {displayForm[field] as number}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                                <div>
                                    <label style={labelStyle}>Всього годин</label>
                                    {isEditing ? (
                                        <input style={{ ...inputStyle, fontWeight: '700' }} type="number" min={0} value={editForm!.total_hours} onChange={e => setEditForm({ ...editForm!, total_hours: Number(e.target.value) })} />
                                    ) : (
                                        <div style={{ padding: '8px 11px', background: '#f0fdf4', borderRadius: '8px', fontSize: '14px', fontWeight: '700', color: '#15803d', border: '1px solid #bbf7d0' }}>
                                            {displayForm.total_hours} год
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={labelStyle}>Кредитів ЄКТС</label>
                                    {isEditing ? (
                                        <input style={inputStyle} type="number" min={0} value={editForm!.credits} onChange={e => setEditForm({ ...editForm!, credits: Number(e.target.value) })} />
                                    ) : (
                                        <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>{displayForm.credits}</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div style={{ height: '1px', background: '#f3f4f6', margin: '16px 0' }} />

                        {/* Groups / Students */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '14px' }}>
                            {([
                                ['student_count', 'Курсантів'],
                                ['group_count', 'Груп'],
                                ['lecture_streams', 'Потоків'],
                                ['subgroup_count', 'Підгруп'],
                            ] as [keyof FormData, string][]).map(([field, label]) => (
                                <div key={field}>
                                    <label style={labelStyle}>{label}</label>
                                    {isEditing ? (
                                        <input style={inputStyle} type="number" min={0}
                                            value={editForm![field] as number}
                                            onChange={e => setEditForm({ ...editForm!, [field]: Number(e.target.value) })} />
                                    ) : (
                                        <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', fontWeight: '600', color: '#111827', border: '1px solid #e5e7eb' }}>
                                            {displayForm[field] as number}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Specialty codes */}
                        <div>
                            <label style={labelStyle}>Коди спеціальностей</label>
                            {isEditing ? (
                                <input style={inputStyle} value={editForm!.specialty_codes || ''}
                                    onChange={e => setEditForm({ ...editForm!, specialty_codes: e.target.value })}
                                    placeholder="122,126" />
                            ) : (
                                <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: displayForm.specialty_codes ? '#374151' : '#9ca3af', border: '1px solid #e5e7eb' }}>
                                    {displayForm.specialty_codes || '—'}
                                </div>
                            )}
                        </div>

                        <div style={{ height: '1px', background: '#f3f4f6', margin: '16px 0' }} />

                        {/* Thesis toggle */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: displayForm.is_thesis ? '#f8fafc' : '#fafafa', borderRadius: '10px', border: `1px solid ${displayForm.is_thesis ? '#cbd5e1' : '#e5e7eb'}` }}>
                            <div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>Атестаційна робота</div>
                                <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                    {displayForm.is_thesis
                                        ? 'Керівники призначаються через «Наукові роботи»'
                                        : 'Розподіл викладачів через слоти на сторінці «Розподіл»'}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    const newVal = !displayForm.is_thesis
                                    if (isEditing) {
                                        setEditForm(f => f ? { ...f, is_thesis: newVal } : f)
                                    } else {
                                        updateDiscipline(selectedDiscId!, { is_thesis: newVal })
                                            .then(() => queryClient.invalidateQueries({ queryKey: ['disciplines', selectedDept] }))
                                    }
                                }}
                                style={{
                                    width: '44px', height: '24px', borderRadius: '12px', border: 'none',
                                    background: displayForm.is_thesis ? '#6b7280' : '#e5e7eb',
                                    cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
                                }}
                            >
                                <span style={{
                                    position: 'absolute', top: '3px',
                                    left: displayForm.is_thesis ? '23px' : '3px',
                                    width: '18px', height: '18px', borderRadius: '50%',
                                    background: '#fff', transition: 'left 0.2s',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                                }} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
