import * as XLSX from 'xlsx'
import type { InstituteGroupInput } from '../services/instituteGroups'

export interface ParsedGroup extends InstituteGroupInput {
    zaochna: boolean   // заочна форма (визначається за макетом/назвою) — у БД не зберігається
}

// Блоки "року навчання" у макеті Додатка 2:
// [перша колонка блоку ("Курс"), курс (1–4/1–2), магістратура?]
const BLOCKS: [number, number, boolean][] = [
    [3, 1, false],   // І рік (бакалавр)
    [6, 2, false],   // ІІ рік
    [9, 3, false],   // ІІІ рік
    [12, 4, false],  // ІV рік
    [15, 1, true],   // І рік (магістр)
    [18, 2, true],   // ІІ рік (магістр)
]

interface SpecInfo { prefix: string; code: string; zaochna: boolean }

// "G5 (172)" → {prefix:'G5', code:'172'};  "G5 (заочно)" → {prefix:'G5', zaochna:true}
const parseSpec = (label: string): SpecInfo => {
    const m = label.match(/^\s*(\S+)\s*\(([^)]*)\)/)
    if (!m) return { prefix: label.trim(), code: '', zaochna: false }
    const inside = m[2].trim()
    if (/заочн/i.test(inside)) return { prefix: m[1].trim(), code: '', zaochna: true }
    return { prefix: m[1].trim(), code: inside.replace(/\D/g, ''), zaochna: false }
}

// Витягує рік з заголовка ("...на 2026-2027 навчальний рік") → "2026-2027"
export const detectAcademicYear = (ws: XLSX.WorkSheet, fallback: string): string => {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
    for (const r of rows.slice(0, 8)) {
        for (const cell of r) {
            const m = String(cell ?? '').match(/(20\d{2})\s*[-–/]\s*(20\d{2})/)
            if (m) return `${m[1]}-${m[2]}`
        }
    }
    return fallback
}

// Парсить аркуш "Нумерація навчальних груп" (Додаток 2) → перелік груп
export const parseGroupsSheet = (ws: XLSX.WorkSheet, academicYear: string): ParsedGroup[] => {
    const rows: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })

    const prefixCode: Record<string, string> = {}
    const groups: ParsedGroup[] = []
    let faculty = 0
    let curSpec: SpecInfo | null = null

    for (let i = 0; i < rows.length; i++) {
        const r = rows[i]
        if (!r) continue

        const c0 = String(r[0] ?? '').trim()
        if (/^\d+$/.test(c0)) faculty = Number(c0)

        const label = String(r[1] ?? '').trim()
        if (label) {
            const s = parseSpec(label)
            if (s.code) prefixCode[s.prefix] = s.code
            curSpec = s
        }
        if (!curSpec || faculty === 0) continue

        const code = curSpec.code || prefixCode[curSpec.prefix] || ''
        const zaochna = curSpec.zaochna

        for (const [startCol, course, isMasters] of BLOCKS) {
            const name = String(r[startCol + 1] ?? '').trim()
            if (!name || !/\d/.test(name)) continue   // порожньо або не схоже на групу
            const cntRaw = Number(r[startCol + 2])
            groups.push({
                group_name: name,
                faculty,
                course,
                is_masters: isMasters,
                specialty_code: code,
                student_count: Number.isNaN(cntRaw) ? 0 : cntRaw,
                academic_year: academicYear,
                zaochna,
            })
        }
    }
    return groups
}
