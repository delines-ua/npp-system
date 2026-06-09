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
