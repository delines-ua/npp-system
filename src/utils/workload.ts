import type { Discipline, WorkloadTypeKey, DetailedAssignment, DisciplineGroupFull } from '../types/database'
import type { WorkloadSettings } from './settings'
import { TIME_NORMS, ANNUAL_HOURS } from './lawNorms'

// ─── Стара бізнес-логіка (calculateWorkload) — залишається для Dashboard/звітів ──

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

// Таблиця 3 Наказу №155/291 — повний розрахунок по дисципліні
export const calculateWorkload = (input: WorkloadInput): WorkloadResult => {
    const lecture_workload = input.lecture_hours * input.lecture_streams
    const group_workload = input.group_hours * input.group_count
    const subgroup_workload = input.subgroup_hours * input.subgroup_count

    const consultation_hours =
        Math.round((
            input.lecture_hours * TIME_NORMS.consultation.lecturePercent * input.lecture_streams +
            (input.group_hours * input.group_count + input.subgroup_hours * input.subgroup_count) * TIME_NORMS.consultation.otherPercent
        ) * 10) / 10

    // 0.5 год × к-сть контрольних × курсанти
    const control_work_hours =
        Math.round(input.control_works * TIME_NORMS.controlWork.hoursPerWork * input.student_count * 10) / 10

    // 0.5 год × к-сть іспитів × курсанти
    const exam_hours =
        Math.round(input.exams * TIME_NORMS.exam.hoursPerStudent * input.student_count * 10) / 10

    // 6 год × к-сть курсових × курсанти (виправлена формула згідно закону)
    const course_work_hours =
        Math.round(input.course_works * TIME_NORMS.courseWork.hoursPerWork * input.student_count * 10) / 10

    // 0.33 год × к-сть заліків × курсанти
    const credit_hours =
        Math.round(input.credits * TIME_NORMS.credit.hoursPerStudent * input.student_count * 10) / 10

    const total_hours =
        lecture_workload + group_workload + subgroup_workload +
        consultation_hours + control_work_hours + exam_hours +
        course_work_hours + credit_hours

    const required_staff = Math.round((total_hours / 600) * 1000) / 1000

    return {
        lecture_workload, group_workload, subgroup_workload,
        consultation_hours, control_work_hours, exam_hours,
        course_work_hours, credit_hours, total_hours, required_staff,
    }
}

// Ліміт службового (робочого) часу на рік для НПП — Таблиця 2 Наказу 155/291.
// Залежить від категорії (військовий/цивільний) та вислуги років.
export const getStaffHourLimit = (
    rate: number,
    is_military: boolean,
    service_years: number
): number => {
    if (!is_military) return Math.round(ANNUAL_HOURS.civilian * rate)
    let base: number = ANNUAL_HOURS.military.base
    if (service_years >= 20) base = ANNUAL_HOURS.military.yr20
    else if (service_years >= 15) base = ANNUAL_HOURS.military.yr15
    else if (service_years >= 10) base = ANNUAL_HOURS.military.yr10
    return Math.round(base * rate)
}

// Частка навчальної роботи у бюджеті службового часу — Таблиця 1 Наказу 155/291
// (колонка ВВНЗ/ВНП ВНЗ), середнє значення діапазону для кожної посади.
export const TEACHING_SHARE: Record<string, number> = {
    'Начальник кафедри':            0.30,   // 25–35%
    'Заступник начальника кафедри': 0.325,  // 30–35%
    'Завідувач кафедри':            0.30,   // як начальник кафедри
    'Професор':                     0.275,  // 25–30%
    'Доцент':                       0.325,  // 30–35%
    'Старший викладач':             0.40,   // 35–45%
    'Викладач':                     0.425,  // 40–45%
    'Асистент':                     0.475,  // 45–50%
}
export const DEFAULT_TEACHING_SHARE = 0.40

