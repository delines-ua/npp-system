import { useState, useMemo, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getDisciplines } from '../services/disciplines'
import {
    getDetailedAssignments,
    assignSlot,
    clearSlot,
    deleteDetailedAssignment,
} from '../services/workloadAssignments'
import {
    getInstituteGroups,
    getDisciplineGroups,
    addDisciplineGroup,
    removeDisciplineGroup,
    autoLinkGroupsBySpecialty,
} from '../services/instituteGroups'
import {
    getApplicableSlots,
    getDisciplineStatus,
} from '../utils/workload'
import type { Discipline, Staff, WorkloadTypeKey } from '../types/database'
import { Layers, Search, UserCheck, Users, Plus, X, ChevronDown, ExternalLink } from 'lucide-react'
import Select from '../components/Select'
import { useSettings } from '../contexts/SettingsContext'

const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.08)',
}


const WORKLOAD_TYPE_COLOR: Record<string, string> = {
    lecture: '#3b82f6',
    group: '#22c55e',
    practical: '#8b5cf6',
    course_work: '#f97316',
    control_work: '#64748b',
    exam: '#ef4444',
    credit: '#f59e0b',
}

export default function WorkloadDistributionPage() {
    const queryClient = useQueryClient()
    const { academicYear: ACADEMIC_YEAR } = useSettings()
    const [selectedDept, setSelectedDept] = useState('')
    const [selectedDiscId, setSelectedDiscId] = useState<string | null>(null)
    const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null)
    const [discFilter, setDiscFilter] = useState('')
    const [filterSem, setFilterSem] = useState<'' | '1' | '2'>('')
    const [groupSearch, setGroupSearch] = useState('')
    const [showAddGroup, setShowAddGroup] = useState(false)
    const [staffPickerOpen, setStaffPickerOpen] = useState(false)
    const [checkedStaffIds, setCheckedStaffIds] = useState<Set<string>>(new Set())
    const [activeStaffIds, setActiveStaffIds] = useState<string[]>([])
    const [staffSearch, setStaffSearch] = useState('')
    const staffPickerRef = useRef<HTMLDivElement>(null)

    // ── Queries ───────────────────────────────────────────────────────────────
    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    })
    useEffect(() => {
        if (!selectedDept && departments?.length) {
            const d = departments.find(d => d.number === '22')
            if (d) setSelectedDept(d.id)
        }
    }, [departments])
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (staffPickerRef.current && !staffPickerRef.current.contains(e.target as Node)) {
                setStaffPickerOpen(false)
            }
        }
        document.addEventListener('mousedown', handler)
        return () => document.removeEventListener('mousedown', handler)
    }, [])
    const { data: staff = [] } = useQuery({
        queryKey: ['staff', selectedDept],
        queryFn: () => getStaff(selectedDept || undefined),
        enabled: !!selectedDept,
    })
    const { data: disciplines = [] } = useQuery({
        queryKey: ['disciplines', selectedDept, ACADEMIC_YEAR],
        queryFn: () => getDisciplines(selectedDept || undefined, ACADEMIC_YEAR),
        enabled: !!selectedDept,
    })

    const discIds = useMemo(() => disciplines.map(d => d.id), [disciplines])

    const { data: assignments = [] } = useQuery({
        queryKey: ['detailed-assignments', selectedDept, ACADEMIC_YEAR, discIds.join(',')],
        queryFn: () => getDetailedAssignments(discIds),
        enabled: !!selectedDept && discIds.length > 0,
    })

    const { data: allGroups = [] } = useQuery({
        queryKey: ['institute-groups'],
        queryFn: getInstituteGroups,
    })

    const { data: disciplineGroups = [] } = useQuery({
        queryKey: ['discipline-groups', selectedDiscId],
        queryFn: () => getDisciplineGroups(selectedDiscId!),
        enabled: !!selectedDiscId,
    })

    // ── Mutations ─────────────────────────────────────────────────────────────
    const invalidateAssignments = () =>
        queryClient.invalidateQueries({ queryKey: ['detailed-assignments', selectedDept] })

    const invalidateDiscGroups = () =>
        queryClient.invalidateQueries({ queryKey: ['discipline-groups', selectedDiscId] })

    const assignMutation = useMutation({
        mutationFn: ({
            discId, staffId, type, groupNumber, hours, studentCount,
        }: { discId: string; staffId: string; type: WorkloadTypeKey; groupNumber: number; hours: number; studentCount: number }) =>
            assignSlot(discId, staffId, type, groupNumber, hours, studentCount, ACADEMIC_YEAR),
        onSuccess: invalidateAssignments,
    })

    const clearMutation = useMutation({
        mutationFn: ({
            discId, type, groupNumber,
        }: { discId: string; type: WorkloadTypeKey; groupNumber: number }) =>
            clearSlot(discId, type, groupNumber),
        onSuccess: invalidateAssignments,
    })

    // Призначити обраного викладача на ВСІ слоти дисципліни (крім тих, що вже його)
    const assignAllMutation = useMutation({
        mutationFn: async () => {
            if (!selectedStaffId || !selectedDisc) return
            for (const slot of slots) {
                const existing = getSlotAssignment(slot.type, slot.groupNumber)
                if (existing?.staff_id === selectedStaffId) continue
                await assignSlot(
                    selectedDisc.id, selectedStaffId, slot.type, slot.groupNumber,
                    slot.hours, slot.studentCount, ACADEMIC_YEAR,
                )
            }
        },
        onSuccess: invalidateAssignments,
    })

    const deleteMutation = useMutation({
        mutationFn: deleteDetailedAssignment,
        onSuccess: invalidateAssignments,
    })

    const addGroupMutation = useMutation({
        mutationFn: ({ groupId, studentCount }: { groupId: string; studentCount: number }) => {
            const nextOrder = disciplineGroups.length + 1
            return addDisciplineGroup(selectedDiscId!, groupId, studentCount, nextOrder, ACADEMIC_YEAR)
        },
        onSuccess: () => {
            invalidateDiscGroups()
            queryClient.invalidateQueries({ queryKey: ['disciplines', selectedDept] })
            setGroupSearch('')
            setShowAddGroup(false)
        },
    })

    const removeGroupMutation = useMutation({
        mutationFn: ({ id, disciplineId }: { id: string; disciplineId: string }) =>
            removeDisciplineGroup(id, disciplineId),
        onSuccess: () => {
            invalidateDiscGroups()
            queryClient.invalidateQueries({ queryKey: ['disciplines', selectedDept] })
        },
    })

    const autoLinkMutation = useMutation({
        mutationFn: () => {
            const codes = selectedDisc?.specialty_codes ?? ''
            return autoLinkGroupsBySpecialty(selectedDiscId!, codes, selectedDisc?.semester ?? 0, ACADEMIC_YEAR)
        },
        onSuccess: (count) => {
            invalidateDiscGroups()
            queryClient.invalidateQueries({ queryKey: ['disciplines', selectedDept] })
            if (count === 0) alert('Групи не знайдено. Перевір що specialty_code заповнені у таблиці institute_groups.')
        },
    })

    // ── Derived data ──────────────────────────────────────────────────────────
    const staffHoursMap = useMemo(() => {
        const map: Record<string, number> = {}
        for (const a of assignments) {
            map[a.staff_id] = Math.round(((map[a.staff_id] || 0) + a.hours) * 100) / 100
        }
        return map
    }, [assignments])

    const selectedDisc: Discipline | null = disciplines.find(d => d.id === selectedDiscId) ?? null
    const selectedStaff: Staff | null = staff.find(s => s.id === selectedStaffId) ?? null
    const activeStaff = staff.filter(s => activeStaffIds.includes(s.id))
    const filteredStaffForPicker = staff.filter(s =>
        !staffSearch || s.full_name.toLowerCase().includes(staffSearch.toLowerCase())
    )

    const filteredDiscs = disciplines.filter(d => {
        if (filterSem === '1' && d.semester % 2 === 0) return false
        if (filterSem === '2' && d.semester % 2 === 1) return false
        return !discFilter || d.name.toLowerCase().includes(discFilter.toLowerCase())
    })

    const statusCounts = useMemo(() => {
        let none = 0, partial = 0, full = 0, thesis = 0
        for (const d of disciplines) {
            if (d.is_thesis) { thesis++; continue }
            const s = getDisciplineStatus(d, assignments)
            if (s === 'none') none++
            else if (s === 'partial') partial++
            else full++
        }
        return { none, partial, full, thesis }
    }, [disciplines, assignments])

    const getSlotAssignment = (type: WorkloadTypeKey, groupNumber: number) =>
        assignments.find(
            a => a.discipline_id === selectedDiscId &&
                a.workload_type === type &&
                a.group_number === groupNumber
        )

    const handleDeptChange = (deptId: string) => {
        setSelectedDept(deptId)
        setSelectedDiscId(null)
        setSelectedStaffId(null)
    }

    const handleDiscClick = (discId: string) => {
        setSelectedDiscId(discId)
        setSelectedStaffId(null)
        setShowAddGroup(false)
        // Викладачі вже призначені на слоти цієї дисципліни
        const assignedStaffIds = [...new Set(
            assignments.filter(a => a.discipline_id === discId).map(a => a.staff_id)
        )]
        // Якщо дисципліна ще без призначень — скидаємо вибір (не тягнемо з попередньої),
        // інакше показуємо її поточних викладачів
        setActiveStaffIds(assignedStaffIds)
        setCheckedStaffIds(new Set(assignedStaffIds))
    }

    const handleSlotAction = (disc: Discipline, type: WorkloadTypeKey, groupNumber: number, hours: number, studentCount: number) => {
        if (!selectedStaffId) return
        const existing = getSlotAssignment(type, groupNumber)
        if (existing?.staff_id === selectedStaffId) {
            clearMutation.mutate({ discId: disc.id, type, groupNumber })
        } else {
            assignMutation.mutate({ discId: disc.id, staffId: selectedStaffId, type, groupNumber, hours, studentCount })
        }
    }

    // Групи що вже прив'язані до дисципліни
    const linkedGroupIds = new Set(disciplineGroups.map(dg => dg.group_id))

    // Фільтрована пошуком + не прив'язана ще група
    const filteredAvailableGroups = allGroups.filter(g =>
        !linkedGroupIds.has(g.id) &&
        (!groupSearch || g.group_name.includes(groupSearch) || `${g.faculty} факультет`.includes(groupSearch))
    )

    // Слоти для обраної дисципліни
    const slots = selectedDisc ? getApplicableSlots(selectedDisc, disciplineGroups.length > 0 ? disciplineGroups : undefined) : []

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                        Детальний розподіл навантаження
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Призначення викладачів по типах занять та групах · {ACADEMIC_YEAR}
                    </p>
                </div>
                <Select
                    value={selectedDept}
                    onChange={handleDeptChange}
                    placeholder="Оберіть кафедру"
                    style={{ minWidth: '280px' }}
                    options={[
                        ...(departments?.map(d => ({ value: d.id, label: `Кафедра № ${d.number} — ${d.name}` })) ?? []),
                    ]}
                />
            </div>

            {!selectedDept && (
                <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
                    <Layers size={56} style={{ margin: '0 auto 16px', opacity: 0.15, color: '#9ca3af' }} />
                    <div style={{ fontSize: '16px', color: '#9ca3af' }}>Оберіть кафедру</div>
                    <div style={{ fontSize: '13px', color: '#d1d5db', marginTop: '4px' }}>
                        для детального розподілу навантаження між НПП
                    </div>
                </div>
            )}

            {selectedDept && (
                <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '16px', alignItems: 'start' }}>

                    {/* ── LEFT: Discipline list ─────────────────────────────── */}
                    <div style={{ ...card, overflow: 'hidden', position: 'sticky', top: '72px' }}>
                        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f3f4f6' }}>
                            <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
                                {[
                                    { label: `${statusCounts.full} повністю`, dot: '🟢', color: '#16a34a' },
                                    { label: `${statusCounts.partial} частково`, dot: '🟡', color: '#d97706' },
                                    { label: `${statusCounts.none} не задіяно`, dot: '🔴', color: '#dc2626' },
                                    ...(statusCounts.thesis > 0 ? [{ label: `${statusCounts.thesis} атестація`, dot: '📋', color: '#6b7280' }] : []),
                                ].map(({ label, dot, color }) => (
                                    <span key={label} style={{ fontSize: '11px', color, fontWeight: '500' }}>
                                        {dot} {label}
                                    </span>
                                ))}
                            </div>
                            <div style={{ position: 'relative' }}>
                                <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                                <input
                                    value={discFilter}
                                    onChange={e => setDiscFilter(e.target.value)}
                                    placeholder="Пошук дисципліни..."
                                    style={{
                                        width: '100%', padding: '8px 12px 8px 30px', border: '1px solid #e5e7eb',
                                        borderRadius: '8px', fontSize: '13px', color: '#111827',
                                        background: '#f9fafb', outline: 'none', boxSizing: 'border-box',
                                    }}
                                />
                            </div>
                            <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '2px', gap: '2px' }}>
                                {(['', '1', '2'] as const).map(v => (
                                    <button key={v} onClick={() => setFilterSem(v)}
                                        style={{
                                            flex: 1, padding: '5px 0', border: 'none', borderRadius: '6px', cursor: 'pointer',
                                            fontSize: '12px', fontWeight: '500',
                                            background: filterSem === v ? '#fff' : 'transparent',
                                            color: filterSem === v ? '#111827' : '#6b7280',
                                            boxShadow: filterSem === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                                        }}>
                                        {v === '' ? 'Всі' : v === '1' ? 'І сем.' : 'ІІ сем.'}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{ maxHeight: 'calc(100vh - 320px)', overflowY: 'auto' }}>
                            {filteredDiscs.map(disc => {
                                const isSelected = disc.id === selectedDiscId

                                if (disc.is_thesis) {
                                    return (
                                        <div
                                            key={disc.id}
                                            onClick={() => handleDiscClick(disc.id)}
                                            style={{
                                                padding: '10px 16px', cursor: 'pointer',
                                                borderBottom: '1px solid #f9fafb',
                                                background: isSelected ? '#f8fafc' : 'transparent',
                                                borderLeft: `3px solid ${isSelected ? '#94a3b8' : 'transparent'}`,
                                                transition: 'all 0.15s',
                                                opacity: 0.85,
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                                                <span style={{ fontSize: '12px' }}>📋</span>
                                                <div style={{ fontSize: '13px', fontWeight: '500', color: '#4b5563', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {disc.name}
                                                </div>
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                {disc.education_level.replace(/^\d+_/, '')} · Сем.{disc.semester} · Наукові роботи
                                            </div>
                                        </div>
                                    )
                                }

                                const slots = getApplicableSlots(disc)
                                const discAssignments = assignments.filter(a => a.discipline_id === disc.id)
                                const filled = slots.filter(s =>
                                    discAssignments.some(a => a.workload_type === s.type && a.group_number === s.groupNumber)
                                ).length
                                const total = slots.length
                                const pct = total > 0 ? Math.round((filled / total) * 100) : 100
                                const barColor = pct === 100 ? '#22c55e' : pct > 50 ? '#eab308' : pct > 25 ? '#f97316' : '#ef4444'
                                return (
                                    <div
                                        key={disc.id}
                                        onClick={() => handleDiscClick(disc.id)}
                                        style={{
                                            padding: '10px 16px', cursor: 'pointer',
                                            borderBottom: '1px solid #f9fafb',
                                            background: isSelected ? '#fff7ed' : 'transparent',
                                            borderLeft: `3px solid ${isSelected ? '#f97316' : 'transparent'}`,
                                            transition: 'all 0.15s',
                                        }}
                                    >
                                        <div style={{ fontSize: '13px', fontWeight: '500', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                                            {disc.name}
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                                            {disc.education_level.replace(/^\d+_/, '')} · Сем.{disc.semester}
                                            {disc.group_count > 1 && ` · ${disc.group_count} гр.`}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <div style={{ flex: 1, height: '4px', background: '#e5e7eb', borderRadius: '2px', overflow: 'hidden' }}>
                                                <div style={{
                                                    height: '4px', width: pct === 0 ? '0%' : `${Math.max(pct, 4)}%`,
                                                    background: barColor,
                                                    borderRadius: '2px',
                                                    transition: 'width 0.3s ease',
                                                }} />
                                            </div>
                                            <span style={{ fontSize: '10px', color: pct === 100 ? '#16a34a' : pct > 50 ? '#ca8a04' : pct > 25 ? '#ea580c' : pct > 0 ? '#dc2626' : '#9ca3af', fontWeight: '600', whiteSpace: 'nowrap', minWidth: '32px', textAlign: 'right' }}>
                                                {pct}%
                                            </span>
                                        </div>
                                    </div>
                                )
                            })}
                            {filteredDiscs.length === 0 && (
                                <div style={{ padding: '32px', textAlign: 'center', color: '#d1d5db', fontSize: '13px' }}>
                                    Нічого не знайдено
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── RIGHT: Detail ────────────────────────────────────── */}
                    {!selectedDisc ? (
                        <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
                            <div style={{ fontSize: '15px', color: '#9ca3af' }}>
                                Оберіть дисципліну зі списку
                            </div>
                        </div>
                    ) : selectedDisc.is_thesis ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                            {/* Thesis info block */}
                            <div style={{ ...card, padding: '28px 32px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                    <span style={{ fontSize: '32px' }}>📋</span>
                                    <div>
                                        <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', margin: 0 }}>
                                            {selectedDisc.name}
                                        </h2>
                                        <div style={{ fontSize: '13px', color: '#9ca3af', marginTop: '3px' }}>
                                            {selectedDisc.education_level.replace(/^\d+_/, '')} · Семестр {selectedDisc.semester}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ padding: '14px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px', marginBottom: '16px' }}>
                                    <div style={{ fontSize: '13px', color: '#475569', lineHeight: '1.6' }}>
                                        Ця дисципліна є <strong>атестаційною роботою</strong>. Кожен курсант має власного дипломного керівника.
                                        Призначення керівників та облік годин виконується на окремій сторінці.
                                    </div>
                                </div>
                                <a
                                    href="/scientific-works"
                                    style={{
                                        display: 'inline-flex', alignItems: 'center', gap: '7px',
                                        padding: '10px 18px', background: '#f97316', color: '#fff',
                                        borderRadius: '8px', textDecoration: 'none', fontSize: '13px', fontWeight: '600',
                                    }}
                                >
                                    <ExternalLink size={14} />
                                    Перейти до Керівництва здобувачами
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Discipline info */}
                            <div style={{ ...card, padding: '20px' }}>
                                <h2 style={{ fontSize: '17px', fontWeight: '700', color: '#111827', marginBottom: '10px' }}>
                                    {selectedDisc.name}
                                </h2>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    <span style={{ fontSize: '12px', padding: '2px 8px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '4px', color: '#f97316', fontWeight: '500' }}>
                                        {selectedDisc.education_level.replace(/^\d+_/, '')}
                                    </span>
                                    {(() => {
                                        const computedStudents = disciplineGroups.length > 0
                                            ? disciplineGroups.reduce((s, dg) => s + dg.student_count, 0)
                                            : selectedDisc.student_count
                                        const groupCountDisplay = disciplineGroups.length > 0
                                            ? disciplineGroups.length
                                            : selectedDisc.group_count
                                        return [
                                            ['Семестр', selectedDisc.semester],
                                            ['Груп', groupCountDisplay],
                                            ['Потоків', selectedDisc.lecture_streams],
                                            ['Курсантів', `${computedStudents}${disciplineGroups.length > 0 ? ' ✓' : ''}`],
                                        ]
                                    })().map(([lbl, val]) => (
                                        <span key={lbl as string} style={{ fontSize: '12px', color: '#6b7280', padding: '2px 8px', background: '#f9fafb', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                            {lbl}: <strong style={{ color: '#374151' }}>{val}</strong>
                                        </span>
                                    ))}
                                </div>
                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                    {(
                                        [
                                            ['Лекції', selectedDisc.lecture_hours, '#3b82f6'],
                                            ['ГЗ', selectedDisc.group_hours, '#22c55e'],
                                            ['ПЗ', selectedDisc.subgroup_hours, '#8b5cf6'],
                                            ['Курсові', selectedDisc.course_works, '#f97316'],
                                            ['Іспити', selectedDisc.exams, '#ef4444'],
                                            ['Заліки', selectedDisc.credits, '#f59e0b'],
                                        ] as [string, number, string][]
                                    ).filter(([, v]) => v > 0).map(([lbl, val, color]) => (
                                        <div key={lbl} style={{ padding: '4px 10px', background: `${color}10`, borderRadius: '6px', border: `1px solid ${color}30`, fontSize: '12px', color }}>
                                            {lbl}: <strong>{val}</strong>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* ── Групи дисципліни ────────────────────────── */}
                            <div style={card}>
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <Users size={14} color="#9ca3af" />
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Групи дисципліни
                                        </span>
                                        {disciplineGroups.length > 0 && (
                                            <span style={{ fontSize: '11px', background: '#f0fdf4', color: '#16a34a', padding: '1px 6px', borderRadius: '10px', border: '1px solid #bbf7d0', fontWeight: '600' }}>
                                                {disciplineGroups.length} гр · {disciplineGroups.reduce((s, dg) => s + dg.student_count, 0)} ос.
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        {selectedDisc?.specialty_codes && (
                                            <button
                                                onClick={() => autoLinkMutation.mutate()}
                                                disabled={autoLinkMutation.isPending}
                                                title={`Авто-зв'язок по спец. ${selectedDisc.specialty_codes}`}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: '5px',
                                                    padding: '5px 12px', background: '#f0fdf4',
                                                    border: '1px solid #bbf7d0',
                                                    borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                                                    color: '#16a34a', fontWeight: '500',
                                                }}
                                            >
                                                ⚡ Авто ({selectedDisc.specialty_codes})
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setShowAddGroup(v => !v)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: '5px',
                                                padding: '5px 12px', background: showAddGroup ? '#f3f4f6' : '#eff6ff',
                                                border: `1px solid ${showAddGroup ? '#e5e7eb' : '#bfdbfe'}`,
                                                borderRadius: '6px', cursor: 'pointer', fontSize: '12px',
                                                color: showAddGroup ? '#6b7280' : '#3b82f6', fontWeight: '500',
                                            }}
                                        >
                                            {showAddGroup ? <X size={12} /> : <Plus size={12} />}
                                            {showAddGroup ? 'Закрити' : 'Вручну'}
                                        </button>
                                    </div>
                                </div>

                                {/* Current groups list */}
                                {disciplineGroups.length > 0 && (
                                    <div style={{ padding: '8px 20px' }}>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {disciplineGroups.map((dg, idx) => (
                                                <div key={dg.id} style={{
                                                    display: 'flex', alignItems: 'center', gap: '6px',
                                                    padding: '6px 10px', background: '#f0fdf4',
                                                    border: '1px solid #bbf7d0', borderRadius: '8px',
                                                }}>
                                                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#111827' }}>
                                                        {dg.group.group_name}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#6b7280' }}>
                                                        {dg.student_count} ос.
                                                    </span>
                                                    <span style={{ fontSize: '10px', color: '#9ca3af', background: '#e5e7eb', padding: '1px 4px', borderRadius: '3px' }}>
                                                        #{idx + 1}
                                                    </span>
                                                    <button
                                                        onClick={() => removeGroupMutation.mutate({ id: dg.id, disciplineId: selectedDiscId! })}
                                                        style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: '0', lineHeight: 1, fontSize: '14px' }}
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {disciplineGroups.length === 0 && !showAddGroup && (
                                    <div style={{ padding: '16px 20px', fontSize: '13px', color: '#d1d5db', textAlign: 'center' }}>
                                        Групи не призначено — натисніть «Додати групу»
                                    </div>
                                )}

                                {/* Add group panel */}
                                {showAddGroup && (
                                    <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', background: '#fafafa' }}>
                                        <div style={{ marginBottom: '8px' }}>
                                            <input
                                                value={groupSearch}
                                                onChange={e => setGroupSearch(e.target.value)}
                                                placeholder="Пошук групи (221, 341, ...)..."
                                                style={{
                                                    width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb',
                                                    borderRadius: '7px', fontSize: '13px', color: '#111827',
                                                    background: '#fff', outline: 'none', boxSizing: 'border-box',
                                                }}
                                            />
                                        </div>
                                        <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                            {filteredAvailableGroups.slice(0, 40).map(g => (
                                                <div
                                                    key={g.id}
                                                    style={{
                                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                        padding: '6px 10px', borderRadius: '6px', background: '#fff',
                                                        border: '1px solid #e5e7eb',
                                                    }}
                                                >
                                                    <div>
                                                        <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginRight: '8px' }}>
                                                            {g.group_name}
                                                        </span>
                                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>
                                                            {g.is_masters ? 'Магістри' : `${g.faculty} факультет, ${g.course} курс`} · {g.student_count} ос.
                                                        </span>
                                                    </div>
                                                    <button
                                                        onClick={() => addGroupMutation.mutate({ groupId: g.id, studentCount: g.student_count })}
                                                        disabled={addGroupMutation.isPending}
                                                        style={{
                                                            padding: '4px 10px', background: '#eff6ff', border: '1px solid #bfdbfe',
                                                            borderRadius: '5px', color: '#3b82f6', cursor: 'pointer',
                                                            fontSize: '12px', fontWeight: '500',
                                                        }}
                                                    >
                                                        <Plus size={12} style={{ display: 'inline', marginRight: '2px' }} />
                                                        Додати
                                                    </button>
                                                </div>
                                            ))}
                                            {filteredAvailableGroups.length === 0 && (
                                                <div style={{ fontSize: '13px', color: '#d1d5db', textAlign: 'center', padding: '12px' }}>
                                                    {linkedGroupIds.size === allGroups.length ? 'Всі групи вже додано' : 'Нічого не знайдено'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Staff selection */}
                            <div style={card} ref={staffPickerRef}>
                                {/* Header */}
                                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <UserCheck size={14} color="#9ca3af" />
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Викладачі для призначення
                                        </span>
                                        {activeStaff.length > 0 && (
                                            <span style={{ fontSize: '11px', background: '#fff7ed', color: '#f97316', padding: '1px 7px', borderRadius: '10px', border: '1px solid #fed7aa', fontWeight: '600' }}>
                                                {activeStaff.length} обрано
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            setCheckedStaffIds(new Set(activeStaffIds))
                                            setStaffPickerOpen(v => !v)
                                        }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: '5px',
                                            padding: '5px 12px',
                                            background: staffPickerOpen ? '#f3f4f6' : '#eff6ff',
                                            border: `1px solid ${staffPickerOpen ? '#e5e7eb' : '#bfdbfe'}`,
                                            borderRadius: '7px', cursor: 'pointer', fontSize: '12px',
                                            color: staffPickerOpen ? '#6b7280' : '#3b82f6', fontWeight: '500',
                                        }}
                                    >
                                        {staffPickerOpen ? <X size={12} /> : <ChevronDown size={12} />}
                                        {activeStaff.length > 0 ? 'Змінити' : 'Обрати'}
                                    </button>
                                </div>

                                {/* Picker dropdown */}
                                {staffPickerOpen && (
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', background: '#fafafa' }}>
                                        <input
                                            value={staffSearch}
                                            onChange={e => setStaffSearch(e.target.value)}
                                            placeholder="Пошук за прізвищем..."
                                            style={{
                                                width: '100%', padding: '7px 10px', border: '1px solid #e5e7eb',
                                                borderRadius: '7px', fontSize: '13px', color: '#111827',
                                                background: '#fff', outline: 'none', boxSizing: 'border-box', marginBottom: '8px',
                                            }}
                                        />
                                        <div style={{ maxHeight: '240px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                                            {filteredStaffForPicker.map(s => {
                                                const used = Math.round((staffHoursMap[s.id] || 0) * 100) / 100
                                                const isOver = used > 600
                                                const pct = Math.min(Math.round((used / 600) * 100), 100)
                                                const isChecked = checkedStaffIds.has(s.id)
                                                return (
                                                    <label key={s.id} style={{
                                                        display: 'flex', alignItems: 'center', gap: '10px',
                                                        padding: '8px 10px', borderRadius: '8px', cursor: 'pointer',
                                                        background: isChecked ? '#fff7ed' : '#fff',
                                                        border: `1px solid ${isChecked ? '#fed7aa' : '#f3f4f6'}`,
                                                        transition: 'all 0.12s',
                                                    }}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isChecked}
                                                            onChange={() => setCheckedStaffIds(prev => {
                                                                const next = new Set(prev)
                                                                if (next.has(s.id)) next.delete(s.id); else next.add(s.id)
                                                                return next
                                                            })}
                                                            style={{ accentColor: '#f97316', width: '15px', height: '15px', cursor: 'pointer', flexShrink: 0 }}
                                                        />
                                                        <div style={{ flex: 1, minWidth: 0 }}>
                                                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                                {s.full_name}
                                                            </div>
                                                            <div style={{ fontSize: '11px', color: isOver ? '#dc2626' : '#9ca3af' }}>
                                                                {s.position} · {used} / 600 год
                                                            </div>
                                                        </div>
                                                        <div style={{ width: '56px', height: '4px', background: '#f3f4f6', borderRadius: '2px', overflow: 'hidden', flexShrink: 0 }}>
                                                            <div style={{ height: '4px', width: `${pct}%`, background: isOver ? '#ef4444' : '#22c55e', borderRadius: '2px' }} />
                                                        </div>
                                                    </label>
                                                )
                                            })}
                                            {filteredStaffForPicker.length === 0 && (
                                                <div style={{ fontSize: '13px', color: '#d1d5db', textAlign: 'center', padding: '16px' }}>
                                                    Нікого не знайдено
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                                            <button
                                                onClick={() => {
                                                    const ids = [...checkedStaffIds]
                                                    setActiveStaffIds(ids)
                                                    if (selectedStaffId && !checkedStaffIds.has(selectedStaffId)) setSelectedStaffId(null)
                                                    setStaffPickerOpen(false)
                                                    setStaffSearch('')
                                                }}
                                                style={{
                                                    flex: 1, padding: '8px', background: '#f97316', color: '#fff',
                                                    border: 'none', borderRadius: '7px', cursor: 'pointer',
                                                    fontSize: '13px', fontWeight: '600',
                                                }}
                                            >
                                                Обрати ({checkedStaffIds.size})
                                            </button>
                                            <button
                                                onClick={() => { setStaffPickerOpen(false); setStaffSearch('') }}
                                                style={{
                                                    padding: '8px 16px', background: '#f3f4f6', color: '#6b7280',
                                                    border: '1px solid #e5e7eb', borderRadius: '7px', cursor: 'pointer',
                                                    fontSize: '13px',
                                                }}
                                            >
                                                Скасувати
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Active staff chips */}
                                {!staffPickerOpen && (
                                    <div style={{ padding: '12px 16px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {activeStaff.length === 0 ? (
                                            <div style={{ fontSize: '13px', color: '#d1d5db', padding: '8px 0' }}>
                                                Натисніть «Обрати» щоб додати викладачів до списку призначення
                                            </div>
                                        ) : activeStaff.map(s => {
                                            const used = Math.round((staffHoursMap[s.id] || 0) * 100) / 100
                                            const isOver = used > 600
                                            const pct = Math.min(Math.round((used / 600) * 100), 100)
                                            const isSel = s.id === selectedStaffId
                                            return (
                                                <div
                                                    key={s.id}
                                                    onClick={() => setSelectedStaffId(isSel ? null : s.id)}
                                                    style={{
                                                        padding: '10px 14px', borderRadius: '10px', cursor: 'pointer',
                                                        border: `2px solid ${isSel ? '#f97316' : isOver ? '#fecaca' : '#e5e7eb'}`,
                                                        background: isSel ? '#fff7ed' : isOver ? '#fef2f2' : '#fafafa',
                                                        transition: 'all 0.15s', minWidth: '120px',
                                                    }}
                                                >
                                                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                                                        {s.full_name.split(' ')[0]}
                                                    </div>
                                                    <div style={{ fontSize: '11px', color: isOver ? '#dc2626' : '#9ca3af' }}>
                                                        {used} / 600 год
                                                    </div>
                                                    <div style={{ height: '3px', background: '#f3f4f6', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                                                        <div style={{ height: '3px', width: `${pct}%`, borderRadius: '2px', background: isOver ? '#ef4444' : '#22c55e' }} />
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Workload slots */}
                            {slots.length > 0 && (
                                <div style={card}>
                                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Призначення {selectedStaff ? `— ${selectedStaff.full_name}` : '(оберіть викладача вище)'}
                                        </span>
                                        {selectedStaff && (
                                            <button
                                                disabled={assignAllMutation.isPending || assignMutation.isPending || clearMutation.isPending}
                                                onClick={() => assignAllMutation.mutate()}
                                                style={{
                                                    padding: '6px 14px', borderRadius: '8px', border: '1px solid #16a34a',
                                                    background: '#16a34a', color: '#fff', fontSize: '12px', fontWeight: '600',
                                                    cursor: assignAllMutation.isPending ? 'default' : 'pointer',
                                                    display: 'flex', alignItems: 'center', gap: '6px', whiteSpace: 'nowrap',
                                                    opacity: assignAllMutation.isPending ? 0.6 : 1,
                                                }}
                                            >
                                                <UserCheck size={14} />
                                                {assignAllMutation.isPending ? 'Призначення…' : 'Призначити все'}
                                            </button>
                                        )}
                                    </div>
                                    <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {(() => {
                                            const TYPE_LABEL: Record<string, string> = {
                                                lecture: 'Лекції', group: 'ГЗ', practical: 'ПЗ',
                                                course_work: 'Курсові роботи', control_work: 'Контрольні роботи',
                                                exam: 'Іспити', credit: 'Заліки',
                                            }
                                            const groups: Record<string, typeof slots> = {}
                                            for (const slot of slots) {
                                                if (!groups[slot.type]) groups[slot.type] = []
                                                groups[slot.type].push(slot)
                                            }
                                            return Object.entries(groups).map(([type, typeSlots]) => {
                                                const typeColor = WORKLOAD_TYPE_COLOR[type] || '#9ca3af'
                                                const typeLabel = TYPE_LABEL[type] ?? type
                                                const totalHours = Math.round(typeSlots.reduce((s, sl) => s + sl.hours, 0) * 10) / 10
                                                return (
                                                    <div key={type} style={{ border: `1px solid ${typeColor}30`, borderRadius: '10px', overflow: 'hidden' }}>
                                                        {/* Type header */}
                                                        <div style={{
                                                            padding: '8px 14px', background: `${typeColor}12`,
                                                            borderBottom: `1px solid ${typeColor}20`,
                                                            display: 'flex', alignItems: 'center', gap: '8px',
                                                        }}>
                                                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColor, flexShrink: 0 }} />
                                                            <span style={{ fontSize: '12px', fontWeight: '700', color: typeColor }}>{typeLabel}</span>
                                                            <span style={{ fontSize: '11px', color: typeColor, opacity: 0.6 }}>
                                                                {typeSlots.length > 1 && `${typeSlots.length} слоти · `}{totalHours} год
                                                            </span>
                                                        </div>
                                                        {/* Slot rows */}
                                                        {typeSlots.map((slot, idx) => {
                                                            const assignment = getSlotAssignment(slot.type, slot.groupNumber)
                                                            const isMySlot = assignment?.staff_id === selectedStaffId
                                                            const ownerName = assignment
                                                                ? (staff.find(s => s.id === assignment.staff_id)?.full_name.split(' ')[0] ?? null)
                                                                : null
                                                            return (
                                                                <div
                                                                    key={`${slot.type}-${slot.groupNumber}`}
                                                                    style={{
                                                                        display: 'flex', alignItems: 'center',
                                                                        justifyContent: 'space-between',
                                                                        padding: '10px 14px',
                                                                        borderBottom: idx < typeSlots.length - 1 ? `1px solid ${typeColor}15` : 'none',
                                                                        background: isMySlot ? '#f0fdf4' : `${typeColor}04`,
                                                                    }}
                                                                >
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                                                                        <div style={{ width: '3px', height: '28px', borderRadius: '2px', background: typeColor, flexShrink: 0 }} />
                                                                        <div>
                                                                            <div style={{ fontSize: '13px', color: '#374151', fontWeight: '500' }}>{slot.label}</div>
                                                                            <div style={{ fontSize: '12px', color: typeColor, fontWeight: '600', marginTop: '1px' }}>{slot.hours} год</div>
                                                                        </div>
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                                        {ownerName && !isMySlot && (
                                                                            <span style={{ fontSize: '11px', color: '#9ca3af', padding: '2px 7px', background: '#f3f4f6', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                                                                {ownerName}
                                                                            </span>
                                                                        )}
                                                                        {isMySlot && (
                                                                            <span style={{ fontSize: '11px', color: '#16a34a', padding: '2px 7px', background: '#f0fdf4', borderRadius: '4px', border: '1px solid #bbf7d0', fontWeight: '600' }}>
                                                                                ✓ Призначено
                                                                            </span>
                                                                        )}
                                                                        <button
                                                                            disabled={!selectedStaffId || assignMutation.isPending || clearMutation.isPending}
                                                                            onClick={() => handleSlotAction(selectedDisc, slot.type, slot.groupNumber, slot.hours, slot.studentCount)}
                                                                            style={{
                                                                                padding: '5px 12px', borderRadius: '6px', border: '1px solid',
                                                                                cursor: selectedStaffId ? 'pointer' : 'not-allowed',
                                                                                fontSize: '12px', fontWeight: '500', transition: 'all 0.15s',
                                                                                opacity: selectedStaffId ? 1 : 0.4,
                                                                                ...(isMySlot
                                                                                    ? { background: '#fef2f2', borderColor: '#fecaca', color: '#dc2626' }
                                                                                    : assignment
                                                                                        ? { background: '#fff7ed', borderColor: '#fed7aa', color: '#f97316' }
                                                                                        : { background: '#eff6ff', borderColor: '#bfdbfe', color: '#3b82f6' }
                                                                                ),
                                                                            }}
                                                                        >
                                                                            {isMySlot ? '× Зняти' : assignment ? '↔ Перепризначити' : '+ Призначити'}
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                )
                                            })
                                        })()}
                                    </div>
                                </div>
                            )}

                            {/* Staff summary */}
                            {staff.length > 0 && (
                                <div style={card}>
                                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6' }}>
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                            Загальне навантаження НПП кафедри
                                        </span>
                                    </div>
                                    <div style={{ padding: '12px 20px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                        {staff.map(s => {
                                            const used = Math.round((staffHoursMap[s.id] || 0) * 100) / 100
                                            const isOver = used > 600
                                            const pct = Math.min(Math.round((used / 600) * 100), 100)
                                            return (
                                                <div key={s.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{
                                                        fontSize: '13px', color: '#111827', fontWeight: s.id === selectedStaffId ? '700' : '400',
                                                        minWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                                    }}>
                                                        {s.full_name.split(' ')[0]} {s.full_name.split(' ')[1]?.[0] || ''}.
                                                    </div>
                                                    <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                                                        <div style={{
                                                            height: '6px', width: `${pct}%`,
                                                            background: isOver ? '#ef4444' : '#22c55e',
                                                            borderRadius: '3px', transition: 'width 0.3s ease',
                                                        }} />
                                                    </div>
                                                    <div style={{
                                                        fontSize: '12px', fontWeight: '600', minWidth: '110px', textAlign: 'right',
                                                        color: isOver ? '#dc2626' : '#6b7280',
                                                    }}>
                                                        {used} / 600 год
                                                        {isOver && (
                                                            <span style={{ marginLeft: '6px', fontSize: '10px', background: '#fef2f2', color: '#dc2626', padding: '1px 5px', borderRadius: '3px', border: '1px solid #fecaca' }}>
                                                                +{used - 600}!
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
