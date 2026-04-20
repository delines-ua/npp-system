import { useState, useEffect, useRef } from 'react'
import { askAssistant, checkOllama } from '../services/ollama'
import { Bot, Send, Zap, FileText, HelpCircle } from 'lucide-react'

interface Message {
    role: 'user' | 'assistant'
    content: string
    time?: string
}

const SUGGESTED_QUESTIONS = [
    { icon: '📋', text: 'Яка норма годин для викладача з вислугою 12 років?' },
    { icon: '📐', text: 'Як розрахувати навантаження за лекції якщо є 2 потоки?' },
    { icon: '✈️', text: 'Що робити якщо викладач пішов у відрядження на місяць?' },
    { icon: '👨‍💼', text: 'Яка норма для начальника кафедри що суміщає зі службою?' },
    { icon: '📝', text: 'Скільки годин на керівництво магістерською роботою?' },
    { icon: '👥', text: 'Як розподілити дисципліну між двома НПП?' },
]

const card = {
    background: '#ffffff',
    border: '1px solid #e5e7eb',
    borderRadius: '16px',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
}

export default function AssistantPage() {
    const [messages, setMessages] = useState<Message[]>([])
    const [input, setInput] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [ollamaReady, setOllamaReady] = useState<boolean | null>(null)
    const bottomRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        checkOllama().then(setOllamaReady)
    }, [])

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const getTime = () => new Date().toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return

        setMessages(prev => [...prev, { role: 'user', content: text, time: getTime() }])
        setInput('')
        setIsLoading(true)
        setMessages(prev => [...prev, { role: 'assistant', content: '', time: getTime() }])

        try {
            await askAssistant(text, chunk => {
                setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                        ...updated[updated.length - 1],
                        content: updated[updated.length - 1].content + chunk
                    }
                    return updated
                })
            })
        } catch {
            setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                    ...updated[updated.length - 1],
                    content: 'Помилка: не вдалось отримати відповідь. Перевірте чи запущена Ollama.'
                }
                return updated
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', marginBottom: '4px' }}>
                        AI Асистент
                    </h1>
                    <p style={{ fontSize: '14px', color: '#6b7280' }}>
                        Інтелектуальний помічник по наказу № 155/291
                    </p>
                </div>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 16px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '500',
                    background: ollamaReady === null ? '#f9fafb' : ollamaReady ? '#f0fdf4' : '#fef2f2',
                    border: `1px solid ${ollamaReady === null ? '#e5e7eb' : ollamaReady ? '#bbf7d0' : '#fecaca'}`,
                    color: ollamaReady === null ? '#9ca3af' : ollamaReady ? '#16a34a' : '#dc2626',
                }}>
                    <div style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: ollamaReady === null ? '#9ca3af' : ollamaReady ? '#22c55e' : '#ef4444',
                    }} />
                    {ollamaReady === null ? 'Перевірка...' : ollamaReady ? 'Mistral готова' : 'Модель не завантажена'}
                </div>
            </div>

            {/* Підказки */}
            {messages.length === 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ ...card, padding: '20px 24px', marginBottom: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ padding: '8px', background: '#fff7ed', borderRadius: '8px', border: '1px solid #fed7aa' }}>
                                <Bot size={18} color="#f97316" />
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '14px', color: '#111827' }}>
                                    Асистент знає наказ № 155/291
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Допоможе з питаннями розподілу навантаження НПП
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#6b7280' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Zap size={13} color="#f59e0b" /> Швидкі відповіді
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <FileText size={13} color="#3b82f6" /> По нормативним документам
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <HelpCircle size={13} color="#22c55e" /> Нетипові ситуації
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {SUGGESTED_QUESTIONS.map(q => (
                            <button
                                key={q.text}
                                onClick={() => sendMessage(q.text)}
                                style={{
                                    padding: '12px 16px',
                                    background: '#ffffff',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    color: '#374151',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = '#fff7ed'
                                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#fed7aa'
                                    ;(e.currentTarget as HTMLButtonElement).style.color = '#111827'
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = '#ffffff'
                                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = '#e5e7eb'
                                    ;(e.currentTarget as HTMLButtonElement).style.color = '#374151'
                                }}
                            >
                                <span style={{ fontSize: '16px' }}>{q.icon}</span>
                                {q.text}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Чат */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                ...card,
                padding: '20px',
                marginBottom: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#d1d5db', padding: '40px', fontSize: '14px' }}>
                        Задайте питання або оберіть з підказок вище
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px' }}>
                        {msg.role === 'assistant' && (
                            <div style={{ width: '32px', height: '32px', background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                                <Bot size={16} color="#f97316" />
                            </div>
                        )}
                        <div style={{ maxWidth: '75%' }}>
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                background: msg.role === 'user'
                                    ? 'linear-gradient(135deg, #f97316, #ea580c)'
                                    : '#f9fafb',
                                border: msg.role === 'user' ? 'none' : '1px solid #e5e7eb',
                                fontSize: '14px',
                                color: msg.role === 'user' ? '#fff' : '#374151',
                                lineHeight: '1.7',
                                whiteSpace: 'pre-wrap',
                                boxShadow: msg.role === 'user' ? '0 4px 12px rgba(249,115,22,0.2)' : 'none',
                            }}>
                                {msg.content || (isLoading && i === messages.length - 1 ? (
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {[0, 1, 2].map(j => (
                                            <div key={j} style={{ width: '6px', height: '6px', background: '#f97316', borderRadius: '50%', animation: `bounce 1s ${j * 0.2}s infinite` }} />
                                        ))}
                                    </div>
                                ) : '')}
                            </div>
                            {msg.time && (
                                <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px', textAlign: msg.role === 'user' ? 'right' : 'left', paddingLeft: msg.role === 'assistant' ? '4px' : '0' }}>
                                    {msg.time}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Поле вводу */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                    placeholder="Задайте питання по наказу №155/291..."
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '12px 18px',
                        background: '#ffffff',
                        border: '1px solid #d1d5db',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: '#111827',
                        outline: 'none',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
                    }}
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    style={{
                        width: '46px',
                        height: '46px',
                        background: isLoading || !input.trim() ? '#fed7aa' : '#f97316',
                        border: 'none',
                        borderRadius: '12px',
                        cursor: isLoading || !input.trim() ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.2s',
                    }}
                >
                    <Send size={18} color="#fff" />
                </button>
            </div>
        </div>
    )
}