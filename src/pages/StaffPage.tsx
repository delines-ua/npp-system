import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaff, createStaff, updateStaff, deleteStaff } from '../services/staff'
import { getDepartments } from '../services/departments'
import { getDisciplines } from '../services/disciplines'
import { getAssignmentsByStaff, getAssignmentsByStaffIds } from '../services/workloadAssignments'
import { getScientificWorksByStaff } from '../services/scientificWorks'
import { getTeachingLoadLimit, getWorkloadCeiling } from '../utils/workload'
import { useSettings } from '../contexts/SettingsContext'
import { WORKLOAD_TYPE_META, SCIENTIFIC_WORK_TYPES } from '../utils/lawNorms'
import type { Staff } from '../types/database'
import { Users, Plus, Trash2, X, Save, Shield, User, Edit2, BookOpen, ChevronUp, Gauge, Search, GraduationCap } from 'lucide-react'
import Select from '../components/Select'

const POSITIONS = [
    'Начальник кафедри', 'Заступник начальника кафедри',
    'Професор', 'Доцент', 'Старший викладач', 'Викладач', 'Асистент',
]
const RATES = [0.2, 0.25, 0.5, 0.75, 1.0, 1.5]
const THRESHOLD = 600

const card: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.08)',
}

const inputStyle: React.CSSProperties = {
    padding: '8px 12px', background: '#f9fafb', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '13px', color: '#111827', outline: 'none', width: '100%',
    boxSizing: 'border-box',
}

const lbl: React.CSSProperties = {
    display: 'block', fontSize: '11px', color: '#6b7280', marginBottom: '4px', fontWeight: '500',
}

type FormData = Omit<Staff, 'id' | 'created_at'>

const emptyForm = (): FormData => ({
    department_id: '', full_name: '', position: 'Викладач',
    is_military: true, service_years: 0, rate: 1.0,
})

