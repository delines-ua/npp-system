// Налаштування розрахунку навантаження.
// Дозволяє планувальнику тимчасово перевизначати норми Наказу 155/291
// (режим "override"), не видаляючи регуляторну логіку (режим "regulatory").

export type WorkloadMode = 'regulatory' | 'override'

export interface WorkloadSettings {
    // 'regulatory' — ліміт навч. навантаження = частка (Табл.1) × службовий час (Табл.2)
    // 'override'   — ручний ліміт: фіксовані години на ставку за категорією
    mode: WorkloadMode
    overrideCivilian: number   // год/ставка для цивільних
    overrideMilitary: number   // год/ставка для військовослужбовців
}

export const DEFAULT_WORKLOAD_SETTINGS: WorkloadSettings = {
    mode: 'override',
    overrideCivilian: 460,
    overrideMilitary: 550,
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
        return { ...DEFAULT_WORKLOAD_SETTINGS, ...JSON.parse(raw) }
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
