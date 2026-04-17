import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDisciplines, createDiscipline, deleteDiscipline } from '../services/disciplines'
import { getDepartments } from '../services/departments'
import { calculateWorkload } from '../utils/workload'
import { BookOpen, Plus, Trash2, X, Save, ChevronUp, Filter } from 'lucide-react'

const EDUCATION_LEVELS = [
    '1_Бакалавр (очна)', '2_Бакалавр (заочна)', '3_Магістр (очна)',
    '4_Доктор філософії', '5_Базова загальновійськова підготовка',
    '6_Курси професійної військової освіти', '7_Курси підвищення кваліфікації',
]

const emptyForm = {
    department_id: '', name: '', education_level: '1_Бакалавр (очна)',
    semester: 1, total_hours: 0, lecture_hours: 0, group_hours: 0,
    subgroup_hours: 0, tsz_hours: 0, practice_hours: 0, course_works: 0,
    control_works: 0, exams: 0, credits: 0, academic_year: '2025-2026',
    lecture_streams: 1, group_count: 1, subgroup_count: 1, student_count: 0,

}

const card = {
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
}

const inputStyle = {
    padding: '10px 14px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#e2e8f0',
    outline: 'none',
    width: '100%',
}

const labelStyle = {
    display: 'block' as const,
    fontSize: '12px',
    color: '#6b7280',
    marginBottom: '6px',
}

const selectStyle = {
    padding: '8px 12px',
    background: 'rgba(15,23,42,0.8)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#e2e8f0',
    outline: 'none',
}