// Ліміт навчального навантаження НПП.
// За замовчуванням (режим 'regulatory'): частка навчальної роботи (Табл.1, за посадою)
// × службовий час на рік (Табл.2, за категорією/вислугою) × ставка.
// У режимі 'override' — ручний ліміт планувальника (фіксовані год/ставка за категорією).
export const getTeachingLoadLimit = (
    staff: { position: string; rate: number; is_military: boolean; service_years: number },
    settings?: WorkloadSettings
): number => {
    if (settings?.mode === 'override') {
        const base = staff.is_military ? settings.overrideMilitary : settings.overrideCivilian
        return Math.round(base * staff.rate)
    }
    const share = TEACHING_SHARE[staff.position] ?? DEFAULT_TEACHING_SHARE
    return Math.round(getStaffHourLimit(staff.rate, staff.is_military, staff.service_years) * share)
}

// Загальна стеля навантаження на 1 НПП (для відображення "X / ліміт" на сторінках).
// 'override' — ручний ліміт планувальника (460/550 × ставка);
// 'regulatory' — річний службовий час (Табл.2, напр. 1840/1720/1548 × ставка).
export const getWorkloadCeiling = (
    staff: { rate: number; is_military: boolean; service_years: number },
    settings?: WorkloadSettings
): number => {
    if (settings?.mode === 'override') {
        const base = staff.is_military ? settings.overrideMilitary : settings.overrideCivilian
        return Math.round(base * staff.rate)
    }
    return getStaffHourLimit(staff.rate, staff.is_military, staff.service_years)
}

// ─── Нова логіка детального розподілу ───────────────────────────────────────

export interface WorkloadSlot {
    type: WorkloadTypeKey
    groupNumber: number
    hours: number
    label: string
    groupLabel: string   // реальне ім'я групи або "Група N"
    studentCount: number
}

// Розбиває group_names ("221, 222") на масив ["221", "222"]
export const parseGroupNames = (disc: Discipline): string[] => {
    if (!disc.group_names?.trim()) return []
    return disc.group_names.split(',').map(n => n.trim()).filter(Boolean)
}

interface GroupEntry { name: string; studentCount: number }

// Будує список груп з discipline_groups або fallback до group_names/group_count
const buildGroupEntries = (disc: Discipline, discGroups?: DisciplineGroupFull[]): GroupEntry[] => {
    if (discGroups && discGroups.length > 0) {
        const valid = discGroups.filter(dg => dg.group != null)
        if (valid.length > 0) {
            return valid.map(dg => ({ name: dg.group.group_name, studentCount: dg.student_count }))
        }
    }
    const names = parseGroupNames(disc)
    const count = Math.max(disc.group_count || 1, 1)
    const perGroup = count > 0 ? Math.ceil(disc.student_count / count) : disc.student_count
    if (names.length > 0) {
        return names.map(name => ({ name, studentCount: perGroup }))
    }
    return Array.from({ length: count }, (_, i) => ({ name: `Група ${i + 1}`, studentCount: perGroup }))
}

