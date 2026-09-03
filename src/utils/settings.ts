// Налаштування розрахунку навантаження.
// Дозволяє планувальнику тимчасово перевизначати норми Наказу 155/291
// (режим "override"), не видаляючи регуляторну логіку (режим "regulatory").

import { DEFAULT_DIPLOMA_MENTORING_HOURS, type DiplomaMentoringHours } from './lawNorms'

export type WorkloadMode = 'regulatory' | 'override'

export interface WorkloadSettings {
    // 'regulatory' — ліміт навч. навантаження = частка (Табл.1) × службовий час (Табл.2)
    // 'override'   — ручний ліміт: фіксовані години на ставку за категорією
    mode: WorkloadMode
    overrideCivilian: number   // год/ставка для цивільних
    overrideMilitary: number   // год/ставка для військовослужбовців
    // Керівництво дипломниками: години за 1 особу для бакалаврської/магістерської
    // роботи та наукового керівництва ад'юнктом/докторантом
    diplomaMentoringHours: DiplomaMentoringHours
}

export const DEFAULT_WORKLOAD_SETTINGS: WorkloadSettings = {
    mode: 'override',
    overrideCivilian: 460,
    overrideMilitary: 550,
    diplomaMentoringHours: DEFAULT_DIPLOMA_MENTORING_HOURS,
}

// ─── Обраний навчальний рік (глобальний для UI) ──────────────────────────────
export const ACADEMIC_YEARS = ['2024-2025', '2025-2026', '2026-2027', '2027-2028']
export const DEFAULT_ACADEMIC_YEAR = '2026-2027'

const YEAR_KEY = 'npp.academicYear'

export const loadAcademicYear = (): string => {
    try {
        return localStorage.getItem(YEAR_KEY) || DEFAULT_ACADEMIC_YEAR
    } catch {
        return DEFAULT_ACADEMIC_YEAR
    }
}

export const saveAcademicYear = (year: string): void => {
    try {
        localStorage.setItem(YEAR_KEY, year)
    } catch {
        // ignore
    }
}

const STORAGE_KEY = 'npp.workloadSettings'

export const loadSettings = (): WorkloadSettings => {
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return DEFAULT_WORKLOAD_SETTINGS
        const parsed = JSON.parse(raw)
        return {
            ...DEFAULT_WORKLOAD_SETTINGS,
            ...parsed,
            diplomaMentoringHours: { ...DEFAULT_DIPLOMA_MENTORING_HOURS, ...parsed.diplomaMentoringHours },
        }
    } catch {
        return DEFAULT_WORKLOAD_SETTINGS
    }
}

export const saveSettings = (s: WorkloadSettings): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
    } catch {
        // ignore (приватний режим тощо)
    }
}
