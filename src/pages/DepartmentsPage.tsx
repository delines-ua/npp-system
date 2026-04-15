import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDepartments, createDepartment, deleteDepartment } from '../services/departments'

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
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['departments'] })
        },
    })

    if (isLoading) return <p>Завантаження...</p>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Кафедри</h1>
                <button
                    onClick={() => setShowForm(!showForm)}
                    style={{
                        padding: '10px 20px',
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                    }}
                >
                    + Додати кафедру
                </button>
            </div>

            {showForm && (
                <div style={{
                    background: '#fff',
                    padding: '24px',
                    borderRadius: '12px',
                    marginBottom: '24px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px' }}>Нова кафедра</h3>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                                Номер кафедри
                            </label>
                            <input
                                value={number}
                                onChange={e => setNumber(e.target.value)}
                                placeholder="наприклад: 11"
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    width: '140px',
                                }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>
                                Назва кафедри
                            </label>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="наприклад: Кафедра комп'ютерних наук"
                                style={{
                                    padding: '8px 12px',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '6px',
                                    fontSize: '14px',
                                    width: '100%',
                                }}
                            />
                        </div>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={!name || !number || createMutation.isPending}
                            style={{
                                padding: '8px 20px',
                                background: '#22c55e',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            {createMutation.isPending ? 'Збереження...' : 'Зберегти'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{
                                padding: '8px 16px',
                                background: '#f1f5f9',
                                color: '#64748b',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '14px',
                            }}
                        >
                            Скасувати
                        </button>
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {departments?.length === 0 && (
                    <div style={{
                        background: '#fff',
                        padding: '48px',
                        borderRadius: '12px',
                        textAlign: 'center',
                        color: '#94a3b8',
                    }}>
                        Кафедр ще немає. Додайте першу кафедру.
                    </div>
                )}

                {departments?.map(dept => (
                    <div
                        key={dept.id}
                        style={{
                            background: '#fff',
                            padding: '16px 20px',
                            borderRadius: '12px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                        }}
                    >
                        <div>
                            <div style={{ fontWeight: '600', fontSize: '15px', color: '#1e293b' }}>
                                Кафедра № {dept.number}
                            </div>
                            <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                {dept.name}
                            </div>
                        </div>
                        <button
                            onClick={() => deleteMutation.mutate(dept.id)}
                            style={{
                                padding: '6px 12px',
                                background: '#fee2e2',
                                color: '#ef4444',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                            }}
                        >
                            Видалити
                        </button>
                    </div>
                ))}
            </div>
        </div>
    )
}