import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDisciplines, createDiscipline, deleteDiscipline } from '../services/disciplines'
import { getDepartments } from '../services/departments'
import { calculateWorkload } from '../utils/workload'

const EDUCATION_LEVELS = [
    '1_Бакалавр (очна)',
    '2_Бакалавр (заочна)',
    '3_Магістр (очна)',
    '4_Доктор філософії',
    '5_Базова загальновійськова підготовка',
    '6_Курси професійної військової освіти',
    '7_Курси підвищення кваліфікації',
]

const emptyForm = {
    department_id: '',
    name: '',
    education_level: '1_Бакалавр (очна)',
    semester: 1,
    total_hours: 0,
    lecture_hours: 0,
    group_hours: 0,
    subgroup_hours: 0,
    tsz_hours: 0,
    practice_hours: 0,
    course_works: 0,
    control_works: 0,
    exams: 0,
    credits: 0,
    academic_year: '2026-2027',
    lecture_streams: 1,
    group_count: 1,
    subgroup_count: 1,
    student_count: 0,
}

export default function DisciplinesPage() {
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [filterDept, setFilterDept] = useState('')

    const { data: disciplines, isLoading } = useQuery({
        queryKey: ['disciplines', filterDept],
        queryFn: () => getDisciplines(filterDept || undefined),
    })

    const { data: departments } = useQuery({
        queryKey: ['departments'],
        queryFn: getDepartments,
    })

    const createMutation = useMutation({
        mutationFn: () => createDiscipline({
            department_id: form.department_id,
            name: form.name,
            education_level: form.education_level,
            semester: form.semester,
            total_hours: form.total_hours,
            lecture_hours: form.lecture_hours,
            group_hours: form.group_hours,
            subgroup_hours: form.subgroup_hours,
            tsz_hours: form.tsz_hours,
            practice_hours: form.practice_hours,
            course_works: form.course_works,
            control_works: form.control_works,
            exams: form.exams,
            credits: form.credits,
            academic_year: form.academic_year,
        }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['disciplines'] })
            setForm(emptyForm)
            setShowForm(false)
        },
    })

    const deleteMutation = useMutation({
        mutationFn: deleteDiscipline,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['disciplines'] }),
    })

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

    const numInput = (field: keyof typeof form, label: string) => (
        <div>
            <label style={labelStyle}>{label}</label>
            <input
                style={inputStyle}
                type="number"
                min={0}
                value={form[field] as number}
                onChange={e => setForm({ ...form, [field]: Number(e.target.value) })}
            />
        </div>
    )

    // Розрахунок в реальному часі
    const preview = calculateWorkload({
        lecture_hours: form.lecture_hours,
        group_hours: form.group_hours,
        subgroup_hours: form.subgroup_hours,
        practice_hours: form.practice_hours,
        course_works: form.course_works,
        control_works: form.control_works,
        exams: form.exams,
        credits: form.credits,
        lecture_streams: form.lecture_streams,
        group_count: form.group_count,
        subgroup_count: form.subgroup_count,
        student_count: form.student_count,
    })

    if (isLoading) return <p>Завантаження...</p>

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>Дисципліни</h1>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <select
                        style={{ padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                        value={filterDept}
                        onChange={e => setFilterDept(e.target.value)}
                    >
                        <option value="">Всі кафедри</option>
                        {departments?.map(d => (
                            <option key={d.id} value={d.id}>Кафедра № {d.number}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{ padding: '10px 20px', background: '#3b82f6', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }}
                    >
                        + Додати дисципліну
                    </button>
                </div>
            </div>

            {showForm && (
                <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <h3 style={{ margin: '0 0 20px', fontSize: '16px' }}>Нова дисципліна</h3>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Назва дисципліни</label>
                            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Вища математика" />
                        </div>
                        <div>
                            <label style={labelStyle}>Кафедра</label>
                            <select style={inputStyle} value={form.department_id} onChange={e => setForm({ ...form, department_id: e.target.value })}>
                                <option value="">Оберіть кафедру</option>
                                {departments?.map(d => <option key={d.id} value={d.id}>№ {d.number} — {d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Вид підготовки</label>
                            <select style={inputStyle} value={form.education_level} onChange={e => setForm({ ...form, education_level: e.target.value })}>
                                {EDUCATION_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Навчальний рік</label>
                            <input style={inputStyle} value={form.academic_year} onChange={e => setForm({ ...form, academic_year: e.target.value })} />
                        </div>
                    </div>

                    <p style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b', margin: '0 0 12px' }}>
                        Години по навчальному плану
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {numInput('semester', 'Семестр')}
                        {numInput('lecture_hours', 'Лекції')}
                        {numInput('group_hours', 'Групові')}
                        {numInput('subgroup_hours', 'Підгрупові')}
                        {numInput('practice_hours', 'Практика')}
                        {numInput('course_works', 'Курсові роботи')}
                        {numInput('control_works', 'Контрольні роботи')}
                        {numInput('exams', 'Іспити')}
                        {numInput('credits', 'Заліки')}
                        {numInput('total_hours', 'Всього годин')}
                    </div>

                    <p style={{ fontWeight: '600', fontSize: '14px', color: '#1e293b', margin: '0 0 12px' }}>
                        Параметри груп
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {numInput('student_count', 'Кількість студентів')}
                        {numInput('lecture_streams', 'Лекційних потоків')}
                        {numInput('group_count', 'Навчальних груп')}
                        {numInput('subgroup_count', 'Підгруп')}
                    </div>

                    {/* Розрахунок в реальному часі */}
                    <div style={{ background: '#f0f9ff', padding: '16px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #bae6fd' }}>
                        <p style={{ fontWeight: '600', fontSize: '14px', color: '#0369a1', margin: '0 0 12px' }}>
                            Розрахунок навантаження (Наказ №155/291, Табл. 3)
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '13px' }}>
                            {[
                                ['Лекції', preview.lecture_workload],
                                ['Групові заняття', preview.group_workload],
                                ['Підгрупові заняття', preview.subgroup_workload],
                                ['Консультації', preview.consultation_hours],
                                ['Контрольні роботи', preview.control_work_hours],
                                ['Іспити', preview.exam_hours],
                                ['Курсові роботи', preview.course_work_hours],
                                ['Заліки', preview.credit_hours],
                            ].map(([label, value]) => (
                                <div key={label as string} style={{ background: '#fff', padding: '8px 12px', borderRadius: '6px' }}>
                                    <div style={{ color: '#64748b' }}>{label}</div>
                                    <div style={{ fontWeight: '600', color: '#1e293b' }}>{value} год</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ marginTop: '12px', padding: '10px 16px', background: '#0369a1', color: '#fff', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: '600' }}>Загальний час:</span>
                            <span style={{ fontWeight: '700', fontSize: '16px' }}>{preview.total_hours} год</span>
                        </div>
                        <div style={{ marginTop: '8px', padding: '10px 16px', background: '#22c55e', color: '#fff', borderRadius: '6px', display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: '600' }}>Розрахункова потреба в НПП:</span>
                            <span style={{ fontWeight: '700', fontSize: '16px' }}>{preview.required_staff}</span>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={!form.name || !form.department_id || createMutation.isPending}
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
                {disciplines?.length === 0 && (
                    <div style={{ background: '#fff', padding: '48px', borderRadius: '12px', textAlign: 'center', color: '#94a3b8' }}>
                        Дисциплін ще немає. Додайте першу дисципліну.
                    </div>
                )}
                {disciplines?.map(d => {
                    const dept = departments?.find(dep => dep.id === d.department_id)
                    return (
                        <div key={d.id} style={{ background: '#fff', padding: '16px 20px', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '15px', color: '#1e293b' }}>{d.name}</div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                    {d.education_level} · Семестр {d.semester} · Кафедра № {dept?.number} · {d.academic_year}
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                                    Лекції: {d.lecture_hours} · Групові: {d.group_hours} · Підгрупові: {d.subgroup_hours}
                                </div>
                            </div>
                            <button
                                onClick={() => deleteMutation.mutate(d.id)}
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