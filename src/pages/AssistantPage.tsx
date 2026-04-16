import { useState, useEffect, useRef } from 'react'
import { askAssistant, checkOllama } from '../services/ollama'

interface Message {
    role: 'user' | 'assistant'
    content: string
}

const SUGGESTED_QUESTIONS = [
    'Яка норма годин для викладача з вислугою 12 років?',
    'Як розрахувати навантаження за лекції якщо є 2 потоки по 30 студентів?',
    'Що робити якщо викладач пішов у відрядження на місяць?',
    'Яка норма для начальника кафедри що суміщає зі службовими обов\'язками?',
    'Скільки годин виділяється на керівництво магістерською роботою?',
    'Як розподілити навантаження між двома НПП на одну дисципліну?',
]

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

    const sendMessage = async (text: string) => {
        if (!text.trim() || isLoading) return

        const userMessage: Message = { role: 'user', content: text }
        setMessages(prev => [...prev, userMessage])
        setInput('')
        setIsLoading(true)

        const assistantMessage: Message = { role: 'assistant', content: '' }
        setMessages(prev => [...prev, assistantMessage])

        try {
            await askAssistant(text, (chunk) => {
                setMessages(prev => {
                    const updated = [...prev]
                    updated[updated.length - 1] = {
                        role: 'assistant',
                        content: updated[updated.length - 1].content + chunk
                    }
                    return updated
                })
            })
        } catch {
            setMessages(prev => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                    role: 'assistant',
                    content: 'Помилка: не вдалось отримати відповідь від AI. Перевірте чи запущена Ollama і завантажена модель mistral.'
                }
                return updated
            })
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 96px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h1 style={{ margin: 0, fontSize: '24px', color: '#1e293b' }}>AI Асистент</h1>
                <div style={{
                    padding: '6px 14px',
                    borderRadius: '20px',
                    fontSize: '13px',
                    fontWeight: '600',
                    background: ollamaReady === null ? '#f1f5f9' : ollamaReady ? '#dcfce7' : '#fee2e2',
                    color: ollamaReady === null ? '#64748b' : ollamaReady ? '#16a34a' : '#dc2626',
                }}>
                    {ollamaReady === null ? 'Перевірка...' : ollamaReady ? 'Mistral готова' : 'Модель не завантажена'}
                </div>
            </div>

            {/* Підказки */}
            {messages.length === 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '14px', color: '#64748b', marginBottom: '12px' }}>
                        Асистент знає наказ № 155/291 і допоможе з питаннями розподілу навантаження:
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {SUGGESTED_QUESTIONS.map(q => (
                            <button
                                key={q}
                                onClick={() => sendMessage(q)}
                                style={{
                                    padding: '8px 14px',
                                    background: '#f0f9ff',
                                    border: '1px solid #bae6fd',
                                    borderRadius: '20px',
                                    fontSize: '13px',
                                    color: '#0369a1',
                                    cursor: 'pointer',
                                }}
                            >
                                {q}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Чат */}
            <div style={{
                flex: 1,
                overflowY: 'auto',
                background: '#fff',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                marginBottom: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
            }}>
                {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px', fontSize: '14px' }}>
                        Задайте питання по наказу №155/291 або розподілу навантаження НПП
                    </div>
                )}
                {messages.map((msg, i) => (
                    <div key={i} style={{
                        display: 'flex',
                        justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                        <div style={{
                            maxWidth: '75%',
                            padding: '12px 16px',
                            borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                            background: msg.role === 'user' ? '#3b82f6' : '#f1f5f9',
                            color: msg.role === 'user' ? '#fff' : '#1e293b',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            whiteSpace: 'pre-wrap',
                        }}>
                            {msg.content || (isLoading && i === messages.length - 1 ? '...' : '')}
                        </div>
                    </div>
                ))}
                <div ref={bottomRef} />
            </div>

            {/* Поле вводу */}
            <div style={{ display: 'flex', gap: '12px' }}>
                <input
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage(input)}
                    placeholder="Задайте питання по наказу №155/291..."
                    disabled={isLoading}
                    style={{
                        flex: 1,
                        padding: '12px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        outline: 'none',
                    }}
                />
                <button
                    onClick={() => sendMessage(input)}
                    disabled={isLoading || !input.trim()}
                    style={{
                        padding: '12px 24px',
                        background: isLoading ? '#94a3b8' : '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isLoading ? 'default' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '600',
                    }}
                >
                    {isLoading ? 'Думає...' : 'Надіслати'}
                </button>
            </div>
        </div>
    )
}