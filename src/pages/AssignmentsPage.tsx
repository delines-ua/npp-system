import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getDisciplines } from '../services/disciplines'
import { getAssignments, createAssignment, deleteAssignment, getStaffWorkloadSummary, updateActualHours } from '../services/assignments'
import { calculateWorkload, getStaffHourLimit } from '../utils/workload'
import { exportDepartmentExcel } from '../utils/reports'
import { ClipboardList, UserCheck, BookOpen, AlertTriangle, CheckCircle, FileDown, Filter, X } from 'lucide-react'

const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

const selectStyle = {
    padding: '7px 10px',
    background: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: '7px',
    fontSize: '12px',
    color: '#111827',
    outline: 'none',
}

export default function AssignmentsPage() {
    const queryClient = useQueryClient()
    const [selectedDept, setSelectedDept] = useState('')
    const [filterLevel, setFilterLevel] = useState('')
    const [filterForm, setFilterForm] = useState('')
    const [filterSemester, setFilterSemester] = useState('')
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
            staff_id: staffId, discipline_id: disciplineId,
            discipline_name: disc.name,
            planned_hours: getDiscWorkload(disciplineId),
            actual_hours: 0, academic_year: academicYear, notes: '',
        })
    }

    const isAssigned = (staffId: string, disciplineId: string) =>
        assignments?.some(a => a.staff_id === staffId && a.discipline_id === disciplineId)

    const handleActualUpdate = async (id: string, value: number) => {
        await updateActualHours(id, value)
        queryClient.invalidateQueries({ queryKey: ['assignments'] })
        queryClient.invalidateQueries({ queryKey: ['workload-summary'] })
    }

    const handleExcelExport = () => {
        const dept = departments?.find(d => d.id === selectedDept)
        exportDepartmentExcel(dept?.name || '', dept?.number || '', staff || [], assignments || [], departments || [], getStaffHourLimit)
    }

    const filteredDisciplines = disciplines?.filter(d => {
        if (filterLevel && !d.education_level.includes(filterLevel)) return false
        if (filterForm === 'ochna' && d.education_level.includes('заочна')) return false
        if (filterForm === 'zaochna' && !d.education_level.includes('заочна')) return false
        if (filterSemester && d.semester !== Number(filterSemester)) return false
        return true
    }) || []

    const activeFilters = [filterLevel, filterForm, filterSemester].filter(Boolean).length

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                        Розподіл навантаження
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Призначення дисциплін між НПП · {academicYear} навч. рік
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <select
                        value={selectedDept}
                        onChange={e => setSelectedDept(e.target.value)}
                        style={{ padding: '10px 14px', background: '#f9fafb', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '14px', color: '#111827', outline: 'none', minWidth: '260px' }}
                    >
                        <option value="">Оберіть кафедру</option>
                        {departments?.map(d => <option key={d.id} value={d.id}>Кафедра № {d.number} — {d.name}</option>)}
                    </select>
                    {selectedDept && (
                        <button
                            onClick={handleExcelExport}
                            style={{ padding: '10px 16px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', whiteSpace: 'nowrap' }}
                        >
                            <FileDown size={16} /> Excel
                        </button>
                    )}
                </div>
            </div>

            {!selectedDept && (
                <div style={{ ...card, padding: '80px', textAlign: 'center' }}>
                    <ClipboardList size={56} style={{ margin: '0 auto 16px', opacity: 0.15, color: '#9ca3af' }} />
                    <div style={{ fontSize: '16px', color: '#9ca3af' }}>Оберіть кафедру</div>
                    <div style={{ fontSize: '13px', color: '#d1d5db', marginTop: '4px' }}>для розподілу навантаження між НПП</div>
                </div>
            )}

            {selectedDept && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                    {/* НПП */}
                    <div>
                        <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <UserCheck size={15} /> НПП кафедри ({staff?.length || 0})
                        </h2>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            {staff?.map(s => {
                                const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
                                const used = getUsedHours(s.id)
                                const percent = Math.min(Math.round((used / limit) * 100), 100)
                                const isOver = used > limit
                                const isWarning = percent > 80 && !isOver
                                const staffAssignments = assignments?.filter(a => a.staff_id === s.id) || []
                                const actualTotal = staffAssignments.reduce((sum, a) => sum + (a.actual_hours || 0), 0)

                                return (
                                    <div key={s.id} style={{ ...card, padding: '16px 20px', border: `1px solid ${isOver ? '#fecaca' : isWarning ? '#fde68a' : '#e5e7eb'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                            <div>
                                                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>{s.full_name}</div>
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{s.position} · {s.rate} ставки</div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <div style={{ fontSize: '13px', fontWeight: '700', color: isOver ? '#dc2626' : isWarning ? '#d97706' : '#16a34a' }}>
                                                    {used} / {limit} год
                                                </div>
                                                <div style={{ fontSize: '11px', color: '#9ca3af' }}>{percent}% плану</div>
                                            </div>
                                        </div>

                                        <div style={{ background: '#f3f4f6', borderRadius: '4px', height: '6px', marginBottom: '12px', overflow: 'hidden' }}>
                                            <div style={{ height: '6px', width: `${percent}%`, background: isOver ? '#ef4444' : isWarning ? '#f59e0b' : '#22c55e', borderRadius: '4px', transition: 'width 0.3s ease' }} />
                                        </div>

                                        {staffAssignments.length > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '6px 10px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>Фактично виконано:</span>
                                                <span style={{ fontSize: '12px', color: '#16a34a', fontWeight: '600' }}>{actualTotal} год</span>
                                            </div>
                                        )}

                                        {staffAssignments.length > 0 && (
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                {staffAssignments.map(a => (
                                                    <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 10px', background: '#f9fafb', borderRadius: '6px', border: '1px solid #f3f4f6' }}>
                                                        <span style={{ fontSize: '12px', color: '#374151', flex: 1, marginRight: '8px' }}>{a.discipline_name}</span>
                                                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                                                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>план:</span>
                                                            <span style={{ fontSize: '12px', color: '#f97316', fontWeight: '600', minWidth: '28px' }}>{a.planned_hours}</span>
                                                            <span style={{ fontSize: '11px', color: '#9ca3af' }}>факт:</span>
                                                            <input
                                                                type="number" min={0} defaultValue={a.actual_hours || 0}
                                                                onBlur={e => handleActualUpdate(a.id, Number(e.target.value))}
                                                                style={{ width: '52px', padding: '2px 6px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '12px', color: '#16a34a', outline: 'none' }}
                                                            />
                                                            <button onClick={() => deleteMutation.mutate(a.id)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: '0 2px' }}>×</button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}

                                        {staffAssignments.length === 0 && (
                                            <div style={{ fontSize: '12px', color: '#d1d5db', textAlign: 'center', padding: '8px' }}>Дисциплін не призначено</div>
                                        )}

                                        {isOver && (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '8px', padding: '6px 10px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px', fontSize: '12px', color: '#dc2626' }}>
                                                <AlertTriangle size={12} /> Перевищено ліміт навантаження
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                            {staff?.length === 0 && (
                                <div style={{ ...card, padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>Немає НПП на цій кафедрі</div>
                            )}
                        </div>
                    </div>

                    {/* Дисципліни */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h2 style={{ fontSize: '13px', fontWeight: '600', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <BookOpen size={15} /> Дисципліни ({filteredDisciplines.length}/{disciplines?.length || 0})
                            </h2>
                            <button
                                onClick={() => {
                                    if (activeFilters > 0) { setFilterLevel(''); setFilterForm(''); setFilterSemester('') }
                                }}
                                style={{ padding: '5px 10px', background: activeFilters > 0 ? '#fff7ed' : '#f9fafb', border: `1px solid ${activeFilters > 0 ? '#fed7aa' : '#e5e7eb'}`, borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: activeFilters > 0 ? '#f97316' : '#6b7280', display: 'flex', alignItems: 'center', gap: '5px' }}
                            >
                                <Filter size={12} />
                                {activeFilters > 0 ? `Фільтри (${activeFilters})` : 'Фільтри'}
                                {activeFilters > 0 && <X size={11} />}
                            </button>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '12px' }}>
                            <select style={selectStyle} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                                <option value="">Всі рівні</option>
                                <option value="Бакалавр">Бакалавр</option>
                                <option value="Магістр">Магістр</option>
                                <option value="Доктор">Доктор філос.</option>
                                <option value="загальновійськова">Загальновійськ.</option>
                                <option value="Курси">Курси</option>
                            </select>
                            <select style={selectStyle} value={filterForm} onChange={e => setFilterForm(e.target.value)}>
                                <option value="">Всі форми</option>
                                <option value="ochna">Очна</option>
                                <option value="zaochna">Заочна</option>
                            </select>
                            <select style={selectStyle} value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                                <option value="">Всі семестри</option>
                                {[1,2,3,4,5,6,7,8,9,10,11,12].map(s => (
                                    <option key={s} value={s}>Семестр {s}</option>
                                ))}
                            </select>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', paddingRight: '4px' }}>
                            {filteredDisciplines.map(disc => {
                                const workload = getDiscWorkload(disc.id)
                                const assignedTo = assignments?.filter(a => a.discipline_id === disc.id) || []
                                const fullyAssigned = assignedTo.length > 0
                                const isZaochna = disc.education_level.includes('заочна')
                                const levelColor = disc.education_level.includes('Магістр') ? '#8b5cf6'
                                    : disc.education_level.includes('Доктор') ? '#ef4444'
                                        : disc.education_level.includes('Курси') ? '#f59e0b'
                                            : isZaochna ? '#06b6d4' : '#3b82f6'

                                return (
                                    <div key={disc.id} style={{ ...card, padding: '12px 16px', border: `1px solid ${fullyAssigned ? '#bbf7d0' : '#e5e7eb'}` }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                            <div style={{ flex: 1, marginRight: '8px' }}>
                                                <div style={{ fontWeight: '600', fontSize: '13px', color: '#111827', marginBottom: '4px' }}>{disc.name}</div>
                                                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                    <span style={{ fontSize: '11px', padding: '1px 6px', borderRadius: '4px', background: `${levelColor}18`, color: levelColor, fontWeight: '500', border: `1px solid ${levelColor}30` }}>
                                                        {disc.education_level.replace(/^\d+_/, '')}
                                                    </span>
                                                    <span style={{ fontSize: '11px', color: '#9ca3af' }}>Сем. {disc.semester}</span>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                                                {fullyAssigned && <CheckCircle size={13} color="#16a34a" />}
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#f97316' }}>{workload} год</span>
                                            </div>
                                        </div>

                                        {assignedTo.length > 0 && (
                                            <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '6px' }}>
                                                Призначено: {assignedTo.map(a => {
                                                    const s = staff?.find(st => st.id === a.staff_id)
                                                    return s?.full_name.split(' ')[0]
                                                }).filter(Boolean).join(', ')}
                                            </div>
                                        )}

                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
                                                            padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '500',
                                                            border: '1px solid', cursor: assigned ? 'default' : 'pointer', transition: 'all 0.2s',
                                                            background: assigned ? '#f0fdf4' : wouldOver ? '#fef2f2' : '#eff6ff',
                                                            borderColor: assigned ? '#bbf7d0' : wouldOver ? '#fecaca' : '#bfdbfe',
                                                            color: assigned ? '#16a34a' : wouldOver ? '#dc2626' : '#3b82f6',
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

                            {filteredDisciplines.length === 0 && (
                                <div style={{ ...card, padding: '32px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
                                    {disciplines?.length === 0 ? 'Немає дисциплін на цій кафедрі' : 'Нічого не знайдено — змініть фільтри'}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}