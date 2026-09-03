import {
    Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
    HeadingLevel, AlignmentType, WidthType, BorderStyle, PageBreak,
} from 'docx'
import type { Discipline, Staff, DetailedAssignment, DisciplineGroupFull, ScientificWork } from '../types/database'
import type { WorkloadSettings } from './settings'
import { getApplicableSlots, getTeachingLoadLimit } from './workload'
import { WORKLOAD_TYPE_META, POSITIONS, SCIENTIFIC_WORK_META, isTeachingWorkType, THESIS_SEMESTER } from './lawNorms'

// ─── Модель звіту ─────────────────────────────────────────────────────────────

interface ReportRow {
    typeLabel: string      // "Лекції", "ГЗ", ...
    groupLabel: string     // "Потік 1", "221", ...
    hours: number
}

interface ReportDiscipline {
    name: string
    semester: number
    level: string          // "Бакалавр (очна)"
    rows: ReportRow[]
    subtotal: number
}

interface ReportTeacher {
    staff: Staff
    sem1: number
    sem2: number
    total: number
    limit: number
    disciplines: ReportDiscipline[]
}

// Типи навантаження, що не входять у поточний звіт (атестація/дипломні роботи —
// зберігаються у workload_assignments, але виносяться в окремий планувальник).
const EXCLUDED_TYPES = new Set(['bachelor_thesis', 'master_thesis'])

const stripLevelPrefix = (level: string): string => level.replace(/^\d+_/, '')

// Форматує години без хвостового ".0" (30, 12.5, 90.5)
const fmtHours = (h: number): string => {
    const r = Math.round(h * 100) / 100
    return Number.isInteger(r) ? String(r) : String(r)
}

// ─── Агрегація ────────────────────────────────────────────────────────────────

