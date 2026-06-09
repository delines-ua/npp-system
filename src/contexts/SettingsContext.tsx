import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import {
    loadSettings, saveSettings, type WorkloadSettings,
    loadAcademicYear, saveAcademicYear,
} from '../utils/settings'

interface SettingsCtx {
    settings: WorkloadSettings
    updateSettings: (s: WorkloadSettings) => void
    academicYear: string
    setAcademicYear: (year: string) => void
}

const SettingsContext = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<WorkloadSettings>(loadSettings)
    const [academicYear, setAcademicYearState] = useState<string>(loadAcademicYear)

    const updateSettings = useCallback((s: WorkloadSettings) => {
        setSettings(s)
        saveSettings(s)
    }, [])
    const setAcademicYear = useCallback((year: string) => {
        setAcademicYearState(year)
        saveAcademicYear(year)
    }, [])

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, academicYear, setAcademicYear }}>
            {children}
        </SettingsContext.Provider>
    )
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsCtx {
    const ctx = useContext(SettingsContext)
    if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
    return ctx
}