export default function DisciplinesPage() {
    const queryClient = useQueryClient()
    const [showForm, setShowForm] = useState(false)
    const [form, setForm] = useState(emptyForm)
    const [filterDept, setFilterDept] = useState('')
    const [filterLevel, setFilterLevel] = useState('')
    const [filterForm, setFilterForm] = useState('')
    const [filterSemester, setFilterSemester] = useState('')
    const [showFilters, setShowFilters] = useState(false)

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
            student_count: form.student_count,
            lecture_streams: form.lecture_streams,
            group_count: form.group_count,
            subgroup_count: form.subgroup_count,
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

    const numInput = (field: keyof typeof form, label: string) => (
        <div key={field}>
            <label style={labelStyle}>{label}</label>
            <input
                style={inputStyle} type="number" min={0}
                value={form[field] as number}
                onChange={e => setForm({ ...form, [field]: Number(e.target.value) })}
            />
        </div>
    )

    const preview = calculateWorkload({
        lecture_hours: form.lecture_hours, group_hours: form.group_hours,
        subgroup_hours: form.subgroup_hours, practice_hours: form.practice_hours,
        course_works: form.course_works, control_works: form.control_works,
        exams: form.exams, credits: form.credits,
        lecture_streams: form.lecture_streams, group_count: form.group_count,
        subgroup_count: form.subgroup_count, student_count: form.student_count,
    })

    // Фільтрація
    const filteredDisciplines = disciplines?.filter(d => {
        if (filterLevel && !d.education_level.includes(filterLevel)) return false
        if (filterForm === 'ochna' && d.education_level.includes('заочна')) return false
        if (filterForm === 'zaochna' && !d.education_level.includes('заочна')) return false
        if (filterSemester && d.semester !== Number(filterSemester)) return false
        return true
    }) || []

    const activeFilters = [filterLevel, filterForm, filterSemester].filter(Boolean).length

    if (isLoading) return (
        <div style={{ textAlign: 'center', color: '#475569', padding: '80px' }}>Завантаження...</div>
    )

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                        Дисципліни
                    </h1>
                    <p style={{ fontSize: '14px', color: '#475569' }}>
                        Знайдено: {filteredDisciplines.length} з {disciplines?.length || 0}
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        style={{
                            padding: '10px 16px',
                            background: activeFilters > 0 ? 'rgba(37,99,235,0.2)' : 'rgba(255,255,255,0.05)',
                            border: `1px solid ${activeFilters > 0 ? 'rgba(37,99,235,0.4)' : 'rgba(255,255,255,0.1)'}`,
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '14px',
                            color: activeFilters > 0 ? '#60a5fa' : '#9ca3af',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                        }}
                    >
                        <Filter size={15} />
                        Фільтри
                        {activeFilters > 0 && (
                            <span style={{ background: '#2563eb', color: '#fff', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: '700' }}>
                {activeFilters}
              </span>
                        )}
                    </button>
                    <button
                        onClick={() => setShowForm(!showForm)}
                        style={{ padding: '10px 20px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                        {showForm ? <ChevronUp size={16} /> : <Plus size={16} />}
                        Додати дисципліну
                    </button>
                </div>
            </div>

            {/* Фільтри */}
            {showFilters && (
                <div style={{ ...card, padding: '20px', marginBottom: '20px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        <div>
                            <label style={labelStyle}>Кафедра</label>
                            <select style={selectStyle} value={filterDept} onChange={e => setFilterDept(e.target.value)}>
                                <option value="">Всі кафедри</option>
                                {departments?.map(d => <option key={d.id} value={d.id}>№ {d.number} — {d.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Рівень підготовки</label>
                            <select style={selectStyle} value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                                <option value="">Всі рівні</option>
                                <option value="Бакалавр">Бакалавр</option>
                                <option value="Магістр">Магістр</option>
                                <option value="Доктор філософії">Доктор філософії</option>
                                <option value="загальновійськова">Загальновійськова</option>
                                <option value="Курси">Курси</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Форма навчання</label>
                            <select style={selectStyle} value={filterForm} onChange={e => setFilterForm(e.target.value)}>
                                <option value="">Всі форми</option>
                                <option value="ochna">Очна</option>
                                <option value="zaochna">Заочна</option>
                            </select>
                        </div>
                        <div>
                            <label style={labelStyle}>Семестр</label>
                            <select style={selectStyle} value={filterSemester} onChange={e => setFilterSemester(e.target.value)}>
                                <option value="">Всі семестри</option>
                                {[1,2,3,4,5,6,7,8,9,10].map(s => (
                                    <option key={s} value={s}>Семестр {s}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    {activeFilters > 0 && (
                        <button
                            onClick={() => { setFilterLevel(''); setFilterForm(''); setFilterSemester(''); setFilterDept('') }}
                            style={{ marginTop: '12px', padding: '6px 14px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', color: '#f87171' }}
                        >
                            Скинути фільтри
                        </button>
                    )}
                </div>
            )}

            {/* Форма додавання */}
            {showForm && (
                <div style={{ ...card, padding: '24px', marginBottom: '24px' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#e2e8f0', marginBottom: '20px' }}>
                        Нова дисципліна
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '20px' }}>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={labelStyle}>Назва дисципліни</label>
                            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Наприклад: Вища математика" />
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

                    <p style={{ fontWeight: '600', fontSize: '13px', color: '#94a3b8', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Години по навчальному плану
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {numInput('semester', 'Семестр')}
                        {numInput('lecture_hours', 'Лекції')}
                        {numInput('group_hours', 'Групові')}
                        {numInput('subgroup_hours', 'Підгрупові')}
                        {numInput('practice_hours', 'Практика')}
                        {numInput('course_works', 'Курсові')}
                        {numInput('control_works', 'Контрольні')}
                        {numInput('exams', 'Іспити')}
                        {numInput('credits', 'Заліки')}
                        {numInput('total_hours', 'Всього')}
                    </div>

                    <p style={{ fontWeight: '600', fontSize: '13px', color: '#94a3b8', margin: '0 0 12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Параметри груп
                    </p>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
                        {numInput('student_count', 'Студентів')}
                        {numInput('lecture_streams', 'Потоків')}
                        {numInput('group_count', 'Груп')}
                        {numInput('subgroup_count', 'Підгруп')}
                    </div>

                    <div style={{ background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(59,130,246,0.2)', borderRadius: '12px', padding: '20px', marginBottom: '20px' }}>
                        <p style={{ fontWeight: '600', fontSize: '13px', color: '#60a5fa', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            Розрахунок · Наказ №155/291 · Табл. 3
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', marginBottom: '12px' }}>
                            {[
                                ['Лекції', preview.lecture_workload],
                                ['Групові', preview.group_workload],
                                ['Підгрупові', preview.subgroup_workload],
                                ['Консультації', preview.consultation_hours],
                                ['Контрольні', preview.control_work_hours],
                                ['Іспити', preview.exam_hours],
                                ['Курсові', preview.course_work_hours],
                                ['Заліки', preview.credit_hours],
                            ].map(([label, value]) => (
                                <div key={label as string} style={{ background: 'rgba(255,255,255,0.03)', padding: '10px 12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <div style={{ color: '#6b7280', fontSize: '12px' }}>{label}</div>
                                    <div style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '15px', marginTop: '2px' }}>{value}</div>
                                </div>
                            ))}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div style={{ padding: '12px 16px', background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#93c5fd' }}>Загальний час</span>
                                <span style={{ fontWeight: '700', color: '#fff', fontSize: '18px' }}>{preview.total_hours} год</span>
                            </div>
                            <div style={{ padding: '12px 16px', background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.25)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '13px', color: '#86efac' }}>Потреба в НПП</span>
                                <span style={{ fontWeight: '700', color: '#fff', fontSize: '18px' }}>{preview.required_staff}</span>
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => createMutation.mutate()}
                            disabled={!form.name || !form.department_id || createMutation.isPending}
                            style={{ padding: '10px 20px', background: '#22c55e', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <Save size={16} />
                            {createMutation.isPending ? 'Збереження...' : 'Зберегти'}
                        </button>
                        <button
                            onClick={() => setShowForm(false)}
                            style={{ padding: '10px 16px', background: '#374151', color: '#9ca3af', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                            <X size={16} /> Скасувати
                        </button>
                    </div>
                </div>
            )}

            {/* Список дисциплін */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredDisciplines.length === 0 && (
                    <div style={{ ...card, padding: '64px', textAlign: 'center', color: '#374151' }}>
                        <BookOpen size={48} style={{ margin: '0 auto 16px', opacity: 0.3 }} />
                        <div style={{ fontSize: '15px' }}>
                            {disciplines?.length === 0 ? 'Дисциплін ще немає' : 'Нічого не знайдено'}
                        </div>
                        <div style={{ fontSize: '13px', marginTop: '4px' }}>
                            {disciplines?.length === 0 ? 'Додайте першу дисципліну' : 'Спробуйте змінити фільтри'}
                        </div>
                    </div>
                )}

                {filteredDisciplines.map(d => {
                    const dept = departments?.find(dep => dep.id === d.department_id)
                    const calc = calculateWorkload({
                        lecture_hours: d.lecture_hours, group_hours: d.group_hours,
                        subgroup_hours: d.subgroup_hours, practice_hours: d.practice_hours,
                        course_works: d.course_works, control_works: d.control_works,
                        exams: d.exams, credits: d.credits,
                        lecture_streams: 1, group_count: 1, subgroup_count: 1, student_count: 25,
                    })

                    const isZaochna = d.education_level.includes('заочна')
                    const levelColor = d.education_level.includes('Магістр') ? '#8b5cf6'
                        : d.education_level.includes('Доктор') ? '#ef4444'
                            : d.education_level.includes('Курси') ? '#f59e0b'
                                : isZaochna ? '#06b6d4' : '#3b82f6'

                    return (
                        <div key={d.id} style={{ ...card, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1 }}>
                                <div style={{ width: '4px', height: '40px', borderRadius: '2px', background: levelColor, flexShrink: 0 }} />
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: '600', fontSize: '14px', color: '#f1f5f9' }}>{d.name}</div>
                                    <div style={{ display: 'flex', gap: '12px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '12px', padding: '2px 8px', borderRadius: '4px', background: `${levelColor}20`, color: levelColor, fontWeight: '500' }}>
                      {d.education_level.replace(/^\d+_/, '')}
                    </span>
                                        <span style={{ fontSize: '12px', color: '#475569' }}>Сем. {d.semester}</span>
                                        <span style={{ fontSize: '12px', color: '#475569' }}>Каф. №{dept?.number}</span>
                                        <span style={{ fontSize: '12px', color: '#475569' }}>Лек: {d.lecture_hours}</span>
                                        <span style={{ fontSize: '12px', color: '#475569' }}>Груп: {d.group_hours}</span>
                                        <span style={{ fontSize: '12px', color: '#475569' }}>Підгр: {d.subgroup_hours}</span>
                                        <span style={{ fontSize: '12px', color: '#3b82f6', fontWeight: '600' }}>{calc.total_hours} год</span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={() => deleteMutation.mutate(d.id)}
                                style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '8px', cursor: 'pointer', color: '#ef4444', display: 'flex', alignItems: 'center', flexShrink: 0, marginLeft: '12px' }}
                            >
                                <Trash2 size={15} />
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}