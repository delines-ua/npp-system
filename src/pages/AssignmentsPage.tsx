import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getDisciplines } from '../services/disciplines'
import { getAssignments, createAssignment, deleteAssignment, getStaffWorkloadSummary } from '../services/assignments'
import { calculateWorkload, getStaffHourLimit } from '../utils/workload'
import { ClipboardList, UserCheck, BookOpen, AlertTriangle, CheckCircle } from 'lucide-react'

const card = {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
}

export default function AssignmentsPage() {
    const queryClient = useQueryClient()
    const [selectedDept, setSelectedDept] = useState('')
    const academicYear = '2025-2026'

    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
    const { data: staff } = useQuery({ queryKey: ['staff', selectedDept], queryFn: () => getStaff(selectedDept || undefined), enabled: !!selectedDept })
    const { data: disciplines } = useQuery({ queryKey: ['disciplines', selectedDept], queryFn: () => getDisciplines(selectedDept || undefined), enabled: !!selectedDept })
    const { data: assignments } = useQuery({ queryKey: ['assignments', selectedDept], queryFn: () => getAssignments(selectedDept || undefined), enabled: !!selectedDept })
    const { data: workloadSummary } = useQuery({ queryKey: ['workload-summary', selectedDept], queryFn: () => getStaffWorkloadSummary(selectedDept, academicYear), enabled: !!selectedDept })

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

    const getUsedHours = (staffId: string) =>
        workloadSummary?.find(s => s.staff_id === staffId)?.total_planned || 0

    const getDiscWorkload = (disciplineId: string) => {
        const disc = disciplines?.find(d => d.id === disciplineId)
        if (!disc) return 0
        return calculateWorkload({
            lecture_hours: disc.lecture_hours, group_hours: disc.group_hours,
            subgroup_hours: disc.subgroup_hours, practice_hours: disc.practice_hours,
            course_works: disc.course_works, control_works: disc.control_works,
            exams: disc.exams, credits: disc.credits,
            lecture_streams: 1, group_count: 1, subgroup_count: 1, student_count: 25,
        }).total_hours
    }

    const handleAssign = (staffId: string, disciplineId: string) => {
        const disc = disciplines?.find(d => d.id === disciplineId)
        if (!disc) return
        createMutation.mutate({
            staff_id: staffId,
            discipline_id: disciplineId,
            discipline_name: disc.name,
            planned_hours: getDiscWorkload(disciplineId),
            actual_hours: 0,
            academic_year: academicYear,
            notes: '',
        })
    }

    const isAssigned = (staffId: string, disciplineId: string) =>
        assignments?.some(a => a.staff_id === staffId && a.discipline_id === disciplineId)

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                        Розподіл навантаження
                    </h1>
                    <p style={{ fontSize: '14px', color: '#475569' }}>
                        Призначення дисциплін між НПП · {academicYear} навч. рік
                    </p>
                </div>
                <select
                    value={selectedDept}
                    onChange={e => setSelectedDept(e.target.value)}
                    style={{ padding: '10px 14px', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '14px', color: '#e2e8f0', outline: 'none', minWidth: '260px' }}
                >
                    <option value="">Оберіть кафедру</option>
                    {departments?.map(d => <option key={d.id} value={d.id}>Кафедра № {d.number} — {d.name}</option>)}
                </select>
            </div>

            {!selectedDept && (
                <div style={{ ...card, padding: '80px', textAlign: 'center', color: '#374151' }}>
                    <ClipboardList size={56} style={{ margin: '0 auto 16px', opacity: 0.2 }} />
                    <div style={{ fontSize: '16px', color: '#4b5563' }}>Оберіть кафедру</div>
                    <div style={{ fontSize: '13px', color: '#374151', marginTop: '4px' }}>для розподілу навантаження між НПП</div>
                </div>
            )}

            {selectedDept && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>

                    {/* НПП */}
                    <div>
                        <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserCheck size={16} /> НПП кафедри
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {staff?.map(s => {
                                const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
                                const used = getUsedHours(s.id)
                                const percent = Math.min(Math.round((used / limit) * 100), 100)
                                const isOver = used > limit
                                const isWarning = percent > 80 && !isOver
                                const staffAssignments = assignments?.filter(a => a.staff_id === s.id) || []

                                return (
                                    <div key={s.id} style={{
                                        ...card,
                                        padding: '16px 20px',
                                        border: `1px solid ${isOver ? 'rgba(239,68,68,0.3)' : isWarning ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.06)'}`,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: '#f1f5f9' }}>{s.full_name}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{s.position} · {s.rate} ставки</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e' }}>
                                                    {used} / {limit}
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#6b7280' }}>год · {percent}%</div>
                                            </div>
                                        </div>

                                        {/* Прогрес бар */}
                                        <div style={{ background: 'rgba(255,255,255,0.05)', borderRadius: '4px', height: '4px', marginBottom: '12px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '4px',
                                                width: `${percent}%`,
                                                background: isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e',
                                                borderRadius: '4px',
                                                transition: 'width 0.3s ease',
                                            }} />
                                        </div>

                                        {/* Призначені дисципліни */}
                                        {staffAssignments.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {staffAssignments.map(a => (
                                                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.04)' }}>
                                                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{a.discipline_name}</span>
                                                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                            <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>{a.planned_hours} год</span>
                                                            <button
                                                                onClick={() => deleteMutation.mutate(a.id)}
                                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}
                                                            >×</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {staffAssignments.length === 0 && (
                                            <div style={{ fontSize: '12px', color: '#374151', textAlign: 'center', padding: '8px' }}>
                                                Дисциплін не призначено
                                            </div>
                                        )}

                                        {isOver && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '6px 10px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', fontSize: '12px', color: '#ef4444' }}>
                                                <AlertTriangle size={12} /> Перевищено ліміт навантаження
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {staff?.length === 0 && (
                                <div style={{ ...card, padding: '32px', textAlign: 'center', color: '#374151', fontSize: '14px' }}>
                                    Немає НПП на цій кафедрі
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Дисципліни */}
                    <div>
                        <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#94a3b8', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <BookOpen size={16} /> Дисципліни кафедри
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {disciplines?.map(disc => {
                                const workload = getDiscWorkload(disc.id)
                                const assignedTo = assignments?.filter(a => a.discipline_id === disc.id) || []
                                const fullyAssigned = assignedTo.length > 0

                                return (
                                    <div key={disc.id} style={{
                                        ...card,
                                        padding: '16px 20px',
                                        border: `1px solid ${fullyAssigned ? 'rgba(34,197,94,0.15)' : 'rgba(255,255,255,0.06)'}`,
                                    }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: '#f1f5f9' }}>{disc.name}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                    {disc.education_level.replace(/^\d+_/, '')} · Сем. {disc.semester}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                {fullyAssigned && <CheckCircle size={14} color="#22c55e" />}
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#3b82f6' }}>
                          {workload} год
                        </span>
                                            </div>
                                        </div>

                                        {assignedTo.length > 0 && (
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                                Призначено: {assignedTo.map(a => {
                                                const s = staff?.find(st => st.id === a.staff_id)
                                                return s?.full_name.split(' ')[0]
                                            }).filter(Boolean).join(', ')}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                            {staff?.map(s => {
                                                const assigned = isAssigned(s.id, disc.id)
                                                const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
                                                const used = getUsedHours(s.id)
                                                const wouldOver = used + workload > limit
                                                const lastName = s.full_name.split(' ')[0]

                                                return (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => !assigned && handleAssign(s.id, disc.id)}
                                                        disabled={assigned || createMutation.isPending}
                                                        style={{
                                                            padding: '5px 12px',
                                                            borderRadius: '20px',
                                                            fontSize: '12px',
                                                            fontWeight: '500',
                                                            border: '1px solid',
                                                            cursor: assigned ? 'default' : 'pointer',
                                                            transition: 'all 0.2s',
                                                            background: assigned
                                                                ? 'rgba(34,197,94,0.15)'
                                                                : wouldOver
                                                                    ? 'rgba(239,68,68,0.1)'
                                                                    : 'rgba(37,99,235,0.1)',
                                                            borderColor: assigned
                                                                ? 'rgba(34,197,94,0.3)'
                                                                : wouldOver
                                                                    ? 'rgba(239,68,68,0.3)'
                                                                    : 'rgba(37,99,235,0.25)',
                                                            color: assigned
                                                                ? '#4ade80'
                                                                : wouldOver
                                                                    ? '#f87171'
                                                                    : '#60a5fa',
                                                        }}
                                                    >
                                                        {lastName}{assigned ? ' ✓' : wouldOver ? ' ⚠' : ''}
                                                    </button>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )
                            })}

                            {disciplines?.length === 0 && (
                                <div style={{ ...card, padding: '32px', textAlign: 'center', color: '#374151', fontSize: '14px' }}>
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