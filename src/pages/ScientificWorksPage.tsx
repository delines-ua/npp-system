import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getScientificWorks, createScientificWork, deleteScientificWork } from '../services/scientificWorks'
import { getDetailedAssignments } from '../services/workloadAssignments'
import { getDisciplines } from '../services/disciplines'
import { getWorkloadCeiling, buildStaffHoursMap } from '../utils/workload'
import { useSettings } from '../contexts/SettingsContext'
import { SCIENTIFIC_WORK_TYPES } from '../utils/lawNorms'
import type { ScientificWorkType } from '../utils/lawNorms'
import { GraduationCap, Plus, Trash2, AlertTriangle } from 'lucide-react'
import Select from '../components/Select'

const card: React.CSSProperties = {
    background: '#ffffff', border: '1px solid #e5e7eb',
    borderRadius: '16px', boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.08)',
}

const selectStyle: React.CSSProperties = {
    padding: '8px 11px', background: '#f9fafb', border: '1px solid #d1d5db',
    borderRadius: '7px', fontSize: '13px', color: '#111827', outline: 'none',
}

export default function ScientificWorksPage() {
    const queryClient = useQueryClient()
    const { settings, academicYear: ACADEMIC_YEAR } = useSettings()
    const [selectedDept, setSelectedDept] = useState('')
    const [addForm, setAddForm] = useState<{ staffId: string; type: ScientificWorkType; count: string; notes: string }>({
        staffId: '', type: 'bachelor_thesis', count: '', notes: '',
    })

    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
    useEffect(() => {
        if (!selectedDept && departments?.length) {
            const d = departments.find(d => d.number === '22')
            if (d) setSelectedDept(d.id)
        }
    }, [departments])

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

    const { data: detailedAssignments = [] } = useQuery({
        queryKey: ['detailed-assignments', selectedDept, ACADEMIC_YEAR, discIds.join(',')],
        queryFn: () => getDetailedAssignments(discIds),
        enabled: !!selectedDept && discIds.length > 0,
    })

    const { data: works = [] } = useQuery({
        queryKey: ['scientific-works', selectedDept, ACADEMIC_YEAR],
        queryFn: () => getScientificWorks(selectedDept, ACADEMIC_YEAR),
        enabled: !!selectedDept,
    })

    const inv = () => queryClient.invalidateQueries({ queryKey: ['scientific-works', selectedDept, ACADEMIC_YEAR] })

    const createMutation = useMutation({
        mutationFn: () => createScientificWork(
            addForm.staffId, selectedDept, addForm.type,
            Number(addForm.count), addForm.notes, ACADEMIC_YEAR
        ),
        onSuccess: () => {
            inv()
            setAddForm(f => ({ ...f, staffId: '', count: '', notes: '' }))
        },
    })

    const deleteMutation = useMutation({ mutationFn: deleteScientificWork, onSuccess: inv })

    // Staff total hours = discipline assignments + scientific works
    const staffHoursMap = useMemo(() => {
        const map = buildStaffHoursMap(detailedAssignments)
        for (const w of works) {
            map[w.staff_id] = Math.round(((map[w.staff_id] || 0) + w.hours) * 100) / 100
        }
        return map
    }, [detailedAssignments, works])

    // Group works by staff
    const worksByStaff = useMemo(() => {
        const map: Record<string, typeof works> = {}
        for (const w of works) {
            if (!map[w.staff_id]) map[w.staff_id] = []
            map[w.staff_id].push(w)
        }
        return map
    }, [works])

    const hoursPreview = addForm.count
        ? Math.round(SCIENTIFIC_WORK_TYPES[addForm.type].hours * Number(addForm.count) * 10) / 10
        : 0

    const workTypeKeys = Object.keys(SCIENTIFIC_WORK_TYPES) as ScientificWorkType[]

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                        Керівництво здобувачами
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Бакалаврські, магістерські роботи, ад'юнкти · {ACADEMIC_YEAR}
                    </p>
                </div>
                <Select
                    value={selectedDept}
                    onChange={setSelectedDept}
                    placeholder="Оберіть кафедру"
                    style={{ minWidth: '260px' }}
                    options={[
                        ...(departments?.map(d => ({ value: d.id, label: `Каф. №${d.number} — ${d.name}` })) ?? []),
                    ]}
                />
            </div>

            {!selectedDept && (
                <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
                    <GraduationCap size={56} style={{ margin: '0 auto 16px', opacity: 0.15, color: '#9ca3af' }} />
                    <div style={{ fontSize: '15px', color: '#9ca3af' }}>Оберіть кафедру</div>
                </div>
            )}

            {selectedDept && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '16px', alignItems: 'start' }}>

                    {/* LEFT: Staff workload + their works */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        {staff.map(s => {
                            const limit = getWorkloadCeiling(s, settings)
                            const used  = Math.round(staffHoursMap[s.id] || 0)
                            const pct   = Math.min(Math.round((used / limit) * 100), 100)
                            const isOver = used > limit
                            const isWarn = pct > 80 && !isOver
                            const staffWorks = worksByStaff[s.id] || []

                            return (
                                <div key={s.id} style={card}>
                                    <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontSize: '15px', fontWeight: '700', color: '#111827' }}>{s.full_name}</div>
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>{s.position}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontSize: '14px', fontWeight: '700', color: isOver ? '#dc2626' : isWarn ? '#d97706' : '#16a34a' }}>
                                                {used} / {limit} год
                                                {isOver && <AlertTriangle size={13} style={{ display: 'inline', marginLeft: '4px' }} />}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#9ca3af' }}>{pct}% навантаження</div>
                                            {/* Progress bar */}
                                            <div style={{ width: '140px', height: '4px', background: '#f3f4f6', borderRadius: '2px', marginTop: '6px', overflow: 'hidden' }}>
                                                <div style={{ height: '4px', width: `${pct}%`, background: isOver ? '#ef4444' : isWarn ? '#f59e0b' : '#22c55e', borderRadius: '2px', transition: 'width 0.3s' }} />
                                            </div>
                                        </div>
                                    </div>

                                    {staffWorks.length > 0 ? (
                                        <div style={{ padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                            {staffWorks.map(w => {
                                                const meta = SCIENTIFIC_WORK_TYPES[w.work_type]
                                                return (
                                                    <div key={w.id} style={{
                                                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                                        padding: '7px 12px', background: '#f9fafb', borderRadius: '8px', border: '1px solid #f3f4f6',
                                                    }}>
                                                        <div>
                                                            <span style={{ fontSize: '13px', color: meta.color, fontWeight: '600', marginRight: '8px' }}>
                                                                {meta.label}
                                                            </span>
                                                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                                                                {w.student_count} {w.student_count === 1 ? 'особа' : 'особи'} × {meta.hours}г = {w.hours}г
                                                            </span>
                                                            {w.notes && <span style={{ fontSize: '11px', color: '#9ca3af', marginLeft: '8px' }}>{w.notes}</span>}
                                                        </div>
                                                        <button onClick={() => deleteMutation.mutate(w.id)}
                                                            style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', padding: '2px' }}>
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    ) : (
                                        <div style={{ padding: '14px 20px', fontSize: '12px', color: '#d1d5db', textAlign: 'center' }}>
                                            Керівництво не призначено
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {staff.length === 0 && (
                            <div style={{ ...card, padding: '40px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                Немає НПП на цій кафедрі
                            </div>
                        )}
                    </div>

                    {/* RIGHT: Add form */}
                    <div style={{ position: 'sticky', top: '72px' }}>
                        <div style={card}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Plus size={14} color="#9ca3af" />
                                <span style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Додати запис
                                </span>
                            </div>
                            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

                                <div>
                                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>НПП</label>
                                    <Select
                                        value={addForm.staffId}
                                        onChange={v => setAddForm(f => ({ ...f, staffId: v }))}
                                        placeholder="— Оберіть НПП"
                                        options={staff.map(s => ({ value: s.id, label: s.full_name }))}
                                    />
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>Тип роботи</label>
                                    <Select
                                        value={addForm.type}
                                        onChange={v => setAddForm(f => ({ ...f, type: v as ScientificWorkType }))}
                                        options={workTypeKeys.map(k => ({ value: k, label: `${SCIENTIFIC_WORK_TYPES[k].label} (${SCIENTIFIC_WORK_TYPES[k].hours}г/особа)` }))}
                                    />
                                </div>

                                {/* Norm hint */}
                                <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '12px', color: '#16a34a' }}>
                                    Норма: <strong>{SCIENTIFIC_WORK_TYPES[addForm.type].hours}</strong> год/особа
                                    {' · '}Наказ №155/291, Табл.3
                                </div>

                                <div>
                                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>Кількість осіб</label>
                                    <input type="number" min={1} value={addForm.count}
                                        onChange={e => setAddForm(f => ({ ...f, count: e.target.value }))}
                                        placeholder="1"
                                        style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} />
                                </div>

                                {hoursPreview > 0 && (
                                    <div style={{ padding: '10px 14px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: '#f97316' }}>Розрахунок:</span>
                                        <span style={{ fontSize: '17px', fontWeight: '700', color: '#f97316' }}>
                                            {addForm.count} × {SCIENTIFIC_WORK_TYPES[addForm.type].hours} = <strong>{hoursPreview}</strong> год
                                        </span>
                                    </div>
                                )}

                                <div>
                                    <label style={{ fontSize: '12px', color: '#6b7280', display: 'block', marginBottom: '5px' }}>Примітка (необов'язково)</label>
                                    <input value={addForm.notes}
                                        onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))}
                                        placeholder="Напр.: ДР у форматі статті..."
                                        style={{ ...selectStyle, width: '100%', boxSizing: 'border-box' }} />
                                </div>

                                <button
                                    disabled={!addForm.staffId || !addForm.count || createMutation.isPending}
                                    onClick={() => createMutation.mutate()}
                                    style={{
                                        padding: '10px 18px', background: '#f97316', color: '#fff', border: 'none',
                                        borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                        opacity: addForm.staffId && addForm.count ? 1 : 0.4,
                                    }}>
                                    <Plus size={15} />
                                    {createMutation.isPending ? 'Збереження...' : 'Додати роботу'}
                                </button>
                            </div>
                        </div>

                        {/* Norms reference */}
                        <div style={{ ...card, marginTop: '14px' }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6' }}>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                    Норми (Наказ №155/291, Табл.3)
                                </span>
                            </div>
                            <div style={{ padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {workTypeKeys.map(k => {
                                    const meta = SCIENTIFIC_WORK_TYPES[k]
                                    return (
                                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                                            <span style={{ color: '#374151' }}>{meta.label}</span>
                                            <span style={{ color: meta.color, fontWeight: '600' }}>{meta.hours} год/особа</span>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
