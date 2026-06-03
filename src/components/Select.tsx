import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
    value: string
    label: string
}

interface SelectProps {
    value: string
    onChange: (value: string) => void
    options: SelectOption[]
    placeholder?: string
    style?: React.CSSProperties
}

export default function Select({ value, onChange, options, placeholder = 'Оберіть...', style }: SelectProps) {
    const [open, setOpen] = useState(false)
    const [openUp, setOpenUp] = useState(false)
    const ref = useRef<HTMLDivElement>(null)

    const selected = options.find(o => o.value === value)

    const handleToggle = useCallback(() => {
        if (!open && ref.current) {
            const rect = ref.current.getBoundingClientRect()
            setOpenUp(window.innerHeight - rect.bottom < 220)
        }
        setOpen(v => !v)
    }, [open])

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
        }
        const keyHandler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
        document.addEventListener('mousedown', handler)
        document.addEventListener('keydown', keyHandler)
        return () => {
            document.removeEventListener('mousedown', handler)
            document.removeEventListener('keydown', keyHandler)
        }
    }, [])

    return (
        <div ref={ref} style={{ position: 'relative', ...style }}>
            <button
                type="button"
                onClick={handleToggle}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '8px', width: '100%',
                    padding: '8px 11px',
                    background: '#f9fafb',
                    border: `1px solid ${open ? '#f97316' : '#d1d5db'}`,
                    borderRadius: '8px',
                    fontSize: '13px',
                    color: selected ? '#111827' : '#9ca3af',
                    cursor: 'pointer', outline: 'none', textAlign: 'left',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                    boxShadow: open ? '0 0 0 3px rgba(249,115,22,0.1)' : 'none',
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown
                    size={14}
                    style={{
                        flexShrink: 0, color: '#9ca3af',
                        transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s ease',
                    }}
                />
            </button>

            {open && (
                <div style={{
                    position: 'absolute',
                    [openUp ? 'bottom' : 'top']: 'calc(100% + 4px)',
                    left: 0, right: 0,
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '10px',
                    boxShadow: '0 8px 28px rgba(0,0,0,0.12)',
                    zIndex: 9999,
                    maxHeight: '220px',
                    overflowY: 'auto',
                    padding: '4px',
                }}>
                    {options.map(opt => {
                        const isSelected = opt.value === value
                        return (
                            <div
                                key={opt.value}
                                onClick={() => { onChange(opt.value); setOpen(false) }}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '8px 10px',
                                    borderRadius: '7px',
                                    fontSize: '13px',
                                    cursor: 'pointer',
                                    color: isSelected ? '#ea580c' : '#111827',
                                    background: isSelected ? '#fff7ed' : 'transparent',
                                    fontWeight: isSelected ? '600' : '400',
                                    transition: 'background 0.1s',
                                    userSelect: 'none',
                                }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f9fafb' }}
                                onMouseLeave={e => { e.currentTarget.style.background = isSelected ? '#fff7ed' : 'transparent' }}
                            >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {opt.label}
                                </span>
                                {isSelected && <Check size={13} style={{ flexShrink: 0, color: '#ea580c' }} />}
                            </div>
                        )
                    })}
                    {options.length === 0 && (
                        <div style={{ padding: '10px', fontSize: '13px', color: '#9ca3af', textAlign: 'center' }}>
                            Немає варіантів
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