export const buildWorkloadReportModel = (
    staff: Staff[],
    disciplines: Discipline[],
    assignments: DetailedAssignment[],
    discGroupsByDisc: Map<string, DisciplineGroupFull[]>,
    settings?: WorkloadSettings,
    scientificWorks: ScientificWork[] = [],
): ReportTeacher[] => {
    const discById = new Map(disciplines.map(d => [d.id, d]))
    const staffById = new Map(staff.map(s => [s.id, s]))

    // Тільки аудиторне навантаження: без атестаційних дисциплін і без дипломних типів
    const relevant = assignments.filter(a => {
        if (EXCLUDED_TYPES.has(a.workload_type)) return false
        const disc = discById.get(a.discipline_id)
        if (!disc || disc.is_thesis) return false
        return true
    })

    // Кеш слотів по дисципліні (для відновлення назв груп)
    const slotsCache = new Map<string, ReturnType<typeof getApplicableSlots>>()
    const slotsFor = (disc: Discipline) => {
        let s = slotsCache.get(disc.id)
        if (!s) {
            s = getApplicableSlots(disc, discGroupsByDisc.get(disc.id))
            slotsCache.set(disc.id, s)
        }
        return s
    }

    // Групуємо: staff → discipline → рядки
    const byStaff = new Map<string, DetailedAssignment[]>()
    for (const a of relevant) {
        if (!staffById.has(a.staff_id)) continue
        const arr = byStaff.get(a.staff_id) ?? []
        arr.push(a)
        byStaff.set(a.staff_id, arr)
    }

    // Керівництво дипломними роботами (бакалавр/магістр) — це навчальне
    // навантаження (Наказ №155/291, Табл.3), тож включаємо його у звіт нарівні
    // з дисциплінами, а не лише в окремий планувальник атестацій.
    const byStaffWorks = new Map<string, ScientificWork[]>()
    for (const w of scientificWorks) {
        if (!isTeachingWorkType(w.work_type) || !staffById.has(w.staff_id)) continue
        const arr = byStaffWorks.get(w.staff_id) ?? []
        arr.push(w)
        byStaffWorks.set(w.staff_id, arr)
    }

    const staffIds = new Set<string>([...byStaff.keys(), ...byStaffWorks.keys()])
    const teachers: ReportTeacher[] = []

    for (const staffId of staffIds) {
        const s = staffById.get(staffId)!
        const staffAssigns = byStaff.get(staffId) ?? []

        const byDisc = new Map<string, DetailedAssignment[]>()
        for (const a of staffAssigns) {
            const arr = byDisc.get(a.discipline_id) ?? []
            arr.push(a)
            byDisc.set(a.discipline_id, arr)
        }

        const disciplinesModel: ReportDiscipline[] = []
        let sem1 = 0
        let sem2 = 0

        for (const [discId, discAssigns] of byDisc) {
            const disc = discById.get(discId)!
            const slots = slotsFor(disc)

            const rows: ReportRow[] = discAssigns.map(a => {
                const slot = slots.find(sl => sl.type === a.workload_type && sl.groupNumber === a.group_number)
                const typeLabel = WORKLOAD_TYPE_META[a.workload_type as keyof typeof WORKLOAD_TYPE_META]?.label
                    ?? a.workload_type
                const groupLabel = slot?.groupLabel ?? `Група ${a.group_number}`
                return { typeLabel, groupLabel, hours: a.hours }
            })
            // Порядок рядків: за типом заняття (як у getApplicableSlots), потім за групою
            const typeOrder = Object.keys(WORKLOAD_TYPE_META)
            rows.sort((r1, r2) => {
                const t = typeOrder.indexOf(r1.typeLabel) - typeOrder.indexOf(r2.typeLabel)
                return t
            })

            const subtotal = Math.round(discAssigns.reduce((sum, a) => sum + a.hours, 0) * 100) / 100
            if (disc.semester % 2 === 1) sem1 += subtotal
            else sem2 += subtotal

            disciplinesModel.push({
                name: disc.name,
                semester: disc.semester,
                level: stripLevelPrefix(disc.education_level),
                rows,
                subtotal,
            })
        }

        // Дисципліни: за семестром, потім за назвою
        disciplinesModel.sort((a, b) => a.semester - b.semester || a.name.localeCompare(b.name, 'uk'))

        // Керівництво дипломними роботами — окремими рядками в кінці списку
        // (по одному на тип: бакалаврська/магістерська), з обраним для захисту
        // семестром навчального року.
        const worksForStaff = byStaffWorks.get(staffId) ?? []
        const worksByType = new Map<string, ScientificWork[]>()
        for (const w of worksForStaff) {
            const arr = worksByType.get(w.work_type) ?? []
            arr.push(w)
            worksByType.set(w.work_type, arr)
        }
        for (const [type, works] of worksByType) {
            const meta = SCIENTIFIC_WORK_META[type as keyof typeof SCIENTIFIC_WORK_META]
            const totalCount = works.reduce((sum, w) => sum + w.student_count, 0)
            const totalHours = Math.round(works.reduce((sum, w) => sum + w.hours, 0) * 100) / 100
            const semester = THESIS_SEMESTER[type as keyof typeof THESIS_SEMESTER] ?? 0
            if (semester === 1) sem1 += totalHours
            else if (semester === 2) sem2 += totalHours

            disciplinesModel.push({
                name: meta.label,
                semester,
                level: '',
                rows: [{
                    typeLabel: 'Керівництво',
                    groupLabel: `${totalCount} ${totalCount === 1 ? 'особа' : 'осіб'}`,
                    hours: totalHours,
                }],
                subtotal: totalHours,
            })
        }

        sem1 = Math.round(sem1 * 100) / 100
        sem2 = Math.round(sem2 * 100) / 100

        teachers.push({
            staff: s,
            sem1,
            sem2,
            total: Math.round((sem1 + sem2) * 100) / 100,
            limit: getTeachingLoadLimit(s, settings),
            disciplines: disciplinesModel,
        })
    }

    // Викладачі: за ієрархією посад, потім за ПІБ
    const posIndex = (p: string) => {
        const i = (POSITIONS as readonly string[]).indexOf(p)
        return i === -1 ? POSITIONS.length : i
    }
    teachers.sort((a, b) =>
        posIndex(a.staff.position) - posIndex(b.staff.position) ||
        a.staff.full_name.localeCompare(b.staff.full_name, 'uk')
    )

    return teachers
}

// ─── Рендер DOCX ──────────────────────────────────────────────────────────────

const FONT = 'Times New Roman'
const THIN = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }
const CELL_BORDERS = { top: THIN, bottom: THIN, left: THIN, right: THIN }

const txt = (text: string, opts: { bold?: boolean; size?: number; italics?: boolean; color?: string } = {}) =>
    new TextRun({ text, font: FONT, bold: opts.bold, italics: opts.italics, size: opts.size ?? 22, color: opts.color })

const cell = (
    children: Paragraph[],
    opts: { width?: number; fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType] } = {},
) =>
    new TableCell({
        children,
        borders: CELL_BORDERS,
        width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
        shading: opts.fill ? { fill: opts.fill } : undefined,
        margins: { top: 40, bottom: 40, left: 80, right: 80 },
    })

const cellText = (
    text: string,
    opts: { bold?: boolean; width?: number; fill?: string; align?: (typeof AlignmentType)[keyof typeof AlignmentType]; size?: number } = {},
) =>
    cell(
        [new Paragraph({ alignment: opts.align, children: [txt(text, { bold: opts.bold, size: opts.size })] })],
        { width: opts.width, fill: opts.fill, align: opts.align },
    )

