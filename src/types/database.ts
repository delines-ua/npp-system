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
    planned_hours: number
    actual_hours: number
    academic_year: string
    created_at: string
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
}