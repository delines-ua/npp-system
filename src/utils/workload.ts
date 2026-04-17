export interface WorkloadInput {
    lecture_hours: number
    group_hours: number
    subgroup_hours: number
    practice_hours: number
    course_works: number
    control_works: number
    exams: number
    credits: number
    lecture_streams: number
    group_count: number
    subgroup_count: number
    student_count: number
}

export interface WorkloadResult {
    lecture_workload: number
    group_workload: number
    subgroup_workload: number
    consultation_hours: number
    control_work_hours: number
    exam_hours: number
    course_work_hours: number
    credit_hours: number
    total_hours: number
    required_staff: number
}

// Таблиця 3 Наказу №155/291
export const calculateWorkload = (input: WorkloadInput): WorkloadResult => {
    // Граф 8: лекції × потоки
    const lecture_workload = input.lecture_hours * input.lecture_streams

    // Граф 10: групові заняття × групи
    const group_workload = input.group_hours * input.group_count

    // Граф 12: підгрупові заняття × підгрупи
    const subgroup_workload = input.subgroup_hours * input.subgroup_count

    // Граф 16: консультації (15% від лекцій + 10% від інших × групи)
    const consultation_hours =
        Math.round((input.lecture_hours * 0.15 * input.lecture_streams +
            input.group_hours * 0.1 * input.group_count) * 10) / 10


    // Граф 18: перевірка контрольних робіт (0.5 год × к-сть × студенти)
    const control_work_hours =
        Math.round(input.control_works * 0.5 * input.student_count * 10) / 10

    // Граф 20: іспити (0.5 год × студенти × іспити)
    const exam_hours =
        Math.round(input.exams * 0.5 * input.student_count * 10) / 10

// Граф 17: курсові роботи (6 год × к-сть студентів що пишуть)
    const course_work_hours =
        Math.round(input.course_works * 6 * 10) / 10

    // Граф 19: заліки (0.33 год × студенти × заліки)
    const credit_hours =
        Math.round(input.credits * 0.33 * input.student_count * 10) / 10

    const total_hours =
        lecture_workload +
        group_workload +
        subgroup_workload +
        consultation_hours +
        control_work_hours +
        exam_hours +
        course_work_hours +
        credit_hours

    // Розрахункова кількість НПП = загальний час ÷ 600
    const required_staff = Math.round((total_hours / 600) * 1000) / 1000

    return {
        lecture_workload,
        group_workload,
        subgroup_workload,
        consultation_hours,
        control_work_hours,
        exam_hours,
        course_work_hours,
        credit_hours,
        total_hours,
        required_staff,
    }
}

// Ліміт годин для НПП по наказу
export const getStaffHourLimit = (
    rate: number,
    is_military: boolean,
    service_years: number
): number => {
    if (!is_military) return Math.round(1548 * rate)
    let base = 1840
    if (service_years >= 20) base = 1720
    else if (service_years >= 15) base = 1760
    else if (service_years >= 10) base = 1800
    return Math.round(base * rate)
}