// Генерує всі слоти навантаження для дисципліни
export const getApplicableSlots = (disc: Discipline, discGroups?: DisciplineGroupFull[]): WorkloadSlot[] => {
    const slots: WorkloadSlot[] = []
    const streams = Math.max(disc.lecture_streams || 1, 1)
    const groups  = buildGroupEntries(disc, discGroups)
    const groupCount = groups.length

    const subgroupsPerGroup = groupCount > 0 && disc.subgroup_count > 0
        ? Math.ceil(disc.subgroup_count / groupCount) : Math.max(disc.subgroup_count, 1)

    if (disc.lecture_hours > 0) {
        for (let i = 1; i <= streams; i++) {
            const lbl = streams > 1 ? `Лекції — Потік ${i}` : 'Лекції'
            slots.push({ type: 'lecture', groupNumber: i, hours: disc.lecture_hours, label: lbl, groupLabel: `Потік ${i}`, studentCount: disc.student_count })
        }
    }

    if (disc.group_hours > 0) {
        for (let i = 0; i < groupCount; i++) {
            const g = groups[i]
            slots.push({
                type: 'group', groupNumber: i + 1,
                hours: disc.group_hours,
                label: groupCount > 1 ? `ГЗ — ${g.name} (${g.studentCount} ос.)` : 'ГЗ',
                groupLabel: g.name,
                studentCount: g.studentCount,
            })
        }
    }

    if (disc.subgroup_hours > 0) {
        for (let i = 0; i < groupCount; i++) {
            const g = groups[i]
            slots.push({
                type: 'practical', groupNumber: i + 1,
                hours: disc.subgroup_hours * subgroupsPerGroup,
                label: groupCount > 1 ? `ПЗ — ${g.name} (${g.studentCount} ос.)` : 'ПЗ',
                groupLabel: g.name,
                studentCount: g.studentCount,
            })
        }
    }

    if (disc.course_works > 0) {
        for (let i = 0; i < groupCount; i++) {
            const g = groups[i]
            const h = Math.round(disc.course_works * TIME_NORMS.courseWork.hoursPerWork * g.studentCount * 10) / 10
            slots.push({
                type: 'course_work', groupNumber: i + 1,
                hours: h,
                label: groupCount > 1 ? `Курсові — ${g.name} (${g.studentCount} ос.)` : 'Курсові роботи',
                groupLabel: g.name,
                studentCount: g.studentCount,
            })
        }
    }

    if (disc.control_works > 0) {
        for (let i = 0; i < groupCount; i++) {
            const g = groups[i]
            const h = Math.round(disc.control_works * TIME_NORMS.controlWork.hoursPerWork * g.studentCount * 10) / 10
            slots.push({
                type: 'control_work', groupNumber: i + 1,
                hours: h,
                label: groupCount > 1 ? `Контрольні — ${g.name} (${g.studentCount} ос.)` : 'Контрольні роботи',
                groupLabel: g.name,
                studentCount: g.studentCount,
            })
        }
    }

    if (disc.exams > 0) {
        for (let i = 0; i < groupCount; i++) {
            const g = groups[i]
            const h = Math.round(disc.exams * TIME_NORMS.exam.hoursPerStudent * g.studentCount * 10) / 10
            slots.push({
                type: 'exam', groupNumber: i + 1,
                hours: h,
                label: groupCount > 1 ? `Іспит — ${g.name} (${g.studentCount} ос.)` : 'Іспит',
                groupLabel: g.name,
                studentCount: g.studentCount,
            })
        }
    }

    if (disc.credits > 0) {
        for (let i = 0; i < groupCount; i++) {
            const g = groups[i]
            const h = Math.round(disc.credits * TIME_NORMS.credit.hoursPerStudent * g.studentCount * 10) / 10
            slots.push({
                type: 'credit', groupNumber: i + 1,
                hours: h,
                label: groupCount > 1 ? `Залік — ${g.name} (${g.studentCount} ос.)` : 'Залік',
                groupLabel: g.name,
                studentCount: g.studentCount,
            })
        }
    }

    return slots
}

export type DisciplineStatus = 'none' | 'partial' | 'full'

export const getDisciplineStatus = (
    disc: Discipline,
    assignments: DetailedAssignment[]
): DisciplineStatus => {
    const slots = getApplicableSlots(disc)
    if (slots.length === 0) return 'full'
    const discAssignments = assignments.filter(a => a.discipline_id === disc.id)
    if (discAssignments.length === 0) return 'none'
    const filled = slots.filter(slot =>
        discAssignments.some(a => a.workload_type === slot.type && a.group_number === slot.groupNumber)
    ).length
    if (filled === 0) return 'none'
    if (filled >= slots.length) return 'full'
    return 'partial'
}

// Загальна кількість годин навантаження НПП з workload_assignments
export const buildStaffHoursMap = (assignments: DetailedAssignment[]): Record<string, number> => {
    const map: Record<string, number> = {}
    for (const a of assignments) {
        map[a.staff_id] = Math.round(((map[a.staff_id] || 0) + a.hours) * 100) / 100
    }
    return map
}
