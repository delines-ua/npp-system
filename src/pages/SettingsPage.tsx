import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useSettings } from '../contexts/SettingsContext'
import { DEFAULT_WORKLOAD_SETTINGS, type WorkloadSettings } from '../utils/settings'
import { resetWorkloadAssignments } from '../services/workloadAssignments'
import { resetInstituteGroups } from '../services/instituteGroups'
import ConfirmDeleteModal from '../components/ConfirmDeleteModal'
import { Settings as SettingsIcon, Save, RotateCcw, Check, ShieldAlert, Trash2, Layers, ClipboardList } from 'lucide-react'

const card: React.CSSProperties = {
    background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '16px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05), 0 4px 16px rgba(0,0,0,0.08)',
}
const inputStyle: React.CSSProperties = {
    padding: '9px 12px', background: '#f9fafb', border: '1px solid #d1d5db',
    borderRadius: '8px', fontSize: '14px', color: '#111827', outline: 'none', width: '160px', boxSizing: 'border-box',
}
const lbl: React.CSSProperties = { display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px', fontWeight: '500' }

type ResetTarget = 'workload' | 'groups'

export default function SettingsPage() {
    const { settings, updateSettings, academicYear } = useSettings()
    const queryClient = useQueryClient()
    const [draft, setDraft] = useState<WorkloadSettings>(settings)
    const [saved, setSaved] = useState(false)

    const [resetTarget, setResetTarget] = useState<ResetTarget | null>(null)
    const [resetting, setResetting] = useState(false)
    const [resetMsg, setResetMsg] = useState('')

    const dirty = JSON.stringify(draft) !== JSON.stringify(settings)

    const runReset = async () => {
        if (!resetTarget) return
        setResetting(true)
        setResetMsg('')
        try {
            if (resetTarget === 'workload') {
                const n = await resetWorkloadAssignments(academicYear)
                await queryClient.invalidateQueries()
                setResetMsg(`Видалено розподілених годин (призначень): ${n} · ${academicYear}`)
            } else {
                const { groups, links } = await resetInstituteGroups(academicYear)
                await queryClient.invalidateQueries()
                setResetMsg(`Видалено груп: ${groups}, прив'язок до дисциплін: ${links} · ${academicYear}`)
            }
            setResetTarget(null)
        } catch {
            setResetMsg('Помилка під час видалення. Спробуйте ще раз.')
        }
        setResetting(false)
    }

    const save = () => {
        updateSettings({
            ...draft,
            overrideCivilian: Math.max(0, Math.round(draft.overrideCivilian)),
            overrideMilitary: Math.max(0, Math.round(draft.overrideMilitary)),
        })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
    }

    const ModeOption = ({ value, title, desc }: { value: WorkloadSettings['mode']; title: string; desc: string }) => (
        <div onClick={() => setDraft({ ...draft, mode: value })}
            style={{
                flex: 1, padding: '14px 16px', borderRadius: '12px', cursor: 'pointer',
                border: `2px solid ${draft.mode === value ? '#f97316' : '#e5e7eb'}`,
                background: draft.mode === value ? '#fff7ed' : '#fafafa', transition: 'all 0.15s',
            }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <div style={{
                    width: '16px', height: '16px', borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${draft.mode === value ? '#f97316' : '#d1d5db'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                    {draft.mode === value && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316' }} />}
                </div>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{title}</span>
            </div>
            <div style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '24px' }}>{desc}</div>
        </div>
    )

    return (
        <div style={{ maxWidth: '720px' }}>
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <SettingsIcon size={22} color="#6b7280" /> Налаштування
                </h1>
                <p style={{ fontSize: '14px', color: '#6b7280' }}>Параметри розрахунку навантаження НПП</p>
            </div>

            <div style={{ ...card, padding: '24px', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>Ліміт навчального навантаження</h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '16px' }}>
                    Визначає максимальний обсяг навчального навантаження на 1 ставку (для фонду кафедри)
                </p>

                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
                    <ModeOption value="regulatory" title="За Наказом 155/291"
                        desc="Частка навч. роботи (Табл.1, за посадою) × службовий час (Табл.2, за категорією)" />
                    <ModeOption value="override" title="Ручний ліміт"
                        desc="Фіксовані години на ставку за категорією — гнучке планування" />
                </div>

                <div style={{
                    display: 'flex', gap: '24px', padding: '18px', borderRadius: '12px',
                    background: draft.mode === 'override' ? '#fff7ed' : '#f9fafb',
                    border: `1px solid ${draft.mode === 'override' ? '#fed7aa' : '#f3f4f6'}`,
                    opacity: draft.mode === 'override' ? 1 : 0.5, transition: 'all 0.15s',
                }}>
                    <div>
                        <label style={lbl}>Цивільні (год / ставка)</label>
                        <input type="number" min={0} disabled={draft.mode !== 'override'} style={inputStyle}
                            value={draft.overrideCivilian}
                            onChange={e => setDraft({ ...draft, overrideCivilian: Number(e.target.value) })} />
                    </div>
                    <div>
                        <label style={lbl}>Військовослужбовці (год / ставка)</label>
                        <input type="number" min={0} disabled={draft.mode !== 'override'} style={inputStyle}
                            value={draft.overrideMilitary}
                            onChange={e => setDraft({ ...draft, overrideMilitary: Number(e.target.value) })} />
                    </div>
                </div>

                {draft.mode === 'override' && (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginTop: '14px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
                        <ShieldAlert size={15} color="#b45309" style={{ flexShrink: 0, marginTop: '1px' }} />
                        <span style={{ fontSize: '12px', color: '#92400e' }}>
                            Регуляторні норми зберігаються — перемикання на «За Наказом 155/291» повертає розрахунок за законом без втрати даних.
                        </span>
                    </div>
                )}

                <div style={{ display: 'flex', gap: '10px', marginTop: '20px', alignItems: 'center' }}>
                    <button onClick={save} disabled={!dirty}
                        style={{ padding: '10px 20px', background: dirty ? '#f97316' : '#e5e7eb', color: dirty ? '#fff' : '#9ca3af', border: 'none', borderRadius: '8px', cursor: dirty ? 'pointer' : 'default', fontSize: '14px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Save size={16} /> Зберегти
                    </button>
                    <button onClick={() => setDraft(DEFAULT_WORKLOAD_SETTINGS)}
                        style={{ padding: '10px 16px', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <RotateCcw size={15} /> За замовчуванням
                    </button>
                    {saved && (
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: '#16a34a', fontSize: '13px', fontWeight: '600' }}>
                            <Check size={16} /> Збережено
                        </span>
                    )}
                </div>
            </div>

            <p style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '28px' }}>
                Налаштування зберігаються локально у браузері та застосовуються до фонду навантаження кафедри.
            </p>

            {/* ── Небезпечна зона ─────────────────────────────────────────── */}
            <div style={{ ...card, padding: '24px', border: '1px solid #fecaca', boxShadow: 'none' }}>
                <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#b91c1c', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ShieldAlert size={17} /> Небезпечна зона
                </h3>
                <p style={{ fontSize: '13px', color: '#9ca3af', marginBottom: '18px' }}>
                    Незворотні дії для навчального року <b style={{ color: '#dc2626' }}>{academicYear}</b>.
                    Кожна потребує ручного підтвердження введенням слова «DELETE».
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <DangerRow
                        icon={<ClipboardList size={16} color="#dc2626" />}
                        title="Скинути розподілене навантаження"
                        desc={`Видаляє всі призначення НПП (розподілені години) за ${academicYear}. Самі дисципліни та групи лишаються.`}
                        onClick={() => { setResetMsg(''); setResetTarget('workload') }}
                    />
                    <DangerRow
                        icon={<Layers size={16} color="#dc2626" />}
                        title="Скинути навчальні групи"
                        desc={`Видаляє всі групи за ${academicYear} та їх прив'язки до дисциплін. Потрібно перед повторним імпортом «Додаток 2».`}
                        onClick={() => { setResetMsg(''); setResetTarget('groups') }}
                    />
                </div>

                {resetMsg && (
                    <div style={{ marginTop: '16px', padding: '10px 14px', background: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '8px', fontSize: '13px' }}>
                        ✓ {resetMsg}
                    </div>
                )}
            </div>

            <ConfirmDeleteModal
                open={resetTarget === 'workload'}
                title="Скинути розподілене навантаження?"
                message={<>Буде <b>назавжди видалено всі розподілені години</b> (призначення НПП) за навчальний рік <b>{academicYear}</b>. Дисципліни та групи не зачіпаються. Відновити дані буде неможливо.</>}
                confirmLabel="Видалити навантаження"
                busy={resetting}
                onConfirm={runReset}
                onClose={() => setResetTarget(null)}
            />
            <ConfirmDeleteModal
                open={resetTarget === 'groups'}
                title="Скинути навчальні групи?"
                message={<>Буде <b>назавжди видалено всі навчальні групи</b> за навчальний рік <b>{academicYear}</b> разом із їх прив'язками до дисциплін. Після цього імпортуйте «Додаток 2» заново. Відновити дані буде неможливо.</>}
                confirmLabel="Видалити групи"
                busy={resetting}
                onConfirm={runReset}
                onClose={() => setResetTarget(null)}
            />
        </div>
    )
}

// ── Рядок небезпечної дії ─────────────────────────────────────────────────────
function DangerRow({ icon, title, desc, onClick }: {
    icon: React.ReactNode; title: string; desc: string; onClick: () => void
}) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 16px', background: '#fff7f7', border: '1px solid #fee2e2', borderRadius: '12px' }}>
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', fontSize: '14px', fontWeight: '600', color: '#111827', marginBottom: '3px' }}>
                    {icon} {title}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', lineHeight: 1.5 }}>{desc}</div>
            </div>
            <button onClick={onClick}
                style={{ flexShrink: 0, padding: '8px 14px', background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '8px', cursor: 'pointer', fontSize: '13px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Trash2 size={14} /> Скинути
            </button>
        </div>
    )
}
