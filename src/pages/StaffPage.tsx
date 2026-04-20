import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStaff, createStaff, deleteStaff } from '../services/staff'
import { getDepartments } from '../services/departments'
import { Users, Plus, Trash2, X, Save, Shield, User } from 'lucide-react'
import { getStaffHourLimit } from '../utils/workload'

const POSITIONS = [
    'Начальник кафедри', 'Заступник начальника кафедри',
    'Професор', 'Доцент', 'Старший викладач', 'Викладач', 'Асистент',
]
const RATES = [0.2, 0.25, 0.5, 0.75, 1.0, 1.5]

const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

const inputStyle = {
    padding: '10px 14px',
    background: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#111827',
    outline: 'none',
    width: '100%',
}

const label = {
    display: 'block' as const,
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px',
}

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

    if (isLoading) return (
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '80px' }}>Завантаження...</div>
    )

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                        Науково-педагогічні працівники
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Облік НПП та лімітів навчального навантаження
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{ padding: '10px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Plus size={16} /> Додати НПП
                </button>
            </div>

            {showForm && (
                <div style={{ ...card, padding: '24px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                        Новий науково-педагогічний працівник
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={label}>ПІБ</label>
                            <input style={inputStyle} value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Прізвище Ім'я По батькові" />
                        </div>
                        <div>
                            <label style={label}>Кафедра</label>
                            <select style={inputStyle} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                                <option value="">Оберіть кафедру</option>
                                {departments?.map(d => <option key={d.id} value={d.id}>№ {d.number} — {d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={label}>Посада</label>
                            <select style={inputStyle} value={form.position} onChange={e => setForm({ ...form, position: e.target.value })}>
                                {POSITIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={label}>Ставка</label>
                            <select style={inputStyle} value={form.rate} onChange={e => setForm({ ...form, rate: Number(e.target.value) })}>
                                {RATES.map(r => <option key={r} value={r}>{r} ставки</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={label}>Тип</label>
                            <select style={inputStyle} value={form.is_military ? 'true' : 'false'} onChange={e => setForm({ ...form, is_military: e.target.value === 'true' })}>
                                <option value="true">Військовослужбовець</option>
                                <option value="false">Цивільний працівник</option>
                            </select>
                        </div>
                        <div>
                            <label style={label}>Вислуга (років)</label>
                            <input style={inputStyle} type="number" value={form.service_years} onChange={e => setForm({ ...form, service_years: Number(e.target.value) })} min={0} />
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={!form.full_name || !form.department_id || createMutation.isPending}
                            style={{ padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Save size={16} />
                            {createMutation.isPending ? 'Збереження...' : 'Зберегти'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{ padding: '10px 16px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <X size={16} /> Скасувати
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {staff?.length === 0 && (
                    <div style={{ ...card, padding: '64px', textAlign: 'center' }}>
                        <Users size={48} style={{ margin: '0 auto 16px', opacity: 0.2, color: '#9ca3af' }} />
                        <div style={{ fontSize: '15px', color: '#9ca3af' }}>НПП ще немає</div>
                        <div style={{ fontSize: '13px', marginTop: '4px', color: '#d1d5db' }}>Додайте першого працівника</div>
                    </div>
                )}

                {staff?.map(s => {
                    const dept = departments?.find(d => d.id === s.department_id)
                    const limit = getStaffHourLimit(s.rate, s.is_military, s.service_years)

                    return (
                        <div key={s.id} style={{ ...card, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                <div style={{
                                    width: '42px', height: '42px',
                                    background: s.is_military ? '#eff6ff' : '#f9fafb',
                                    border: `1px solid ${s.is_military ? '#bfdbfe' : '#e5e7eb'}`,
                                    borderRadius: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {s.is_military
                                        ? <Shield size={20} color="#3b82f6" />
                                        : <User size={20} color="#9ca3af" />
                                    }
                                </div>
                                <div>
                                    <div style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>
                                        {s.full_name}
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                        {s.position} · Кафедра № {dept?.number} · {s.rate} ставки · {s.is_military ? `вислуга ${s.service_years} р.` : 'цивільний'}
                                    </div>
                                    <div style={{ fontSize: '12px', color: '#f97316', marginTop: '4px', fontWeight: '500' }}>
                                        Ліміт навантаження: {limit} год/рік
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteMutation.mutate(s.id)}
                                style={{ padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}