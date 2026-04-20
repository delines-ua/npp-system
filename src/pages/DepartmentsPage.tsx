import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments, createDepartment, deleteDepartment } from '../services/departments'
import { Building2, Plus, Trash2, X, Save } from 'lucide-react'

const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

const input = {
    padding: '10px 14px',
    background: '#f9fafb',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#111827',
    outline: 'none',
    width: '100%',
}

const labelStyle = {
    display: 'block' as const,
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px',
}

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
        <div style={{ textAlign: 'center', color: '#9ca3af', padding: '80px', fontSize: '14px' }}>
            Завантаження...
        </div>
    )

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                        Кафедри
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Управління кафедрами інституту
                    </p>
                </div>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{ padding: '10px 20px', background: '#f97316', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                    <Plus size={16} />
                    Додати кафедру
                </button>
            </div>

            {showForm && (
                <div style={{ ...card, padding: '24px', marginBottom: '20px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '20px' }}>
                        Нова кафедра
                    </h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div style={{ width: '160px' }}>
                            <label style={labelStyle}>Номер</label>
                            <input
                                style={input}
                                value={number}
                                onChange={e => setNumber(e.target.value)}
                                placeholder="наприклад: 11"
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={labelStyle}>Назва кафедри</label>
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
                            style={{ padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Save size={16} />
                            {createMutation.isPending ? 'Збереження...' : 'Зберегти'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{ padding: '10px 14px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {departments?.length === 0 && (
                    <div style={{ ...card, padding: '64px', textAlign: 'center', color: '#d1d5db' }}>
                        <Building2 size={48} style={{ margin: '0 auto 16px', opacity: 0.3, color: '#9ca3af' }} />
                        <div style={{ fontSize: '15px', color: '#9ca3af' }}>Кафедр ще немає</div>
                        <div style={{ fontSize: '13px', marginTop: '4px', color: '#d1d5db' }}>Додайте першу кафедру</div>
                    </div>
                )}

                {departments?.map(dept => (
                    <div key={dept.id} style={{
                        ...card,
                        padding: '16px 20px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                            <div style={{
                                width: '42px', height: '42px',
                                background: '#fff7ed',
                                border: '1px solid #fed7aa',
                                borderRadius: '10px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <Building2 size={20} color="#f97316" />
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '15px', color: '#111827' }}>
                                    Кафедра № {dept.number}
                                </div>
                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '2px' }}>
                                    {dept.name}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => deleteMutation.mutate(dept.id)}
                            style={{ padding: '8px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center' }}
                        >
                            <Trash2 size={16} />
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}