import { useQuery } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getDisciplines } from '../services/disciplines'
import { calculateWorkload, getStaffHourLimit } from '../utils/workload'
import { Building2, Users, BookOpen, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, ResponsiveContainer
} from 'recharts'

const COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']

const card = {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    padding: '24px',
    backdropFilter: 'blur(10px)',
}

export default function DashboardPage() {
    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
    const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: () => getStaff() })
    const { data: disciplines } = useQuery({ queryKey: ['disciplines'], queryFn: () => getDisciplines() })

    const totalWorkload = disciplines?.reduce((sum, d) => {
        const calc = calculateWorkload({
            lecture_hours: d.lecture_hours, group_hours: d.group_hours,
            subgroup_hours: d.subgroup_hours, practice_hours: d.practice_hours,
            course_works: d.course_works, control_works: d.control_works,
            exams: d.exams, credits: d.credits,
            lecture_streams: 1, group_count: 1, subgroup_count: 1, student_count: 25,
        })
        return sum + calc.total_hours
    }, 0) || 0

    const requiredStaff = Math.round((totalWorkload / 600) * 10) / 10

    const deptData = departments?.map(dept => {
        const deptDisc = disciplines?.filter(d => d.department_id === dept.id) || []
        const workload = deptDisc.reduce((sum, d) => {
            const calc = calculateWorkload({
                lecture_hours: d.lecture_hours, group_hours: d.group_hours,
                subgroup_hours: d.subgroup_hours, practice_hours: d.practice_hours,
                course_works: d.course_works, control_works: d.control_works,
                exams: d.exams, credits: d.credits,
                lecture_streams: 1, group_count: 1, subgroup_count: 1, student_count: 25,
            })
            return sum + calc.total_hours
        }, 0)
        return { name: `№${dept.number}`, навантаження: Math.round(workload), потреба: Math.round(workload / 600 * 10) / 10 }
    }) || []

    const levelData = disciplines?.reduce((acc, d) => {
        const level = d.education_level.replace(/^\d+_/, '').replace(' (очна)', '').replace(' (заочна)', ' (заочна)')
        const ex = acc.find(a => a.name === level)
        if (ex) ex.value++
        else acc.push({ name: level, value: 1 })
        return acc
    }, [] as { name: string; value: number }[]) || []

    const staffStatus = staff?.map(s => ({
        ...s, limit: getStaffHourLimit(s.rate, s.is_military, s.service_years)
    })) || []

    const stats = [
        { label: 'Кафедр', value: departments?.length || 0, icon: Building2, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)' },
        { label: 'НПП у штаті', value: staff?.length || 0, icon: Users, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)' },
        { label: 'Дисциплін', value: disciplines?.length || 0, icon: BookOpen, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', border: 'rgba(245,158,11,0.2)' },
        { label: 'Потреба в НПП', value: requiredStaff, icon: TrendingUp, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', border: 'rgba(139,92,246,0.2)', sub: `${Math.round(totalWorkload)} год загалом` },
    ]

    const customTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div style={{ background: '#1e293b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#e2e8f0' }}>
                <div style={{ marginBottom: '4px', color: '#94a3b8' }}>{label}</div>
                {payload.map((p: any) => (
                    <div key={p.name} style={{ color: p.color }}>{p.name}: <strong>{p.value}</strong></div>
                ))}
            </div>
        )
    }

    return (
        <div>
            <div style={{ marginBottom: '28px' }}>
                <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                    Дашборд
                </h1>
                <p style={{ fontSize: '14px', color: '#475569' }}>
                    2025-2026 навчальний рік · ВІТІ імені Героїв Крут
                </p>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '28px' }}>
                {stats.map(({ label, value, icon: Icon, color, bg, border, sub }) => (
                    <div key={label} style={{ ...card, border: `1px solid ${border}`, background: bg }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '8px' }}>{label}</div>
                                <div style={{ fontSize: '34px', fontWeight: '700', color, lineHeight: 1 }}>{value}</div>
                                {sub && <div style={{ fontSize: '12px', color: '#475569', marginTop: '4px' }}>{sub}</div>}
                            </div>
                            <div style={{ padding: '10px', background: `${color}20`, borderRadius: '12px' }}>
                                <Icon size={22} color={color} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div style={card}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' }}>
                        Навантаження по кафедрах
                    </h3>
                    {deptData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#334155', padding: '40px', fontSize: '14px' }}>Немає даних</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={deptData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                                <Tooltip content={customTooltip} />
                                <Bar dataKey="навантаження" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )}
                </div>

                <div style={card}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' }}>
                        Види підготовки
                    </h3>
                    {levelData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#334155', padding: '40px', fontSize: '14px' }}>Немає даних</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie data={levelData} cx="50%" cy="50%" outerRadius={85} innerRadius={40} dataKey="value" paddingAngle={3}>
                                    {levelData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                </Pie>
                                <Tooltip content={customTooltip} />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Dept status */}
            <div style={card}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' }}>
                    Статус кафедр
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {departments?.map(dept => {
                        const deptDisc = disciplines?.filter(d => d.department_id === dept.id) || []
                        const workload = deptDisc.reduce((sum, d) => {
                            const calc = calculateWorkload({
                                lecture_hours: d.lecture_hours, group_hours: d.group_hours,
                                subgroup_hours: d.subgroup_hours, practice_hours: d.practice_hours,
                                course_works: d.course_works, control_works: d.control_works,
                                exams: d.exams, credits: d.credits,
                                lecture_streams: 1, group_count: 1, subgroup_count: 1, student_count: 25,
                            })
                            return sum + calc.total_hours
                        }, 0)
                        const needed = Math.round(workload / 600 * 10) / 10
                        const actual = staffStatus.filter(s => s.department_id === dept.id).length
                        const isOk = actual >= needed

                        return (
                            <div key={dept.id} style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                padding: '14px 18px',
                                borderRadius: '12px',
                                background: isOk ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                                border: `1px solid ${isOk ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}`,
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    {isOk
                                        ? <CheckCircle size={18} color="#22c55e" />
                                        : <AlertTriangle size={18} color="#ef4444" />
                                    }
                                    <div>
                    <span style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '14px' }}>
                      Кафедра № {dept.number}
                    </span>
                                        <span style={{ fontSize: '13px', color: '#475569', marginLeft: '10px' }}>
                      {dept.name}
                    </span>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '24px', fontSize: '13px', alignItems: 'center' }}>
                                    <span style={{ color: '#64748b' }}>Навантаження: <strong style={{ color: '#e2e8f0' }}>{Math.round(workload)} год</strong></span>
                                    <span style={{ color: '#64748b' }}>Потреба: <strong style={{ color: '#e2e8f0' }}>{needed} НПП</strong></span>
                                    <span style={{ color: '#64748b' }}>У штаті: <strong style={{ color: '#e2e8f0' }}>{actual} НПП</strong></span>
                                    <div style={{
                                        padding: '4px 12px',
                                        borderRadius: '20px',
                                        fontWeight: '600',
                                        fontSize: '12px',
                                        background: isOk ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)',
                                        color: isOk ? '#22c55e' : '#ef4444',
                                        border: `1px solid ${isOk ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                                    }}>
                                        {isOk ? 'Норма' : 'Нестача'}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    {!departments?.length && (
                        <div style={{ textAlign: 'center', color: '#334155', padding: '24px', fontSize: '14px' }}>
                            Немає даних
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}