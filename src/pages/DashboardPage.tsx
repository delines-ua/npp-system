import { useQuery } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getDisciplines } from '../services/disciplines'
import { calculateWorkload } from '../utils/workload'
import { getStaffHourLimit } from '../utils/workload'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

export default function DashboardPage() {
    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
    const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: () => getStaff() })
    const { data: disciplines } = useQuery({ queryKey: ['disciplines'], queryFn: () => getDisciplines() })

    // Загальна статистика
    const totalDepts = departments?.length || 0
    const totalStaff = staff?.length || 0
    const totalDisciplines = disciplines?.length || 0

    // Розрахунок загального навантаження по всіх дисциплінах
    const totalWorkload = disciplines?.reduce((sum, d) => {
        const calc = calculateWorkload({
            lecture_hours: d.lecture_hours,
            group_hours: d.group_hours,
            subgroup_hours: d.subgroup_hours,
            practice_hours: d.practice_hours,
            course_works: d.course_works,
            control_works: d.control_works,
            exams: d.exams,
            credits: d.credits,
            lecture_streams: 1,
            group_count: 1,
            subgroup_count: 1,
            student_count: 25,
        })
        return sum + calc.total_hours
    }, 0) || 0

    const requiredStaff = Math.round((totalWorkload / 600) * 10) / 10

    // Дані для графіку навантаження по кафедрах
    const deptWorkloadData = departments?.map(dept => {
        const deptDisciplines = disciplines?.filter(d => d.department_id === dept.id) || []
        const workload = deptDisciplines.reduce((sum, d) => {
            const calc = calculateWorkload({
                lecture_hours: d.lecture_hours,
                group_hours: d.group_hours,
                subgroup_hours: d.subgroup_hours,
                practice_hours: d.practice_hours,
                course_works: d.course_works,
                control_works: d.control_works,
                exams: d.exams,
                credits: d.credits,
                lecture_streams: 1,
                group_count: 1,
                subgroup_count: 1,
                student_count: 25,
            })
            return sum + calc.total_hours
        }, 0)
        const deptStaff = staff?.filter(s => s.department_id === dept.id) || []
        return {
            name: `Каф. №${dept.number}`,
            навантаження: Math.round(workload),
            НПП: deptStaff.length,
            потреба: Math.round(workload / 600 * 10) / 10,
        }
    }) || []

    // Дані для кругової діаграми по типах підготовки
    const educationLevelData = disciplines?.reduce((acc, d) => {
        const level = d.education_level.split('_')[1] || d.education_level
        const existing = acc.find(a => a.name === level)
        if (existing) existing.value++
        else acc.push({ name: level, value: 1 })
        return acc
    }, [] as { name: string; value: number }[]) || []

    // Статус НПП (перевантаження)
    const staffStatus = staff?.map(s => {
        const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
        return { ...s, limit }
    }) || []

    const overloaded = staffStatus.filter(s => s.limit < 600).length
    const normal = staffStatus.length - overloaded

    const cardStyle = (color: string) => ({
        background: '#fff',
        padding: '24px',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderLeft: `4px solid ${color}`,
    })

    return (
        <div>
            <h1 style={{ margin: '0 0 24px', fontSize: '24px', color: '#1e293b' }}>
                Дашборд — 2026-2027 навчальний рік
            </h1>

            {/* Картки статистики */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '32px' }}>
                <div style={cardStyle('#3b82f6')}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Кафедр</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{totalDepts}</div>
                </div>
                <div style={cardStyle('#22c55e')}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>НПП у штаті</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{totalStaff}</div>
                </div>
                <div style={cardStyle('#f59e0b')}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Дисциплін</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{totalDisciplines}</div>
                </div>
                <div style={cardStyle('#8b5cf6')}>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>Потреба в НПП</div>
                    <div style={{ fontSize: '32px', fontWeight: '700', color: '#1e293b' }}>{requiredStaff}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>({Math.round(totalWorkload)} год загалом)</div>
                </div>
            </div>

            {/* Графіки */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '24px' }}>

                {/* Навантаження по кафедрах */}
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#1e293b' }}>
                        Навантаження по кафедрах (год)
                    </h3>
                    {deptWorkloadData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Немає даних</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={deptWorkloadData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                                <YAxis tick={{ fontSize: 12 }} />
                                <Tooltip />
                                <Legend />
                                <Bar dataKey="навантаження" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Розподіл по видах підготовки */}
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#1e293b' }}>
                        Види підготовки
                    </h3>
                    {educationLevelData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px' }}>Немає даних</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <PieChart>
                                <Pie
                                    data={educationLevelData}
                                    cx="50%"
                                    cy="50%"
                                    outerRadius={90}
                                    dataKey="value"
                                    label={({ name, value }) => `${name}: ${value}`}
                                    labelLine={false}
                                >
                                    {educationLevelData.map((_, index) => (
                                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Статус НПП */}
            <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                <h3 style={{ margin: '0 0 20px', fontSize: '16px', color: '#1e293b' }}>
                    Статус НПП по кафедрах
                </h3>
                {deptWorkloadData.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>Немає даних</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {departments?.map(dept => {
                            const deptStaff = staffStatus.filter(s => s.department_id === dept.id)
                            const deptDisciplines = disciplines?.filter(d => d.department_id === dept.id) || []
                            const workload = deptDisciplines.reduce((sum, d) => {
                                const calc = calculateWorkload({
                                    lecture_hours: d.lecture_hours,
                                    group_hours: d.group_hours,
                                    subgroup_hours: d.subgroup_hours,
                                    practice_hours: d.practice_hours,
                                    course_works: d.course_works,
                                    control_works: d.control_works,
                                    exams: d.exams,
                                    credits: d.credits,
                                    lecture_streams: 1,
                                    group_count: 1,
                                    subgroup_count: 1,
                                    student_count: 25,
                                })
                                return sum + calc.total_hours
                            }, 0)
                            const needed = Math.round(workload / 600 * 10) / 10
                            const actual = deptStaff.length
                            const isOk = actual >= needed

                            return (
                                <div key={dept.id} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    padding: '12px 16px',
                                    borderRadius: '8px',
                                    background: isOk ? '#f0fdf4' : '#fef2f2',
                                    border: `1px solid ${isOk ? '#bbf7d0' : '#fecaca'}`,
                                }}>
                                    <div>
                    <span style={{ fontWeight: '600', color: '#1e293b' }}>
                      Кафедра № {dept.number}
                    </span>
                                        <span style={{ fontSize: '13px', color: '#64748b', marginLeft: '12px' }}>
                      {dept.name}
                    </span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '24px', fontSize: '13px' }}>
                    <span style={{ color: '#64748b' }}>
                      Навантаження: <strong>{Math.round(workload)} год</strong>
                    </span>
                                        <span style={{ color: '#64748b' }}>
                      Потреба: <strong>{needed} НПП</strong>
                    </span>
                                        <span style={{ color: '#64748b' }}>
                      У штаті: <strong>{actual} НПП</strong>
                    </span>
                                        <span style={{
                                            padding: '2px 10px',
                                            borderRadius: '20px',
                                            fontWeight: '600',
                                            background: isOk ? '#22c55e' : '#ef4444',
                                            color: '#fff',
                                            fontSize: '12px',
                                        }}>
                      {isOk ? 'Норма' : 'Нестача'}
                    </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}