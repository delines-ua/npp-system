// Норми часу згідно Наказу МО України №155/291 від 08.05.2002
// https://zakon.rada.gov.ua/laws/show/z0452-02

// ─── Таблиця 1. Розподіл робочого часу ───────────────────────────────────────
export const WORK_TIME_SHARE = {
    teaching: { min: 0.25, max: 0.55 },     // навчальна робота
    scientific: { min: 0, max: 0.35 },       // наукова робота
    methodological: { min: 0.10, max: 0.50 }, // методична
    other: { min: 0.05, max: 0.25 },         // організаційна та ін.
} as const

// ─── Таблиця 2. Ліміт годин на рік ──────────────────────────────────────────
export const ANNUAL_HOURS = {
    military: {
        base: 1840,   // вислуга до 10 років
        yr10: 1800,   // 10-14 років
        yr15: 1760,   // 15-19 років
        yr20: 1720,   // 20+ років
    },
    civilian: 1548,
} as const

// ─── Таблиця 3. Норми часу (ВВНЗ III-IV рівнів) ──────────────────────────────
export const TIME_NORMS = {
    // Аудиторні заняття
    lecture:           { formula: '1 год × потоки', unit: 'год/потік' },
    group:             { formula: '1 год × групи',  unit: 'год/група' },
    subgroup:          { formula: '1 год × підгрупи', unit: 'год/підгрупа' },
    labReportCheck:    { hoursPerReport: 0.1, maxPerYearPerDisc: 20 },

    // Консультації (автоматично від аудиторних)
    consultation: {
        lecturePercent: 0.15,  // 15% від лекційних годин
        otherPercent:   0.10,  // 10% від групових та підгрупових
    },

    // Підсумковий контроль
    exam:        { hoursPerStudent: 0.5 },   // іспит
    diffCredit:  { hoursPerStudent: 0.33 },  // диференційований залік
    credit:      { hoursPerStudent: 0.33 },  // залік

    // Курсові та контрольні роботи (Табл. 3, ВВНЗ III-IV)
    courseWork:  { hoursPerWork: 6 },     // 6 год на 1 роботу
    controlWork: { hoursPerWork: 0.5 },   // 0.5 год на 1 роботу

    // Державні іспити та захист
    stateExam:     { hoursPerStudent: 0.5, complexHoursPerStudent: 0.75 },
    thesisDefense: { hoursPerWork: 1 },

    // Дипломні роботи
    bachelorThesis:  { hoursPerStudent: 30 },  // кваліфікаційна робота бакалавра
    masterThesis:    { hoursPerStudent: 60 },  // кваліфікаційна робота магістра

    // Наукове керівництво (Табл.3, ВВНЗ III-IV)
    graduateMentoring:{ hoursPerStudentPerYear: 50 }, // ад'юнкт/докторант — 50 год/рік

    // Вступні іспити
    entranceOral:    { hoursPerCandidate: 0.25 },
    entranceWritten: { hoursPerStream: 4, hoursPerCheckWork: 0.5 },

    // Позааудиторне читання (іноземна мова)
    extramural: { hoursPerStudentPerYear: 2 },
} as const

// ─── Посади НПП ──────────────────────────────────────────────────────────────
export const POSITIONS = [
    'Начальник кафедри',
    'Заступник начальника кафедри',
    'Завідувач кафедри',
    'Професор',
    'Доцент',
    'Старший викладач',
    'Викладач',
    'Асистент',
] as const

export type Position = typeof POSITIONS[number]

// ─── Типи навчальної роботи ───────────────────────────────────────────────────
export const WORKLOAD_TYPE_META = {
    lecture:     { label: 'Лекції',             color: '#3b82f6', bg: '#eff6ff', border: '#bfdbfe' },
    group:       { label: 'ГЗ',                  color: '#22c55e', bg: '#f0fdf4', border: '#bbf7d0' },
    practical:   { label: 'ПЗ',                  color: '#8b5cf6', bg: '#f5f3ff', border: '#ddd6fe' },
    course_work: { label: 'Курсові роботи',      color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
    control_work:{ label: 'Контрольні роботи',   color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
    exam:        { label: 'Іспит',               color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
    credit:      { label: 'Залік',               color: '#06b6d4', bg: '#ecfeff', border: '#a5f3fc' },
} as const

// ─── Рівні підготовки ─────────────────────────────────────────────────────────
export const EDUCATION_LEVELS = [
    { value: '1_Бакалавр (очна)',     label: 'Бакалавр (очна)' },
    { value: '2_Бакалавр (заочна)',   label: 'Бакалавр (заочна)' },
    { value: '3_Магістр (очна)',      label: 'Магістр (очна)' },
    { value: '4_Доктор філософії',    label: 'Доктор філософії' },
    { value: '5_Базова загальновійськова підготовка', label: 'Загальновійськова' },
    { value: '6_Курси професійної військової освіти', label: 'Проф. військ. освіта' },
    { value: '7_Курси підвищення кваліфікації',       label: 'Підвищення кваліфікації' },
] as const

// ─── Типи керівництва здобувачами ─────────────────────────────────────────────
export const SCIENTIFIC_WORK_TYPES = {
    bachelor_thesis:   { label: 'Бакалаврська робота',  hours: 30, color: '#06b6d4' },
    master_thesis:     { label: 'Магістерська робота',  hours: 60, color: '#ec4899' },
    graduate_mentoring:{ label: "Ад'юнкт / Докторант", hours: 50, color: '#22c55e' },
} as const

export type ScientificWorkType = keyof typeof SCIENTIFIC_WORK_TYPES