const pct = (used: number, limit: number): string =>
    limit > 0 ? `${Math.round((used / limit) * 100)}%` : '—'

// Зведена таблиця по всіх викладачах
const buildOverviewTable = (teachers: ReportTeacher[]): Table => {
    const HEAD_FILL = 'E8EEF7'
    const header = new TableRow({
        tableHeader: true,
        children: [
            cellText('№', { bold: true, fill: HEAD_FILL, align: AlignmentType.CENTER, width: 4 }),
            cellText('ПІБ', { bold: true, fill: HEAD_FILL, width: 26 }),
            cellText('Посада', { bold: true, fill: HEAD_FILL, width: 20 }),
            cellText('Ставка', { bold: true, fill: HEAD_FILL, align: AlignmentType.CENTER, width: 8 }),
            cellText('Сем I', { bold: true, fill: HEAD_FILL, align: AlignmentType.CENTER, width: 9 }),
            cellText('Сем II', { bold: true, fill: HEAD_FILL, align: AlignmentType.CENTER, width: 9 }),
            cellText('Разом', { bold: true, fill: HEAD_FILL, align: AlignmentType.CENTER, width: 9 }),
            cellText('Ліміт', { bold: true, fill: HEAD_FILL, align: AlignmentType.CENTER, width: 8 }),
            cellText('%', { bold: true, fill: HEAD_FILL, align: AlignmentType.CENTER, width: 7 }),
        ],
    })

    const rows = teachers.map((t, i) => new TableRow({
        children: [
            cellText(String(i + 1), { align: AlignmentType.CENTER }),
            cellText(t.staff.full_name),
            cellText(t.staff.position),
            cellText(String(t.staff.rate), { align: AlignmentType.CENTER }),
            cellText(fmtHours(t.sem1), { align: AlignmentType.CENTER }),
            cellText(fmtHours(t.sem2), { align: AlignmentType.CENTER }),
            cellText(fmtHours(t.total), { align: AlignmentType.CENTER, bold: true }),
            cellText(String(t.limit), { align: AlignmentType.CENTER }),
            cellText(pct(t.total, t.limit), { align: AlignmentType.CENTER }),
        ],
    }))

    const sum1 = fmtHours(teachers.reduce((s, t) => s + t.sem1, 0))
    const sum2 = fmtHours(teachers.reduce((s, t) => s + t.sem2, 0))
    const sumT = fmtHours(teachers.reduce((s, t) => s + t.total, 0))
    const TOTAL_FILL = 'F2F2F2'
    const totalRow = new TableRow({
        children: [
            cellText('', { fill: TOTAL_FILL }),
            cellText('ПІДСУМОК', { bold: true, fill: TOTAL_FILL }),
            cellText('', { fill: TOTAL_FILL }),
            cellText('', { fill: TOTAL_FILL }),
            cellText(sum1, { bold: true, fill: TOTAL_FILL, align: AlignmentType.CENTER }),
            cellText(sum2, { bold: true, fill: TOTAL_FILL, align: AlignmentType.CENTER }),
            cellText(sumT, { bold: true, fill: TOTAL_FILL, align: AlignmentType.CENTER }),
            cellText('', { fill: TOTAL_FILL }),
            cellText('', { fill: TOTAL_FILL }),
        ],
    })

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [header, ...rows, totalRow],
    })
}

// Таблиця розподілу по одній дисципліні
const buildDisciplineTable = (disc: ReportDiscipline): Table => {
    const HEAD_FILL = 'EFEFEF'
    const header = new TableRow({
        tableHeader: true,
        children: [
            cellText('Вид заняття', { bold: true, fill: HEAD_FILL, width: 40 }),
            cellText('Група / Потік', { bold: true, fill: HEAD_FILL, width: 42 }),
            cellText('Годин', { bold: true, fill: HEAD_FILL, align: AlignmentType.CENTER, width: 18 }),
        ],
    })

    const rows = disc.rows.map(r => new TableRow({
        children: [
            cellText(r.typeLabel),
            cellText(r.groupLabel),
            cellText(fmtHours(r.hours), { align: AlignmentType.CENTER }),
        ],
    }))

    const subtotalRow = new TableRow({
        children: [
            cell([new Paragraph({ children: [txt('Разом по дисципліні', { bold: true })] })],
                { fill: 'F7F7F7' }),
            cellText('', { fill: 'F7F7F7' }),
            cellText(fmtHours(disc.subtotal), { align: AlignmentType.CENTER, bold: true, fill: 'F7F7F7' }),
        ],
    })

    return new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [header, ...rows, subtotalRow],
    })
}

