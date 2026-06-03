import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getDepartments } from '../services/departments'
import { getStaff } from '../services/staff'
import { getDisciplines } from '../services/disciplines'
import { getDetailedAssignments } from '../services/workloadAssignments'
import { getDisciplineStatus, getStaffHourLimit } from '../utils/workload'
import { Users, BookOpen, Clock, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

const ACADEMIC_YEAR = '2025-2026'

const card: React.CSSProperties = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.08)',
}

const TYPE_LABELS: Record<string, string> = {
    lecture: 'Лекції', group: 'ГЗ', practical: 'ПЗ',
    course_work: 'Курсові', control_work: 'Контрольні',
    exam: 'Іспити', credit: 'Заліки',
}
const TYPE_COLORS: Record<string, string> = {
    lecture: '#3b82f6', group: '#22c55e', practical: '#8b5cf6',
    course_work: '#f97316', control_work: '#64748b',
    exam: '#ef4444', credit: '#f59e0b',
}
const PIE_COLORS = ['#f97316', '#3b82f6', '#22c55e', '#8b5cf6', '#06b6d4', '#f59e0b']

export default function DashboardPage() {
    const { data: departments } = useQuery({ queryKey: ['departments'], queryFn: getDepartments })
    const { data: staff } = useQuery({ queryKey: ['staff'], queryFn: () => getStaff() })
    const { data: disciplines } = useQuery({ queryKey: ['disciplines'], queryFn: () => getDisciplines() })

    const discIdsKey = useMemo(() => disciplines?.map(d => d.id).join(',') || '', [disciplines])
    const discIds = useMemo(() => disciplines?.map(d => d.id) || [], [disciplines])

    const { data: allAssignments = [] } = useQuery({
        queryKey: ['detailed-assignments-all', discIdsKey],
        queryFn: () => getDetailedAssignments(discIds),
        enabled: discIds.length > 0,
    })

    // Staff hours
    const staffHoursMap = useMemo(() => {
        const map: Record<string, number> = {}
        for (const a of allAssignments) {
            map[a.staff_id] = Math.round(((map[a.staff_id] || 0) + a.hours) * 100) / 100
        }
        return map
    }, [allAssignments])

    // Discipline statuses
    const discStatuses = useMemo(() => {
        let full = 0, partial = 0, none = 0
        for (const d of disciplines || []) {
            const s = getDisciplineStatus(d, allAssignments)
            if (s === 'full') full++
            else if (s === 'partial') partial++
            else none++
        }
        return { full, partial, none }
    }, [disciplines, allAssignments])

    // Hours by type
    const typeHoursData = useMemo(() => {
        const map: Record<string, number> = {}
        for (const a of allAssignments) {
            map[a.workload_type] = Math.round(((map[a.workload_type] || 0) + a.hours) * 10) / 10
        }
        return Object.entries(map)
            .filter(([, v]) => v > 0)
            .map(([k, v]) => ({ name: TYPE_LABELS[k] || k, value: v, color: TYPE_COLORS[k] || '#9ca3af' }))
            .sort((a, b) => b.value - a.value)
    }, [allAssignments])

    const totalAssigned = Math.round(allAssignments.reduce((s, a) => s + a.hours, 0))
    const totalDiscHours = Math.round((disciplines || []).reduce((s, d) => s + (d.total_hours || 0), 0))
    const assignPercent = totalDiscHours > 0 ? Math.round((totalAssigned / totalDiscHours) * 100) : 0

    // Staff chart rows
    const staffChartData = useMemo(() => (staff || []).map(s => {
        const used = Math.round((staffHoursMap[s.id] || 0) * 100) / 100
        const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)
        const pct = Math.min(Math.round((used / limit) * 100), 100)
        const isOver = used > limit
        const isWarn = pct > 80 && !isOver
        return {
            id: s.id,
            name: s.full_name.split(' ')[0] + ' ' + (s.full_name.split(' ')[1]?.[0] || '') + '.',
            used, limit, pct, isOver, isWarn,
            color: isOver ? '#ef4444' : isWarn ? '#f59e0b' : '#22c55e',
        }
    }).sort((a, b) => b.used - a.used), [staff, staffHoursMap])

    // Education level breakdown
    const levelData = useMemo(() => {
        const map: Record<string, number> = {}
        for (const d of disciplines || []) {
            const level = d.education_level.replace(/^\d+_/, '')
            map[level] = (map[level] || 0) + 1
        }
        return Object.entries(map).map(([name, value]) => ({ name, value }))
    }, [disciplines])

    const statusPieData = [
        { name: 'Повністю', value: discStatuses.full, color: '#22c55e' },
        { name: 'Частково', value: discStatuses.partial, color: '#f59e0b' },
        { name: 'Без викладача', value: discStatuses.none, color: '#ef4444' },
    ].filter(d => d.value > 0)

    const pieTooltip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null
        const p = payload[0]
        return (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                <span style={{ color: p.payload.color, fontWeight: '600' }}>{p.name}: {p.value}</span>
            </div>
        )
    }

    const stats = [
        {
            label: 'НПП у штаті', value: staff?.length || 0, icon: Users, color: '#3b82f6', bg: '#eff6ff',
            sub: staffChartData.filter(s => s.isOver).length > 0
                ? `${staffChartData.filter(s => s.isOver).length} перевантажено`
                : 'Всі в нормі',
            subColor: staffChartData.filter(s => s.isOver).length > 0 ? '#dc2626' : '#16a34a',
        },
        {
            label: 'Дисциплін', value: disciplines?.length || 0, icon: BookOpen, color: '#22c55e', bg: '#f0fdf4',
            sub: `${discStatuses.full} повністю розподілено`,
            subColor: '#16a34a',
        },
        {
            label: 'Призначено годин', value: totalAssigned, icon: Clock, color: '#f97316', bg: '#fff7ed',
            sub: `з ${totalDiscHours} загальних`,
            subColor: '#9ca3af',
        },
        {
            label: 'Покриття', value: `${assignPercent}%`, icon: TrendingUp, color: '#8b5cf6', bg: '#f5f3ff',
            sub: discStatuses.none > 0 ? `${discStatuses.none} без викладача` : 'Всі дисципліни охоплені',
            subColor: discStatuses.none > 0 ? '#dc2626' : '#16a34a',
        },
    ]

    return (
        <div>
            {/* Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Дашборд</h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>
                    {ACADEMIC_YEAR} навчальний рік · ВІТІ імені Героїв Крут
                </p>
            </div>

            {/* KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
                {stats.map(({ label, value, icon: Icon, color, bg, sub, subColor }) => (
                    <div key={label} style={card}>
                        <div style={{ padding: '20px 24px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
                                <div style={{ padding: '10px', background: bg, borderRadius: '12px' }}>
                                    <Icon size={20} color={color} />
                                </div>
                                <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: '500', textAlign: 'right', maxWidth: '90px' }}>{label}</span>
                            </div>
                            <div style={{ fontSize: '30px', fontWeight: '700', color: '#111827', lineHeight: 1, marginBottom: '5px' }}>{value}</div>
                            <div style={{ fontSize: '12px', color: subColor, fontWeight: '500' }}>{sub}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main grid: staff bars + right charts */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: '20px', marginBottom: '20px' }}>

                {/* Staff workload bars */}
                <div style={{ ...card, padding: '24px' }}>
                    <div style={{ marginBottom: '16px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>Навантаження НПП</h3>
                        <p style={{ fontSize: '12px', color: '#9ca3af' }}>Розподілені години · норма 600 год</p>
                    </div>

                    {staffChartData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#d1d5db', padding: '40px', fontSize: '14px' }}>Немає даних</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                            {/* Legend */}
                            <div style={{ display: 'flex', gap: '16px', marginBottom: '6px', paddingLeft: '120px' }}>
                                {[['#22c55e', 'Норма'], ['#f59e0b', '>80%'], ['#ef4444', 'Перевищено']].map(([c, l]) => (
                                    <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: c }} />
                                        <span style={{ fontSize: '11px', color: '#9ca3af' }}>{l}</span>
                                    </div>
                                ))}
                            </div>
                            {staffChartData.map(s => (
                                <div key={s.id} style={{ display: 'grid', gridTemplateColumns: '116px 1fr 64px', alignItems: 'center', gap: '10px' }}>
                                    <div style={{ fontSize: '12px', color: '#374151', fontWeight: '500', textAlign: 'right', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {s.name}
                                    </div>
                                    <div style={{ height: '20px', background: '#f3f4f6', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
                                        <div style={{
                                            height: '100%',
                                            width: s.used === 0 ? '0%' : `${Math.max(s.pct, 2)}%`,
                                            background: s.color,
                                            borderRadius: '4px',
                                            transition: 'width 0.4s ease',
                                        }} />
                                        {s.pct >= 30 && (
                                            <span style={{
                                                position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)',
                                                fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.85)',
                                            }}>
                                                {s.pct}%
                                            </span>
                                        )}
                                    </div>
                                    <div style={{ fontSize: '12px', fontWeight: '700', color: s.isOver ? '#dc2626' : s.isWarn ? '#d97706' : '#6b7280', textAlign: 'right' }}>
                                        {s.used}г
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

                    {/* Discipline status donut */}
                    <div style={{ ...card, padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>Статус дисциплін</h3>
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '8px' }}>Стан розподілу навантаження</p>
                        {statusPieData.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#d1d5db', padding: '20px', fontSize: '13px' }}>Немає даних</div>
                        ) : (
                            <>
                                <ResponsiveContainer width="100%" height={150}>
                                    <PieChart>
                                        <Pie data={statusPieData} cx="50%" cy="50%" outerRadius={62} innerRadius={36} dataKey="value" paddingAngle={3}>
                                            {statusPieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                                        </Pie>
                                        <Tooltip content={pieTooltip} />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                    {statusPieData.map(d => (
                                        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: d.color }} />
                                                <span style={{ fontSize: '12px', color: '#374151' }}>{d.name}</span>
                                            </div>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: d.color }}>{d.value}</span>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Type hours breakdown */}
                    <div style={{ ...card, padding: '20px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#111827', marginBottom: '2px' }}>Типи занять</h3>
                        <p style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '10px' }}>Розподіл призначених годин</p>
                        {typeHoursData.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#d1d5db', padding: '20px', fontSize: '13px' }}>Немає даних</div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {typeHoursData.map(d => {
                                    const pct = totalAssigned > 0 ? Math.round((d.value / totalAssigned) * 100) : 0
                                    return (
                                        <div key={d.name}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                                                <span style={{ fontSize: '12px', color: '#374151', fontWeight: '500' }}>{d.name}</span>
                                                <span style={{ fontSize: '11px', color: d.color, fontWeight: '700' }}>{d.value}г · {pct}%</span>
                                            </div>
                                            <div style={{ height: '5px', background: '#f3f4f6', borderRadius: '3px', overflow: 'hidden' }}>
                                                <div style={{ height: '100%', width: `${pct}%`, background: d.color, borderRadius: '3px', transition: 'width 0.4s' }} />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom: dept status + education levels */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

                {/* Dept status */}
                <div style={{ ...card, padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '16px' }}>Статус кафедр</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {(departments || []).length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#d1d5db', padding: '24px', fontSize: '14px' }}>Немає даних</div>
                        ) : (departments || []).map(dept => {
                            const deptDiscs = (disciplines || []).filter(d => d.department_id === dept.id)
                            let full = 0, partial = 0, none = 0
                            for (const d of deptDiscs) {
                                const s = getDisciplineStatus(d, allAssignments)
                                if (s === 'full') full++
                                else if (s === 'partial') partial++
                                else none++
                            }
                            const totalD = deptDiscs.length
                            const pct = totalD > 0 ? Math.round((full / totalD) * 100) : 0
                            const deptStaffCount = (staff || []).filter(s => s.department_id === dept.id).length
                            return (
                                <div key={dept.id} style={{ padding: '14px 16px', borderRadius: '10px', background: '#fafafa', border: '1px solid #f3f4f6' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            {none === 0 && partial === 0
                                                ? <CheckCircle size={14} color="#16a34a" />
                                                : none > 0 ? <AlertTriangle size={14} color="#f59e0b" /> : <CheckCircle size={14} color="#22c55e" />
                                            }
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>Каф. №{dept.number}</span>
                                            <span style={{ fontSize: '12px', color: '#6b7280' }}>{dept.name}</span>
                                        </div>
                                        <span style={{ fontSize: '13px', fontWeight: '700', color: pct === 100 ? '#16a34a' : '#d97706' }}>{pct}%</span>
                                    </div>
                                    <div style={{ height: '5px', background: '#e5e7eb', borderRadius: '3px', overflow: 'hidden', marginBottom: '8px' }}>
                                        <div style={{ height: '100%', width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#f59e0b', borderRadius: '3px', transition: 'width 0.4s' }} />
                                    </div>
                                    <div style={{ display: 'flex', gap: '12px', fontSize: '11px' }}>
                                        <span style={{ color: '#16a34a', fontWeight: '500' }}>✓ {full} повністю</span>
                                        <span style={{ color: '#d97706', fontWeight: '500' }}>◑ {partial} частково</span>
                                        <span style={{ color: '#dc2626', fontWeight: '500' }}>○ {none} без НПП</span>
                                        <span style={{ color: '#9ca3af', marginLeft: 'auto' }}>{deptStaffCount} НПП</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Education levels */}
                <div style={{ ...card, padding: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>Рівні підготовки</h3>
                    <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '12px' }}>Кількість дисциплін по рівнях</p>
                    {levelData.length === 0 ? (
                        <div style={{ textAlign: 'center', color: '#d1d5db', padding: '40px', fontSize: '14px' }}>Немає даних</div>
                    ) : (
                        <>
                            <ResponsiveContainer width="100%" height={180}>
                                <PieChart>
                                    <Pie data={levelData} cx="50%" cy="50%" outerRadius={72} innerRadius={38} dataKey="value" paddingAngle={3}>
                                        {levelData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                                    </Pie>
                                    <Tooltip content={pieTooltip} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                                {levelData.map((d, i) => {
                                    const pct = disciplines?.length ? Math.round((d.value / disciplines.length) * 100) : 0
                                    return (
                                        <div key={d.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                                <span style={{ fontSize: '12px', color: '#374151' }}>{d.name}</span>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                <span style={{ fontSize: '11px', color: '#9ca3af' }}>{pct}%</span>
                                                <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827', minWidth: '20px', textAlign: 'right' }}>{d.value}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
