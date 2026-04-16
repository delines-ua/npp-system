import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getDisciplines } from '../services/disciplines'
import { getAssignments, createAssignment, deleteAssignment, getStaffWorkloadSummary } from '../services/assignments'
import { calculateWorkload, getStaffHourLimit } from '../utils/workload'

export default function AssignmentsPage() {
    const queryClient = useQueryClient()
    const [selectedDept, setSelectedDept] = useState('')
    const academicYear = '2025-2026'

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    })

    const { data: staff } = useQuery({
        queryKey: ['staff', selectedDept],
        queryFn: () => getStaff(selectedDept || undefined),
        enabled: !!selectedDept,
    })

    const { data: disciplines } = useQuery({
        queryKey: ['disciplines', selectedDept],
        queryFn: () => getDisciplines(selectedDept || undefined),
        enabled: !!selectedDept,
    })

    const { data: assignments } = useQuery({
        queryKey: ['assignments', selectedDept],
        queryFn: () => getAssignments(selectedDept || undefined),
        enabled: !!selectedDept,
    })

    const { data: workloadSummary } = useQuery({
        queryKey: ['workload-summary', selectedDept],
        queryFn: () => getStaffWorkloadSummary(selectedDept, academicYear),
        enabled: !!selectedDept,
    })

    const createMutation = useMutation({
        mutationFn: createAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] })
            queryClient.invalidateQueries({ queryKey: ['workload-summary'] })
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteAssignment,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['assignments'] })
            queryClient.invalidateQueries({ queryKey: ['workload-summary'] })
        },
    })

    const getStaffUsedHours = (staffId: string) => {
        const summary = workloadSummary?.find(s => s.staff_id === staffId)
        return summary?.total_planned || 0
    }

    const getDisciplineWorkload = (disciplineId: string) => {
        const disc = disciplines?.find(d => d.id === disciplineId)
        if (!disc) return 0
        const calc = calculateWorkload({
            lecture_hours: disc.lecture_hours,
            group_hours: disc.group_hours,
            subgroup_hours: disc.subgroup_hours,
            practice_hours: disc.practice_hours,
            course_works: disc.course_works,
            control_works: disc.control_works,
            exams: disc.exams,
            credits: disc.credits,
            lecture_streams: 1,
            group_count: 1,
            subgroup_count: 1,
            student_count: 25,
        })
        return calc.total_hours
    }

    const handleAssign = (staffId: string, disciplineId: string) => {
        const disc = disciplines?.find(d => d.id === disciplineId)
        if (!disc) return
        const hours = getDisciplineWorkload(disciplineId)
        createMutation.mutate({
            staff_id: staffId,
            discipline_id: disciplineId,
            discipline_name: disc.name,
            planned_hours: hours,
            actual_hours: 0,
            academic_year: academicYear,
            notes: '',
        })
    }

    const isAlreadyAssigned = (staffId: string, disciplineId: string) => {
        return assignments?.some(a => a.staff_id === staffId && a.discipline_id === disciplineId)
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>
                    Розподіл навантаження між НПП
                </h1>
                <select
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                >
                    <option value="">Оберіть кафедру</option>
                    {departments?.map(d => (
                        <option key={d.id} value={d.id}>Кафедра № {d.number} — {d.name}</option>
                    ))}
                </select>
            </div>

            {!selectedDept && (
                <div style={{ background: '#fff', padding: '48px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
                    Оберіть кафедру для розподілу навантаження
                </div>
            )}

            {selectedDept && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                    {/* НПП кафедри */}
                    <div>
                        <h2 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '16px' }}>
                            НПП кафедри
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {staff?.map(s => {
                                const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
                                const used = getStaffUsedHours(s.id)
                                const percent = Math.round((used / limit) * 100)
                                const isOver = used > limit
                                const staffAssignments = assignments?.filter(a => a.staff_id === s.id) || []

                                return (
                                    <div key={s.id} style={{
                                        background: '#fff',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                        border: `1px solid ${isOver ? '#fecaca' : '#e2e8f0'}`,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                                                    {s.full_name}
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>
                                                    {s.position} · {s.rate} ставки
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '600', color: isOver ? '#ef4444' : '#22c55e' }}>
                                                    {used} / {limit} год
                                                </div>
                                                <div style={{ fontSize: '12px', color: '#64748b' }}>{percent}%</div>
                                            </div>
                                        </div>

                                        {/* Прогрес бар */}
                                        <div style={{ background: '#f1f5f9', borderRadius: '4px', height: '6px', marginBottom: '10px' }}>
                                            <div style={{
                                                height: '6px',
                                                borderRadius: '4px',
                                                width: `${Math.min(percent, 100)}%`,
                                                background: isOver ? '#ef4444' : percent > 80 ? '#f59e0b' : '#22c55e',
                                                transition: 'width 0.3s',
                                            }} />
                                        </div>

                                        {/* Призначені дисципліни */}
                                        {staffAssignments.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {staffAssignments.map(a => (
                                                    <div key={a.id} style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        padding: '4px 8px',
                                                        background: '#f8fafc',
                                                        borderRadius: '6px',
                                                        fontSize: '12px',
                                                    }}>
                                                        <span style={{ color: '#1e293b' }}>{a.discipline_name}</span>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                              <span style={{ color: '#3b82f6', fontWeight: '600' }}>
                                {a.planned_hours} год
                              </span>
                                                            <button
                                                                onClick={() => deleteMutation.mutate(a.id)}
                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '14px' }}
                                                            >
                                                                ×
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {staff?.length === 0 && (
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                    Немає НПП на цій кафедрі
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Дисципліни для розподілу */}
                    <div>
                        <h2 style={{ fontSize: '16px', color: '#1e293b', marginBottom: '16px' }}>
                            Дисципліни кафедри
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {disciplines?.map(disc => {
                                const workload = getDisciplineWorkload(disc.id)
                                const assignedStaff = assignments?.filter(a => a.discipline_id === disc.id) || []

                                return (
                                    <div key={disc.id} style={{
                                        background: '#fff',
                                        padding: '16px',
                                        borderRadius: '12px',
                                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                                    }}>
                                        <div style={{ marginBottom: '10px' }}>
                                            <div style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b' }}>
                                                {disc.name}
                                            </div>
                                            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                                                {disc.education_level} · Семестр {disc.semester}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#3b82f6', fontWeight: '600', marginTop: '4px' }}>
                                                Навантаження: {workload} год
                                            </div>
                                        </div>

                                        {/* Вже призначені */}
                                        {assignedStaff.length > 0 && (
                                            <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>
                                                Призначено: {assignedStaff.map(a => {
                                                const s = staff?.find(st => st.id === a.staff_id)
                                                return s?.full_name.split(' ')[0]
                                            }).join(', ')}
                                            </div>
                                        )}

                                        {/* Кнопки призначення */}
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {staff?.map(s => {
                                                const assigned = isAlreadyAssigned(s.id, disc.id)
                                                const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
                                                const used = getStaffUsedHours(s.id)
                                                const wouldOverload = used + workload > limit

                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => !assigned && handleAssign(s.id, disc.id)}
                                                        disabled={assigned || createMutation.isPending}
                                                        style={{
                                                            padding: '4px 10px',
                                                            borderRadius: '6px',
                                                            fontSize: '12px',
                                                            border: '1px solid',
                                                            cursor: assigned ? 'default' : 'pointer',
                                                            background: assigned ? '#dcfce7' : wouldOverload ? '#fff7ed' : '#f0f9ff',
                                                            borderColor: assigned ? '#86efac' : wouldOverload ? '#fed7aa' : '#bae6fd',
                                                            color: assigned ? '#16a34a' : wouldOverload ? '#c2410c' : '#0369a1',
                                                        }}
                                                    >
                                                        {s.full_name.split(' ')[0]}
                                                        {assigned ? ' ✓' : wouldOverload ? ' ⚠' : ''}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}

                            {disciplines?.length === 0 && (
                                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '14px' }}>
                                    Немає дисциплін на цій кафедрі
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}