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
    background: 'rgba(30,41,59,0.8)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px',
    backdropFilter: 'blur(10px)',
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
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 124px)' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#f1f5f9', marginBottom: '4px' }}>
                        AI Асистент
                    </h1>
                    <p style={{ fontSize: '14px', color: '#475569' }}>
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
                    background: ollamaReady === null
                        ? 'rgba(107,114,128,0.15)'
                        : ollamaReady
                            ? 'rgba(34,197,94,0.1)'
                            : 'rgba(239,68,68,0.1)',
                    border: `1px solid ${ollamaReady === null ? 'rgba(107,114,128,0.2)' : ollamaReady ? 'rgba(34,197,94,0.25)' : 'rgba(239,68,68,0.25)'}`,
                    color: ollamaReady === null ? '#6b7280' : ollamaReady ? '#4ade80' : '#f87171',
                }}>
                    <div style={{
                        width: '7px', height: '7px', borderRadius: '50%',
                        background: ollamaReady === null ? '#6b7280' : ollamaReady ? '#22c55e' : '#ef4444',
                    }} />
                    {ollamaReady === null ? 'Перевірка...' : ollamaReady ? 'Mistral готова' : 'Модель не завантажена'}
                </div>
            </div>

            {/* Підказки */}
            {messages.length === 0 && (
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ ...card, padding: '20px 24px', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                            <div style={{ padding: '8px', background: 'rgba(37,99,235,0.15)', borderRadius: '8px' }}>
                                <Bot size={18} color="#3b82f6" />
                            </div>
                            <div>
                                <div style={{ fontWeight: '600', fontSize: '14px', color: '#e2e8f0' }}>
                                    Асистент знає наказ № 155/291
                                </div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>
                                    Допоможе з питаннями розподілу навантаження НПП
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: '#475569' }}>
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
                                    background: 'rgba(30,41,59,0.6)',
                                    border: '1px solid rgba(255,255,255,0.06)',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    color: '#94a3b8',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.2s',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(37,99,235,0.1)'
                                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(37,99,235,0.25)'
                                    ;(e.currentTarget as HTMLButtonElement).style.color = '#e2e8f0'
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(30,41,59,0.6)'
                                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.06)'
                                    ;(e.currentTarget as HTMLButtonElement).style.color = '#94a3b8'
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
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#374151', padding: '40px', fontSize: '14px' }}>
                        Задайте питання або оберіть з підказок вище
                    </div>
                )}

                {messages.map((msg, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', gap: '10px' }}>
                        {msg.role === 'assistant' && (
                            <div style={{ width: '32px', height: '32px', background: 'rgba(37,99,235,0.2)', border: '1px solid rgba(37,99,235,0.3)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                                <Bot size={16} color="#3b82f6" />
                            </div>
                        )}
                        <div style={{ maxWidth: '75%' }}>
                            <div style={{
                                padding: '12px 16px',
                                borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                                background: msg.role === 'user'
                                    ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                                    : 'rgba(255,255,255,0.04)',
                                border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.06)',
                                fontSize: '14px',
                                color: '#e2e8f0',
                                lineHeight: '1.7',
                                whiteSpace: 'pre-wrap',
                                boxShadow: msg.role === 'user' ? '0 4px 15px rgba(37,99,235,0.2)' : 'none',
                            }}>
                                {msg.content || (isLoading && i === messages.length - 1 ? (
                                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                        {[0, 1, 2].map(j => (
                                            <div key={j} style={{ width: '6px', height: '6px', background: '#3b82f6', borderRadius: '50%', animation: `bounce 1s ${j * 0.2}s infinite` }} />
                                        ))}
                                    </div>
                                ) : '')}
                            </div>
                            {msg.time && (
                                <div style={{ fontSize: '11px', color: '#374151', marginTop: '4px', textAlign: msg.role === 'user' ? 'right' : 'left', paddingLeft: msg.role === 'assistant' ? '4px' : '0' }}>
                                    {msg.time}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Поле вводу */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                    placeholder="Задайте питання по наказу №155/291..."
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '14px 18px',
                        background: 'rgba(30,41,59,0.8)',
                        border: '1px solid rgba(255,255,255,0.08)',
                        borderRadius: '12px',
                        fontSize: '14px',
                        color: '#e2e8f0',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    style={{
                        width: '48px',
                        height: '48px',
                        background: isLoading || !input.trim() ? 'rgba(37,99,235,0.3)' : '#2563eb',
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