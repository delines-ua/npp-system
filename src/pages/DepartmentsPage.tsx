import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments, createDepartment, deleteDepartment } from '../services/departments'
import { Building2, Plus, Trash2, X, Save } from 'lucide-react'

const card = {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
}

const input = {
    padding: '10px 14px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#e2e8f0',
    outline: 'none',
    width: '100%',
}

const btn = (color: string) => ({
    padding: '10px 20px',
    background: color,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
})

export default function DepartmentsPage() {
    const queryClient = useQueryClient()
    const [name, setName] = useState('')
    const [number, setNumber] = useState('')
    const [showForm, setShowForm] = useState(false)

    const { data: departments, isLoading } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    })

    const createMutation = useMutation({
        mutationFn: () => createDepartment(name, number),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] })
            setName('')
            setNumber('')
            setShowForm(false)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteDepartment,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['departments'] }),
    })

    if (isLoading) return (
        <div style={{ textAlign: 'center', color: '#475569', padding: '80px', fontSize: '14px' }}>
            Завантаження...
        </div>
    )

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                        Кафедри
                    </h1>
                    <p style={{ fontSize: '14px', color: '#475569' }}>
                        Управління кафедрами інституту
                    </p>
                </div>
                <button onClick={() => setShowForm(!showForm)} style={btn('#2563eb')}>
                    <Plus size={16} />
                    Додати кафедру
                </button>
            </div>

            {showForm && (
                <div style={{ ...card, padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' }}>
                        Нова кафедра
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ width: '160px' }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                                Номер
                            </label>
                            <input
                                style={input}
                                value={number}
                                onChange={e => setNumber(e.target.value)}
                                placeholder="наприклад: 11"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                                Назва кафедри
                            </label>
                            <input
                                style={input}
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Кафедра комп'ютерних наук та інтелектуальних технологій"
                            />
                        </div>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={!name || !number || createMutation.isPending}
                            style={btn('#22c55e')}
                        >
                            <Save size={16} />
                            {createMutation.isPending ? 'Збереження...' : 'Зберегти'}
                        </button>
                        <button onClick={() => setShowForm(false)} style={btn('#374151')}>
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {departments?.length === 0 && (
                    <div style={{ ...card, padding: '64px', textAlign: 'center', color: '#374151' }}>
                        <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <div style={{ fontSize: '15px' }}>Кафедр ще немає</div>
                        <div style={{ fontSize: '13px', marginTop: '4px' }}>Додайте першу кафедру</div>
                    </div>
                )}

                {departments?.map(dept => (
                    <div key={dept.id} style={{
                        ...card,
                        padding: '18px 24px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'border-color 0.2s',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '42px',
                                height: '42px',
                                background: 'rgba(37,99,235,0.15)',
                                border: '1px solid rgba(37,99,235,0.2)',
                                borderRadius: '10px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                                <Building2 size={20} color="#3b82f6" />
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '15px', color: '#f1f5f9' }}>
                                    Кафедра № {dept.number}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                    {dept.name}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => deleteMutation.mutate(dept.id)}
                            style={{
                                padding: '8px',
                                background: 'rgba(239,68,68,0.1)',
                                border: '1px solid rgba(239,68,68,0.2)',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                color: '#ef4444',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}