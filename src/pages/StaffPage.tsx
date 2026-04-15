import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaff, createStaff, deleteStaff } from '../services/staff'
import { getDepartments } from '../services/departments'

const POSITIONS = [
    'Начальник кафедри',
    'Заступник начальника кафедри',
    'Професор',
    'Доцент',
    'Старший викладач',
    'Викладач',
    'Асистент',
]

const RATES = [0.2, 0.25, 0.5, 0.75, 1.0, 1.5]

export default function StaffPage() {
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState({
        department_id: '',
        full_name: '',
        position: 'Викладач',
        is_military: true,
        service_years: 0,
        rate: 1.0,
    })

    const { data: staff, isLoading } = useQuery({
        queryKey: ['staff'],
        queryFn: () => getStaff(),
    })

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    })

    const createMutation = useMutation({
        mutationFn: () => createStaff(form),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['staff'] })
            setForm({ department_id: '', full_name: '', position: 'Викладач', is_military: true, service_years: 0, rate: 1.0 })
            setShowForm(false)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteStaff,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff'] }),
    })

    const getHourLimit = (rate: number, is_military: boolean, service_years: number) => {
        if (!is_military) return Math.round(1548 * rate)
        let base = 1840
        if (service_years >= 20) base = 1720
        else if (service_years >= 15) base = 1760
        else if (service_years >= 10) base = 1800
        return Math.round(base * rate)
    }

    const inputStyle = {
        padding: '8px 12px',
        border: '1px solid #e2e8f0',
        borderRadius: '6px',
        fontSize: '14px',
        width: '100%',
    }

    const labelStyle = {
        display: 'block' as const,
        fontSize: '13px',
        color: '#64748b',
        marginBottom: '4px',
    }

    if (isLoading) return <p>Завантаження...</p>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>НПП</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                >
                    + Додати НПП
                </button>
            </div>

            {showForm && (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Новий науково-педагогічний працівник</h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>ПІБ</label>
                            <input style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Прізвище Ім'я По батькові" />
                        </div>
                        <div>
                            <label style={labelStyle}>Кафедра</label>
                            <select style={inputStyle} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                                <option value="">Оберіть кафедру</option>
                                {departments?.map(d => (
                                    <option key={d.id} value={d.id}>№ {d.number} — {d.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Посада</label>
                            <select style={inputStyle} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Ставка</label>
                            <select style={inputStyle} value={form.rate} onChange={e => setForm({ ...form, rate: Number(e.target.value) })}>
                                {RATES.map(r => <option key={r} value={r}>{r} ставки</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Тип</label>
                            <select style={inputStyle} value={form.is_military ? 'true' : 'false'} onChange={e => setForm({ ...form, is_military: e.target.value === 'true' })}>
                                <option value="true">Військовослужбовець</option>
                                <option value="false">Цивільний працівник</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Вислуга (років)</label>
                            <input style={inputStyle} type="number" value={form.service_years} onChange={e => setForm({ ...form, service_years: Number(e.target.value) })} min={0} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={!form.full_name || !form.department_id || createMutation.isPending}
                            style={{ padding: '8px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
                        >
                            {createMutation.isPending ? 'Збереження...' : 'Зберегти'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{ padding: '8px 16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}
                        >
                            Скасувати
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {staff?.length === 0 && (
                    <div style={{ background: '#fff', padding: '48px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
                        НПП ще немає. Додайте першого працівника.
                    </div>
                )}
                {staff?.map(s => {
                    const dept = departments?.find(d => d.id === s.department_id)
                    const limit = getHourLimit(s.rate, s.is_military, s.service_years)
                    return (
                        <div key={s.id} style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '15px', color: '#1e293b' }}>{s.full_name}</div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                    {s.position} · Кафедра № {dept?.number} · {s.rate} ставки · {s.is_military ? `вислуга ${s.service_years} р.` : 'цивільний'}
                                </div>
                                <div style={{ fontSize: '13px', color: '#3b82f6', marginTop: '2px' }}>
                                    Ліміт: {limit} год/рік
                                </div>
                            </div>
                            <button
                                onClick={() => deleteMutation.mutate(s.id)}
                                style={{ padding: '6px 12px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '13px' }}
                            >
                                Видалити
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}