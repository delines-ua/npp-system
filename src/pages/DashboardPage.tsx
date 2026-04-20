import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getDisciplines } from '../services/disciplines'
import { getAssignments } from '../services/assignments'
import { calculateWorkload, getStaffHourLimit } from '../utils/workload'
import { exportInstitutePDF } from '../utils/reports'
import { Building2, Users, BookOpen, TrendingUp, AlertTriangle, CheckCircle, BarChart3, Table2, FileDown } from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    PieChart, Pie, Cell, ResponsiveContainer, Legend
} from 'recharts'

const COLORS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#06b6d4', '#f59e0b']

const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

const ViewToggle = ({ view, setView }: { view: 'chart' | 'table', setView: (v: 'chart' | 'table') => void }) => (
    <div style={{ display: 'flex', background: '#f3f4f6', borderRadius: '8px', padding: '3px', gap: '2px' }}>
        {[
            { v: 'chart', icon: BarChart3, label: 'Графік' },
            { v: 'table', icon: Table2, label: 'Таблиця' },
        ].map(({ v, icon: Icon, label }) => (
            <button
                key={v}
                onClick={() => setView(v as 'chart' | 'table')}
                style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    cursor: 'pointer',
                    fontSize: '12px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: view === v ? '#ffffff' : 'transparent',
                    color: view === v ? '#f97316' : '#6b7280',
                    boxShadow: view === v ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.2s',
                }}
            >
                <Icon size={14} /> {label}
            </button>
        ))}
    </div>
)