export default function StaffPage() {
    const queryClient = useQueryClient()
    const { settings } = useSettings()
    const [selectedDept, setSelectedDept] = useState('')
    const [search, setSearch] = useState('')
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [editForm, setEditForm] = useState<FormData | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [addForm, setAddForm] = useState<FormData>(emptyForm())

    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
    useEffect(() => {
        if (!selectedDept && departments?.length) {
            const d = departments.find(d => d.number === '22')
            if (d) setSelectedDept(d.id)
        }
    }, [departments])

    const { data: staff = [], isLoading } = useQuery({
        queryKey: ['staff', selectedDept],
        queryFn: () => getStaff(selectedDept || undefined),
    })

    const { data: staffAssignments = [] } = useQuery({
        queryKey: ['staff-assignments', selectedStaffId],
        queryFn: () => getAssignmentsByStaff(selectedStaffId!),
        enabled: !!selectedStaffId,
    })

    const { data: staffWorks = [] } = useQuery({
        queryKey: ['staff-scientific-works', selectedStaffId],
        queryFn: () => getScientificWorksByStaff(selectedStaffId!, '2025-2026'),
        enabled: !!selectedStaffId,
    })

    const { data: allDisciplines = [] } = useQuery({
        queryKey: ['disciplines-all'],
        queryFn: () => getDisciplines(),
    })

    const staffIds = useMemo(() => staff.map(s => s.id), [staff])

    const { data: deptAssignments = [] } = useQuery({
        queryKey: ['dept-assignments', staffIds],
        queryFn: () => getAssignmentsByStaffIds(staffIds),
        enabled: staffIds.length > 0,
    })

    // Фонд навчального навантаження кафедри: сума лімітів усіх НПП
    // (частка навч. роботи за посадою × службовий час за категорією × ставка)
    const fund = useMemo(() => {
        const available = staff.reduce((sum, s) => sum + getTeachingLoadLimit(s, settings), 0)
        const allocated = Math.round(deptAssignments.reduce((sum, a) => sum + a.hours, 0) * 100) / 100
        const remaining = Math.round((available - allocated) * 100) / 100
        const usedPct = available > 0 ? Math.min(Math.round((allocated / available) * 100), 100) : 0
        return { available, allocated, remaining, usedPct, overloaded: allocated > available }
    }, [staff, deptAssignments, settings])

    const invStaff = () => queryClient.invalidateQueries({ queryKey: ['staff', selectedDept] })

    const createMutation = useMutation({
        mutationFn: () => createStaff(addForm),
        onSuccess: () => { invStaff(); setAddForm(emptyForm()); setShowAddForm(false) },
    })

    const updateMutation = useMutation({
        mutationFn: () => updateStaff(selectedStaffId!, editForm!),
        onSuccess: () => { invStaff(); setIsEditing(false) },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteStaff,
        onSuccess: () => { invStaff(); setSelectedStaffId(null); setIsEditing(false) },
    })

    const filteredStaff = useMemo(() => {
        const q = search.trim().toLowerCase()
        if (!q) return staff
        return staff.filter(s =>
            s.full_name.toLowerCase().includes(q) || s.position.toLowerCase().includes(q)
        )
    }, [staff, search])

    const selectedStaff = staff.find(s => s.id === selectedStaffId) ?? null

    const handleStaffClick = (s: Staff) => {
        setSelectedStaffId(s.id)
        setIsEditing(false)
        setEditForm({ ...s })
    }

    // Групуємо призначення по дисциплінах
    const disciplineGroups = useMemo(() => {
        const map: Record<string, { name: string; semester: number; totalHours: number; types: { label: string; color: string; hours: number }[] }> = {}
        for (const a of staffAssignments) {
            if (!map[a.discipline_id]) {
                const disc = allDisciplines.find(d => d.id === a.discipline_id)
                map[a.discipline_id] = { name: disc?.name ?? '—', semester: disc?.semester ?? 0, totalHours: 0, types: [] }
            }
            const meta = WORKLOAD_TYPE_META[a.workload_type as keyof typeof WORKLOAD_TYPE_META]
            map[a.discipline_id].totalHours = Math.round((map[a.discipline_id].totalHours + a.hours) * 100) / 100
            map[a.discipline_id].types.push({ label: meta?.label ?? a.workload_type, color: meta?.color ?? '#9ca3af', hours: Math.round(a.hours * 100) / 100 })
        }
        return Object.values(map).sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name))
    }, [staffAssignments, allDisciplines])

    // Навчальне навантаження (workload_assignments) та наукове керівництво (scientific_works)
    const teachingHours = useMemo(() => Math.round(staffAssignments.reduce((s, a) => s + a.hours, 0) * 100) / 100, [staffAssignments])
    const scientificHours = useMemo(() => Math.round(staffWorks.reduce((s, w) => s + w.hours, 0) * 100) / 100, [staffWorks])
    const totalHours = Math.round((teachingHours + scientificHours) * 100) / 100
    // Стеля навантаження: ручний ліміт (460/550) у режимі override, інакше річний службовий час (1840 і т.д.)
    const staffLimit = selectedStaff ? getWorkloadCeiling(selectedStaff, settings) : THRESHOLD
    const isOver = totalHours > staffLimit
    const pct = Math.min(Math.round((totalHours / staffLimit) * 100), 100)

    const dept = (id: string) => departments?.find(d => d.id === id)

    const deptOptions = [
        { value: '', label: 'Всі кафедри' },
        ...(departments?.map(d => ({ value: d.id, label: `Каф. №${d.number} — ${d.name}` })) ?? []),
    ]
    const deptFormOptions = departments?.map(d => ({ value: d.id, label: `№${d.number} ${d.name}` })) ?? []
    const posOptions = POSITIONS.map(p => ({ value: p, label: p }))
    const rateOptions = RATES.map(r => ({ value: String(r), label: `${r} ст.` }))
    const milOptions = [
        { value: 'true', label: 'Військовослужбовець' },
        { value: 'false', label: 'Цивільний' },
    ]

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>НПП</h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>Науково-педагогічні працівники</p>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <Search size={15} style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Пошук за ПІБ або посадою..."
                            style={{ ...inputStyle, width: '240px', paddingLeft: '34px', paddingRight: search ? '30px' : '12px' }}
                        />
                        {search && (
                            <button onClick={() => setSearch('')}
                                style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '2px', display: 'flex' }}>
                                <X size={14} />
                            </button>
                        )}
                    </div>
                    <Select value={selectedDept} onChange={v => { setSelectedDept(v); setSelectedStaffId(null) }} options={deptOptions} style={{ minWidth: '220px' }} />
                    <button onClick={() => { setShowAddForm(v => !v); setSelectedStaffId(null) }}
                        style={{ padding: '9px 16px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {showAddForm ? <ChevronUp size={15} /> : <Plus size={15} />} Додати НПП
                    </button>
                </div>
            </div>

            {/* Add form */}
            {showAddForm && (
                <div style={{ ...card, padding: '20px', marginBottom: '18px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '14px' }}>Новий НПП</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={lbl}>ПІБ</label>
                            <input style={inputStyle} value={addForm.full_name} onChange={e => setAddForm({ ...addForm, full_name: e.target.value })} placeholder="Прізвище Ім'я По батькові" />
                        </div>
                        <div>
                            <label style={lbl}>Кафедра</label>
                            <Select value={addForm.department_id} onChange={v => setAddForm({ ...addForm, department_id: v })} placeholder="Оберіть" options={deptFormOptions} />
                        </div>
                        <div>
                            <label style={lbl}>Посада</label>
                            <Select value={addForm.position} onChange={v => setAddForm({ ...addForm, position: v })} options={posOptions} />
                        </div>
                        <div>
                            <label style={lbl}>Ставка</label>
                            <Select value={String(addForm.rate)} onChange={v => setAddForm({ ...addForm, rate: Number(v) })} options={rateOptions} />
                        </div>
                        <div>
                            <label style={lbl}>Тип</label>
                            <Select value={addForm.is_military ? 'true' : 'false'} onChange={v => setAddForm({ ...addForm, is_military: v === 'true' })} options={milOptions} />
                        </div>
                        <div>
                            <label style={lbl}>Вислуга (р.)</label>
                            <input style={inputStyle} type="number" min={0} value={addForm.service_years} onChange={e => setAddForm({ ...addForm, service_years: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button onClick={() => createMutation.mutate()} disabled={!addForm.full_name || !addForm.department_id || createMutation.isPending}
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

            {/* Department workload fund summary */}
            {!isLoading && staff.length > 0 && (
                <div style={{ ...card, padding: '10px 16px', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', whiteSpace: 'nowrap' }}>
                        <Gauge size={15} color="#9ca3af" />
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280' }}>
                            Фонд навантаження{selectedDept ? '' : ' (усі)'} · {staff.length} НПП
                        </span>
                        {settings.mode === 'override' && (
                            <span title={`Ручний ліміт: ${settings.overrideCivilian} цив. / ${settings.overrideMilitary} військ. год на ставку`}
                                style={{ fontSize: '10px', fontWeight: 700, color: '#b45309', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '6px', padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                ручний режим
                            </span>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '14px', fontSize: '13px', whiteSpace: 'nowrap' }}>
                        <span style={{ color: '#6b7280' }}>Фонд <b style={{ color: '#111827', fontWeight: 700 }}>{fund.available}</b></span>
                        <span style={{ color: '#6b7280' }}>Розподілено <b style={{ color: '#3b82f6', fontWeight: 700 }}>{fund.allocated}</b></span>
                        <span style={{ color: '#6b7280' }}>
                            {fund.overloaded ? 'Перевищення ' : 'Залишок '}
                            <b style={{ color: fund.overloaded ? '#dc2626' : '#22c55e', fontWeight: 700 }}>
                                {fund.overloaded ? `+${Math.abs(fund.remaining)}` : fund.remaining}
                            </b>
                        </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: '160px' }}>
                        <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{
                                height: '6px', width: `${fund.usedPct}%`,
                                background: fund.overloaded ? '#ef4444' : '#3b82f6',
                                borderRadius: '3px', transition: 'width 0.3s ease',
                            }} />
                        </div>
                        <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', whiteSpace: 'nowrap' }}>{fund.usedPct}%</span>
                    </div>
                </div>
            )}

            {/* Two-panel layout */}
            <div style={{ display: 'grid', gridTemplateColumns: selectedStaffId ? '300px 1fr' : '1fr', gap: '16px', alignItems: 'start' }}>

                {/* Staff list */}
                <div style={{ ...card, overflow: 'hidden', position: 'sticky', top: '72px' }}>
                    <div style={{ maxHeight: 'calc(100vh - 240px)', overflowY: 'auto' }}>
                        {isLoading && <div style={{ padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>Завантаження...</div>}
                        {!isLoading && filteredStaff.length === 0 && (
                            <div style={{ padding: '48px', textAlign: 'center' }}>
                                <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.12, color: '#9ca3af' }} />
                                <div style={{ fontSize: '14px', color: '#9ca3af' }}>
                                    {search.trim() ? `За запитом «${search.trim()}» нічого не знайдено` : 'НПП не знайдено'}
                                </div>
                            </div>
                        )}
                        {filteredStaff.map(s => {
                            const isSelected = s.id === selectedStaffId
                            const d = dept(s.department_id)
                            return (
                                <div key={s.id} onClick={() => handleStaffClick(s)}
                                    style={{
                                        padding: '12px 14px', cursor: 'pointer', borderBottom: '1px solid #f9fafb',
                                        background: isSelected ? '#fff7ed' : 'transparent',
                                        borderLeft: `3px solid ${isSelected ? '#f97316' : 'transparent'}`,
                                        display: 'flex', alignItems: 'center', gap: '10px',
                                    }}>
                                    <div style={{
                                        width: '36px', height: '36px', flexShrink: 0,
                                        background: s.is_military ? '#eff6ff' : '#f9fafb',
                                        border: `1px solid ${s.is_military ? '#bfdbfe' : '#e5e7eb'}`,
                                        borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {s.is_military ? <Shield size={16} color="#3b82f6" /> : <User size={16} color="#9ca3af" />}
                                    </div>
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                            {s.full_name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '1px' }}>
                                            {s.position} · {d ? `Каф.№${d.number}` : '—'} · {s.rate} ст.
                                        </div>
                                    </div>
                                    <button onClick={e => { e.stopPropagation(); if (confirm(`Видалити "${s.full_name}"?`)) deleteMutation.mutate(s.id) }}
                                        style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '2px', flexShrink: 0 }}>
                                        <Trash2 size={13} />
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Detail panel */}
                {selectedStaff && editForm && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                        {/* Info card */}
                        <div style={{ ...card, padding: '20px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                                    <div style={{
                                        width: '48px', height: '48px', flexShrink: 0,
                                        background: selectedStaff.is_military ? '#eff6ff' : '#f9fafb',
                                        border: `1px solid ${selectedStaff.is_military ? '#bfdbfe' : '#e5e7eb'}`,
                                        borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    }}>
                                        {selectedStaff.is_military ? <Shield size={22} color="#3b82f6" /> : <User size={22} color="#9ca3af" />}
                                    </div>
                                    <div style={{ minWidth: 0 }}>
                                        {isEditing ? (
                                            <input style={{ ...inputStyle, fontSize: '15px', fontWeight: '600' }}
                                                value={editForm.full_name}
                                                onChange={e => setEditForm({ ...editForm, full_name: e.target.value })} />
                                        ) : (
                                            <div style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>{selectedStaff.full_name}</div>
                                        )}
                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                            {selectedStaff.is_military ? 'Військовослужбовець' : 'Цивільний'} · вислуга {selectedStaff.service_years} р.
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexShrink: 0, marginLeft: '12px' }}>
                                    {!isEditing ? (
                                        <button onClick={() => setIsEditing(true)}
                                            style={{ padding: '7px 14px', background: '#eff6ff', color: '#3b82f6', border: '1px solid #bfdbfe', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                            <Edit2 size={13} /> Редагувати
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}
                                                style={{ padding: '7px 14px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <Save size={13} /> {updateMutation.isPending ? 'Збереження...' : 'Зберегти'}
                                            </button>
                                            <button onClick={() => { setIsEditing(false); setEditForm({ ...selectedStaff }) }}
                                                style={{ padding: '7px 12px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                                                <X size={13} /> Скасувати
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>

                            {/* Fields */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                                <div>
                                    <label style={lbl}>Кафедра</label>
                                    {isEditing ? (
                                        <Select value={editForm.department_id} onChange={v => setEditForm({ ...editForm, department_id: v })} options={deptFormOptions} />
                                    ) : (
                                        <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>
                                            {dept(selectedStaff.department_id) ? `№${dept(selectedStaff.department_id)!.number} ${dept(selectedStaff.department_id)!.name}` : '—'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={lbl}>Посада</label>
                                    {isEditing ? (
                                        <Select value={editForm.position} onChange={v => setEditForm({ ...editForm, position: v })} options={posOptions} />
                                    ) : (
                                        <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>{selectedStaff.position}</div>
                                    )}
                                </div>
                                <div>
                                    <label style={lbl}>Ставка</label>
                                    {isEditing ? (
                                        <Select value={String(editForm.rate)} onChange={v => setEditForm({ ...editForm, rate: Number(v) })} options={rateOptions} />
                                    ) : (
                                        <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>{selectedStaff.rate} ст.</div>
                                    )}
                                </div>
                                <div>
                                    <label style={lbl}>Тип</label>
                                    {isEditing ? (
                                        <Select value={editForm.is_military ? 'true' : 'false'} onChange={v => setEditForm({ ...editForm, is_military: v === 'true' })} options={milOptions} />
                                    ) : (
                                        <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>
                                            {selectedStaff.is_military ? 'Військовослужбовець' : 'Цивільний'}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={lbl}>Вислуга (р.)</label>
                                    {isEditing ? (
                                        <input style={inputStyle} type="number" min={0} value={editForm.service_years} onChange={e => setEditForm({ ...editForm, service_years: Number(e.target.value) })} />
                                    ) : (
                                        <div style={{ padding: '8px 11px', background: '#f9fafb', borderRadius: '8px', fontSize: '13px', color: '#374151', border: '1px solid #e5e7eb' }}>{selectedStaff.service_years} р.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Workload card */}
                        <div style={{ ...card, padding: '18px 20px' }}>
                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '12px' }}>
                                Навантаження 2025-2026 · загальне
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                <div style={{ flex: 1, height: '8px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{
                                        height: '8px', width: `${pct}%`,
                                        background: isOver ? '#ef4444' : '#22c55e',
                                        borderRadius: '4px', transition: 'width 0.3s ease',
                                    }} />
                                </div>
                                <div style={{ fontSize: '15px', fontWeight: '700', color: isOver ? '#dc2626' : '#111827', whiteSpace: 'nowrap' }}>
                                    {totalHours} / {staffLimit} год
                                    {isOver && (
                                        <span style={{ marginLeft: '8px', fontSize: '11px', background: '#fef2f2', color: '#dc2626', padding: '2px 7px', borderRadius: '4px', border: '1px solid #fecaca' }}>
                                            +{Math.round((totalHours - staffLimit) * 100) / 100}!
                                        </span>
                                    )}
                                </div>
                            </div>
                            {/* Breakdown: навчальна + наукова */}
                            <div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '12px', color: '#6b7280' }}>
                                <span>Навчальна <b style={{ color: '#3b82f6', fontWeight: 700 }}>{teachingHours}</b> год</span>
                                <span>Наукова <b style={{ color: '#8b5cf6', fontWeight: 700 }}>{scientificHours}</b> год</span>
                            </div>
                        </div>

                        {/* Scientific supervision card */}
                        {staffWorks.length > 0 && (
                            <div style={{ ...card, overflow: 'hidden' }}>
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <GraduationCap size={14} color="#9ca3af" />
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        Наукове керівництво
                                    </span>
                                </div>
                                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    {staffWorks.map(w => {
                                        const meta = SCIENTIFIC_WORK_TYPES[w.work_type]
                                        return (
                                            <div key={w.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                                                <span style={{ fontSize: '13px', fontWeight: '600', color: meta?.color ?? '#374151' }}>{meta?.label ?? w.work_type}</span>
                                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>{w.student_count} ос. × {meta?.hours}г = <b style={{ color: '#374151' }}>{w.hours}г</b></span>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Disciplines card */}
                        <div style={{ ...card, overflow: 'hidden' }}>
                            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BookOpen size={14} color="#9ca3af" />
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Дисципліни ({disciplineGroups.length})
                                </span>
                            </div>
                            {disciplineGroups.length === 0 ? (
                                <div style={{ padding: '32px', textAlign: 'center', fontSize: '13px', color: '#9ca3af' }}>
                                    Призначень немає
                                </div>
                            ) : (
                                <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    {disciplineGroups.map((g, i) => (
                                        <div key={i} style={{ padding: '10px 12px', background: '#f9fafb', borderRadius: '10px', border: '1px solid #f3f4f6' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', flex: 1, marginRight: '8px' }}>{g.name}</div>
                                                <div style={{ fontSize: '12px', fontWeight: '700', color: '#374151', whiteSpace: 'nowrap' }}>{g.totalHours} год</div>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                                                {g.types.map((t, j) => (
                                                    <span key={j} style={{
                                                        fontSize: '11px', padding: '2px 8px', borderRadius: '10px', fontWeight: '500',
                                                        background: t.color + '18', color: t.color, border: `1px solid ${t.color}30`,
                                                    }}>
                                                        {t.label} · {t.hours}г
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