const spacer = (size = 120) => new Paragraph({ spacing: { after: size }, children: [] })

export const buildWorkloadDoc = (
    teachers: ReportTeacher[],
    deptNumber: string,
    deptName: string,
    academicYear: string,
): Document => {
    const dateStr = new Date().toLocaleDateString('uk-UA')
    const centered = (children: TextRun[], opts: { spacingAfter?: number } = {}) =>
        new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: opts.spacingAfter ?? 60 }, children })

    // ── Шапка ──
    const headerParts: Paragraph[] = [
        centered([txt('ЗВІТ ПРО РОЗПОДІЛ НАВЧАЛЬНОГО НАВАНТАЖЕННЯ НПП', { bold: true, size: 28 })], { spacingAfter: 120 }),
        centered([txt(`${deptName}`, { size: 24 })]),
        centered([txt(`Навчальний рік: ${academicYear}    ·    Сформовано: ${dateStr}`, { size: 22 })], { spacingAfter: 240 }),
    ]

    // ── Зведена таблиця ──
    const overview: Paragraph[] = [
        new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { after: 120 }, children: [txt('Зведена таблиця', { bold: true, size: 26 })] }),
    ]

    // ── Секції по викладачах ──
    const teacherSections: (Paragraph | Table)[] = []
    teachers.forEach((t) => {
        const heading = new Paragraph({
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 120, after: 80 },
            children: [
                txt(`${t.staff.full_name} · ${t.staff.position}`, { bold: true, size: 26 }),
            ],
        })
        // Розрив сторінки перед кожним викладачем
        const pageBreak = new Paragraph({ children: [new PageBreak()] })

        const totalLine = new Paragraph({
            spacing: { after: 160 },
            children: [
                txt(`Сем I — ${fmtHours(t.sem1)} год    ·    Сем II — ${fmtHours(t.sem2)} год    ·    Разом — ${fmtHours(t.total)} год`, { size: 22 }),
                txt(`    ·    ліміт ${t.limit} год (${pct(t.total, t.limit)})`, { size: 22, color: '666666' }),
            ],
        })

        teacherSections.push(pageBreak, heading, totalLine)

        if (t.disciplines.length === 0) {
            teacherSections.push(new Paragraph({ children: [txt('Навантаження не розподілено.', { italics: true, color: '888888' })] }))
        }

        t.disciplines.forEach(disc => {
            const suffix = disc.semester > 0
                ? (disc.level ? `   (семестр ${disc.semester} · ${disc.level})` : `   (семестр ${disc.semester})`)
                : ''
            teacherSections.push(new Paragraph({
                spacing: { before: 120, after: 60 },
                children: [
                    txt('▸ ', { bold: true, size: 24 }),
                    txt(disc.name, { bold: true, size: 24 }),
                    ...(suffix ? [txt(suffix, { size: 20, color: '666666' })] : []),
                ],
            }))
            teacherSections.push(buildDisciplineTable(disc))
        })

        teacherSections.push(new Paragraph({
            spacing: { before: 160, after: 80 },
            children: [txt(`РАЗОМ ПО ВИКЛАДАЧУ: ${fmtHours(t.total)} год`, { bold: true, size: 24 })],
        }))
    })

    // ── Виноска ──
    const footnote = new Paragraph({
        spacing: { before: 240 },
        border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC', space: 6 } },
        children: [
            txt('Звіт відображає розподілене аудиторне навантаження (лекції, ГЗ, ПЗ, курсові/контрольні роботи, іспити, заліки) та керівництво дипломними роботами (бакалавр/магістр). ', { italics: true, size: 18, color: '666666' }),
            txt('Години консультацій нараховуються на рівні дисципліни й не розподіляються поіменно; наукова робота (керівництво ад’юнктами/докторантами) у цей звіт не входить.', { italics: true, size: 18, color: '666666' }),
        ],
    })

    return new Document({
        styles: { default: { document: { run: { font: FONT, size: 22 } } } },
        sections: [{
            properties: { page: { margin: { top: 720, bottom: 720, left: 900, right: 720 } } },
            children: [
                ...headerParts,
                ...overview,
                buildOverviewTable(teachers),
                spacer(),
                ...teacherSections,
                footnote,
            ],
        }],
    })
}

export const exportWorkloadDocx = (
    teachers: ReportTeacher[],
    deptNumber: string,
    deptName: string,
    academicYear: string,
) => {
    const doc = buildWorkloadDoc(teachers, deptNumber, deptName, academicYear)
    Packer.toBlob(doc).then(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `Навантаження_Кафедра_№${deptNumber}_${academicYear}.docx`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    })
}