export default function DashboardPage() {
    const [workloadView, setWorkloadView] = useState<'chart' | 'table'>('chart')
    const [staffView, setStaffView] = useState<'chart' | 'table'>('chart')

    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
    const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: () => getStaff() })
    const { data: disciplines } = useQuery({ queryKey: ['disciplines'], queryFn: () => getDisciplines() })
    const { data: assignments } = useQuery({ queryKey: ['assignments'], queryFn: () => getAssignments() })

    const getDiscWorkload = (d: any) => {
        if (d.total_hours && d.total_hours > 0) return d.total_hours
        return calculateWorkload({
            lecture_hours: d.lecture_hours, group_hours: d.group_hours,
            subgroup_hours: d.subgroup_hours, practice_hours: d.practice_hours,
            course_works: d.course_works, control_works: d.control_works,
            exams: d.exams, credits: d.credits,
            lecture_streams: 1, group_count: 1, subgroup_count: 1, student_count: 25,
        }).total_hours
    }

    const totalWorkload = disciplines?.reduce((sum, d) => sum + getDiscWorkload(d), 0) || 0
    const requiredStaff = Math.round((totalWorkload / 600) * 10) / 10

    const deptData = departments?.map(dept => {
        const deptDisc = disciplines?.filter(d => d.department_id === dept.id) || []
        const planned = Math.round(deptDisc.reduce((sum, d) => sum + getDiscWorkload(d), 0))
        const deptStaff = staff?.filter(s => s.department_id === dept.id) || []
        const deptAssignments = assignments?.filter(a => deptStaff.some(s => s.id === a.staff_id)) || []
        const actual = Math.round(deptAssignments.reduce((sum, a) => sum + (a.actual_hours || 0), 0))
        const needed = Math.round(planned / 600 * 10) / 10
        const actual_staff = deptStaff.length
        return { name: `№${dept.number}`, fullName: dept.name, planned, actual, needed, actual_staff, isOk: actual_staff >= needed }
    }) || []

    const staffData = staff?.map(s => {
        const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
        const staffAssignments = assignments?.filter(a => a.staff_id === s.id) || []
        const planned = Math.round(staffAssignments.reduce((sum, a) => sum + a.planned_hours, 0))
        const actual = Math.round(staffAssignments.reduce((sum, a) => sum + (a.actual_hours || 0), 0))
        const dept = departments?.find(d => d.id === s.department_id)
        const percent = Math.round((planned / limit) * 100)
        const isOver = planned > limit
        return {
            name: s.full_name.split(' ')[0] + ' ' + (s.full_name.split(' ')[1]?.[0] || '') + '.',
            fullName: s.full_name, position: s.position, dept: `№${dept?.number}`,
            limit, planned, actual, percent, isOver,
        }
    }) || []

    const levelData = disciplines?.reduce((acc, d) => {
        const level = d.education_level.replace(/^\d+_/, '').replace(' (очна)', '').replace(' (заочна)', ' (заочна)')
        const ex = acc.find((a: any) => a.name === level)
        if (ex) ex.value++
        else acc.push({ name: level, value: 1 })
        return acc
    }, [] as any[]) || []

    const stats = [
        { label: 'Кафедр', value: departments?.length || 0, icon: Building2, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
        { label: 'НПП у штаті', value: staff?.length || 0, icon: Users, color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
        { label: 'Дисциплін', value: disciplines?.length || 0, icon: BookOpen, color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
        { label: 'Потреба в НПП', value: requiredStaff, icon: TrendingUp, color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe', sub: `${Math.round(totalWorkload)} год загалом` },
    ]

    const customTooltip = ({ active, payload, label }: any) => {
        if (!active || !payload?.length) return null
        return (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#374151', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <div style={{ marginBottom: '6px', color: '#6b7280', fontWeight: '600' }}>{label}</div>
                {payload.map((p: any) => (
                    <div key={p.name} style={{ color: p.color, marginBottom: '2px' }}>
                        {p.name}: <strong>{p.value}</strong>
                    </div>
                ))}
            </div>
        )
    }

    return (
        <div>
            {/* Заголовок */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                        Дашборд
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        2025-2026 навчальний рік · ВІТІ імені Героїв Крут
                    </p>
                </div>
                <button
                    onClick={() => exportInstitutePDF(
                        departments || [], staff || [], disciplines || [], assignments || [],
                        getDiscWorkload, getStaffHourLimit
                    )}
                    style={{
                        padding: '10px 20px',
                        background: '#fff7ed',
                        border: '1px solid #fed7aa',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        color: '#f97316',
                    }}
                >
                    <FileDown size={16} /> Експорт PDF
                </button>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {stats.map(({ label, value, icon: Icon, color, sub }) => (
                    <div key={label} style={{ ...card }}>
                        <div style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                                <div style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '6px' }}>{label}</div>
                                <div style={{ fontSize: '32px', fontWeight: '700', color: '#111827', lineHeight: 1 }}>{value}</div>
                                {sub && <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '4px' }}>{sub}</div>}
                            </div>
                            <div style={{ padding: '10px', background: `${color}15`, borderRadius: '12px' }}>
                                <Icon size={22} color={color} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Навантаження по кафедрах */}
            <div style={{ ...card, padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                            Навантаження по кафедрах
                        </h3>
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>Планове vs фактичне (год)</p>
                    </div>
                    <ViewToggle view={workloadView} setView={setWorkloadView} />
                </div>

                {workloadView === 'chart' ? (
                    deptData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#d1d5db', padding: '40px' }}>Немає даних</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={deptData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <Tooltip content={customTooltip} />
                                <Legend wrapperStyle={{ fontSize: '13px', color: '#6b7280' }} />
                                <Bar dataKey="planned" name="Планове" fill="#f97316" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="actual" name="Фактичне" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                            <tr style={{ borderBottom: '1px solid #f3f4f6' }}>
                                {['Кафедра', 'Назва', 'Планове (год)', 'Фактичне (год)', 'Різниця', 'Потреба НПП', 'У штаті', 'Статус'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#9ca3af', fontWeight: '600', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {deptData.map((d, i) => {
                                const diff = d.actual - d.planned
                                return (
                                    <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                                        <td style={{ padding: '12px', color: '#111827', fontWeight: '600' }}>{d.name}</td>
                                        <td style={{ padding: '12px', color: '#6b7280' }}>{d.fullName}</td>
                                        <td style={{ padding: '12px', color: '#f97316', fontWeight: '600' }}>{d.planned}</td>
                                        <td style={{ padding: '12px', color: '#22c55e', fontWeight: '600' }}>{d.actual}</td>
                                        <td style={{ padding: '12px', color: diff >= 0 ? '#22c55e' : '#ef4444', fontWeight: '600' }}>
                                            {diff >= 0 ? '+' : ''}{diff}
                                        </td>
                                        <td style={{ padding: '12px', color: '#374151' }}>{d.needed}</td>
                                        <td style={{ padding: '12px', color: '#374151' }}>{d.actual_staff}</td>
                                        <td style={{ padding: '12px' }}>
                                            <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: d.isOk ? '#f0fdf4' : '#fef2f2', color: d.isOk ? '#16a34a' : '#dc2626', border: `1px solid ${d.isOk ? '#bbf7d0' : '#fecaca'}` }}>
                                                {d.isOk ? 'Норма' : 'Нестача'}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                            {deptData.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#d1d5db' }}>Немає даних</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Навантаження по НПП */}
            <div style={{ ...card, padding: '24px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '2px' }}>
                            Навантаження по НПП
                        </h3>
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>План vs факт vs ліміт</p>
                    </div>
                    <ViewToggle view={staffView} setView={setStaffView} />
                </div>

                {staffView === 'chart' ? (
                    staffData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#d1d5db', padding: '40px' }}>Немає даних</div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={staffData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
                                <Tooltip content={customTooltip} />
                                <Legend wrapperStyle={{ fontSize: '13px', color: '#6b7280' }} />
                                <Bar dataKey="limit" name="Ліміт" fill="#e5e7eb" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="planned" name="Планове" fill="#f97316" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="actual" name="Фактичне" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    )
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                            <thead>
                            <tr>
                                {['ПІБ', 'Посада', 'Кафедра', 'Ліміт', 'Планове', 'Фактичне', 'Виконання', 'Статус'].map(h => (
                                    <th key={h} style={{ padding: '10px 12px', textAlign: 'left', color: '#9ca3af', fontWeight: '600', borderBottom: '1px solid #f3f4f6', whiteSpace: 'nowrap' }}>
                                        {h}
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody>
                            {staffData.map((s, i) => (
                                <tr key={i} style={{ borderBottom: '1px solid #f9fafb' }}>
                                    <td style={{ padding: '12px', color: '#111827', fontWeight: '600' }}>{s.fullName}</td>
                                    <td style={{ padding: '12px', color: '#6b7280' }}>{s.position}</td>
                                    <td style={{ padding: '12px', color: '#6b7280' }}>{s.dept}</td>
                                    <td style={{ padding: '12px', color: '#9ca3af' }}>{s.limit}</td>
                                    <td style={{ padding: '12px', color: '#f97316', fontWeight: '600' }}>{s.planned}</td>
                                    <td style={{ padding: '12px', color: '#22c55e', fontWeight: '600' }}>{s.actual}</td>
                                    <td style={{ padding: '12px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <div style={{ flex: 1, height: '6px', background: '#f3f4f6', borderRadius: '3px', minWidth: '60px' }}>
                                                <div style={{ height: '6px', width: `${Math.min(s.percent, 100)}%`, background: s.isOver ? '#ef4444' : s.percent > 80 ? '#f59e0b' : '#22c55e', borderRadius: '3px' }} />
                                            </div>
                                            <span style={{ fontSize: '12px', color: s.isOver ? '#ef4444' : '#6b7280', minWidth: '36px' }}>
                                                {s.percent}%
                                            </span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '12px' }}>
                                        <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: '600', background: s.isOver ? '#fef2f2' : '#f0fdf4', color: s.isOver ? '#dc2626' : '#16a34a', border: `1px solid ${s.isOver ? '#fecaca' : '#bbf7d0'}` }}>
                                            {s.isOver ? 'Перевищено' : 'Норма'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                            {staffData.length === 0 && (
                                <tr><td colSpan={8} style={{ padding: '32px', textAlign: 'center', color: '#d1d5db' }}>Немає даних</td></tr>
                            )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Нижній ряд */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div style={card}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                            Види підготовки
                        </h3>
                        {levelData.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#d1d5db', padding: '40px' }}>Немає даних</div>
                        ) : (
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie data={levelData} cx="50%" cy="50%" outerRadius={80} innerRadius={35} dataKey="value" paddingAngle={3}>
                                        {levelData.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={customTooltip} />
                                    <Legend wrapperStyle={{ fontSize: '12px', color: '#6b7280' }} />
                                </PieChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </div>

                <div style={card}>
                    <div style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                            Статус кафедр
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {deptData.map((d, i) => (
                                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: '10px', background: d.isOk ? '#f0fdf4' : '#fef2f2', border: `1px solid ${d.isOk ? '#bbf7d0' : '#fecaca'}` }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                        {d.isOk ? <CheckCircle size={15} color="#16a34a" /> : <AlertTriangle size={15} color="#dc2626" />}
                                        <span style={{ fontSize: '13px', fontWeight: '600', color: '#111827' }}>Каф. {d.name}</span>
                                        <span style={{ fontSize: '12px', color: '#6b7280' }}>{d.fullName}</span>
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                                        <span style={{ color: '#f97316', fontWeight: '600' }}>{d.planned} год</span>
                                        <span style={{ color: '#9ca3af' }}>→</span>
                                        <span style={{ color: '#6b7280' }}>{d.needed} НПП</span>
                                    </div>
                                </div>
                            ))}
                            {deptData.length === 0 && (
                                <div style={{ textAlign: 'center', color: '#d1d5db', padding: '24px', fontSize: '14px' }}>
                                    Немає даних
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}