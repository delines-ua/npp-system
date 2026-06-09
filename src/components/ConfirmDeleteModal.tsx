import { useState, useEffect, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface Props {
    open: boolean
    title: string
    message: ReactNode
    /** Слово, яке користувач має ввести вручну для підтвердження (за замовч. "DELETE") */
    confirmWord?: string
    confirmLabel?: string
    busy?: boolean
    onConfirm: () => void
    onClose: () => void
}

// Підтвердження небезпечної дії в стилі GitHub — треба ввести точне слово, щоб розблокувати кнопку.
export default function ConfirmDeleteModal({
    open, title, message, confirmWord = 'DELETE', confirmLabel = 'Видалити назавжди', busy = false, onConfirm, onClose,
}: Props) {
    const [text, setText] = useState('')

    // Скидаємо введене при кожному відкритті
    useEffect(() => { if (open) setText('') }, [open])

    if (!open) return null

    const matches = text === confirmWord

    return (
        <div onClick={busy ? undefined : onClose}
            style={{
                position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.55)', zIndex: 1000,
                display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
            }}>
            <div onClick={e => e.stopPropagation()}
                style={{
                    background: '#fff', borderRadius: '16px', maxWidth: '460px', width: '100%',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden',
                }}>
                <div style={{ padding: '20px 22px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <AlertTriangle size={18} color="#dc2626" />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', flex: 1 }}>{title}</h3>
                    <button onClick={onClose} disabled={busy} style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: busy ? 'default' : 'pointer', padding: '2px' }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ padding: '20px 22px' }}>
                    <div style={{ fontSize: '13.5px', color: '#374151', lineHeight: 1.55, marginBottom: '16px' }}>{message}</div>

                    <label style={{ display: 'block', fontSize: '12px', color: '#6b7280', marginBottom: '6px' }}>
                        Для підтвердження введіть <b style={{ color: '#dc2626', fontFamily: 'monospace' }}>{confirmWord}</b>:
                    </label>
                    <input
                        autoFocus
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && matches && !busy) onConfirm() }}
                        placeholder={confirmWord}
                        disabled={busy}
                        style={{
                            width: '100%', boxSizing: 'border-box', padding: '10px 12px', fontSize: '14px',
                            fontFamily: 'monospace', border: `1px solid ${matches ? '#fca5a5' : '#d1d5db'}`,
                            borderRadius: '8px', outline: 'none', background: '#f9fafb', color: '#111827',
                        }}
                    />
                </div>

                <div style={{ padding: '14px 22px', background: '#f9fafb', borderTop: '1px solid #f3f4f6', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                    <button onClick={onClose} disabled={busy}
                        style={{ padding: '9px 16px', background: '#fff', color: '#6b7280', border: '1px solid #e5e7eb', borderRadius: '8px', cursor: busy ? 'default' : 'pointer', fontSize: '13px', fontWeight: '500' }}>
                        Скасувати
                    </button>
                    <button onClick={onConfirm} disabled={!matches || busy}
                        style={{
                            padding: '9px 18px', borderRadius: '8px', border: 'none', fontSize: '13px', fontWeight: '600',
                            color: '#fff', background: matches && !busy ? '#dc2626' : '#fca5a5',
                            cursor: matches && !busy ? 'pointer' : 'default',
                        }}>
                        {busy ? 'Видалення…' : confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}
