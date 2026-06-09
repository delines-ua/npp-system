import type { ScientificWorkType } from '../utils/lawNorms'

export interface Department {
    id: string
    name: string
    number: string
    created_at: string
}

export interface Staff {
    id: string
    department_id: string
    full_name: string
    position: string
    is_military: boolean
    service_years: number
    rate: number
    created_at: string
}

export interface Specialty {
    id: string
    code: string
    name: string
}

export interface StudyGroup {
    id: string
    specialty_id: string
    course: number
    student_count: number
    academic_year: string
}

export interface Discipline {
    id: string
    department_id: string
    name: string
    education_level: string
    semester: number
    total_hours: number
    lecture_hours: number
    group_hours: number
    subgroup_hours: number
    tsz_hours: number
    practice_hours: number
    course_works: number
    control_works: number
    exams: number
    credits: number
    academic_year: string
    student_count: number
    lecture_streams: number
    group_count: number
    subgroup_count: number
    group_names: string        // "221, 222, 223" — реальні імена груп
    specialty_codes: string    // "122,126" — коди спеціальностей з Розрахунок 155
    is_thesis: boolean         // true = атестаційна робота (бакалавр/магістр)
}

export interface WorkloadCalculation {
    id: string
    discipline_id: string
    study_group_id: string
    lecture_streams: number
    group_count: number
    subgroup_count: number
    lecture_workload: number
    group_workload: number
    subgroup_workload: number
    consultation_hours: number
    exam_hours: number
    course_work_hours: number
    total_hours: number
    required_staff: number
    created_at: string
}

export interface StaffAssignment {
    id: string
    staff_id: string
    discipline_id: string
    discipline_name: string
    planned_hours: number
    actual_hours: number
    academic_year: string
    notes: string
    created_at: string
}

// ─── Детальний розподіл навантаження (workload_assignments) ──────────────────
export type WorkloadTypeKey =
    | 'lecture'
    | 'group'
    | 'practical'
    | 'course_work'
    | 'control_work'
    | 'exam'
    | 'credit'

export interface DetailedAssignment {
    id: string
    discipline_id: string
    staff_id: string
    workload_type: WorkloadTypeKey
    group_number: number   // 1-based; для лекцій = номер потоку
    hours: number
    student_count: number
    academic_year: string
    created_at: string
}

// ─── Групи інституту (institute_groups) ──────────────────────────────────────
export interface InstituteGroup {
    id: string
    group_name: string      // '221', '222', '151м'
    faculty: number         // 1, 2, 3, 4
    course: number          // 1–5
    student_count: number
    is_masters: boolean
    specialty_code: string  // "122", "126" — код спеціальності групи
    zaochna: boolean        // форма навчання: true = заочна, false = очна
    academic_year: string
    created_at: string
}

// Зв'язок дисципліна ↔ група (discipline_groups)
export interface DisciplineGroup {
    id: string
    discipline_id: string
    group_id: string
    group_order: number     // 1-based; відповідає DetailedAssignment.group_number
    student_count: number   // к-сть курсантів цієї групи на дисципліні
    academic_year: string
    created_at: string
}

export interface DisciplineGroupFull extends DisciplineGroup {
    group: InstituteGroup
}

// ─── Наукові роботи (scientific_works) ───────────────────────────────────────
export interface ScientificWork {
    id: string
    staff_id: string
    department_id: string
    work_type: ScientificWorkType
    student_count: number
    hours: number
    notes: string
    academic_year: string
    created_at: string
}
