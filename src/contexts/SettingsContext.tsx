import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { loadSettings, saveSettings, type WorkloadSettings } from '../utils/settings'

interface SettingsCtx {
    settings: WorkloadSettings
    updateSettings: (s: WorkloadSettings) => void
}

const SettingsContext = createContext<SettingsCtx | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<WorkloadSettings>(loadSettings)
    const updateSettings = useCallback((s: WorkloadSettings) => {
        setSettings(s)
        saveSettings(s)
    }, [])
    return (
        <SettingsContext.Provider value={{ settings, updateSettings }}>
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
