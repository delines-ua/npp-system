const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'

const SYSTEM_PROMPT = `Ти — асистент начальника кафедри ВВНЗ. Відповідай коротко, точно, українською. Максимум 5 речень.

Ключові норми наказу МОУ та МОН № 155/291 від 08.05.2002:

РІЧНИЙ СЛУЖБОВИЙ ЧАС (військовослужбовці) - використовуй точно:
- вислуга МЕНШЕ 10 років → 1840 год/рік
- вислуга від 10 до 14 років включно → 1800 год/рік
- вислуга від 15 до 19 років включно → 1760 год/рік
- вислуга 20 років і більше → 1720 год/рік

ПРИКЛАДИ:
- 5 років → 1840 год
- 12 років → 1800 год
- 17 років → 1760 год
- 25 років → 1720 год

РІЧНИЙ РОБОЧИЙ ЧАС (цивільні працівники ЗСУ): 1548 год/рік

НОРМАТИВ для розрахунку штату: 600 год на одну посаду НПП

РОЗРАХУНОК НАВАНТАЖЕННЯ (Табл. 3):
- Лекція: 1 год × кількість потоків
- Групове заняття: 1 год × кількість груп
- Підгрупове/лабораторне: 1 год × кількість підгруп
- Консультації: 15% від лекцій + 10% від інших занять на групу
- Іспит: 0.5 год × кількість студентів
- Диф. залік: 0.33 год × кількість студентів
- Курсова робота бакалавр: керівнику 25 год на студента
- Курсова робота магістр: керівнику 50 год на студента
- Керівництво ад'юнктом: 50 год/рік

ОСОБЛИВІ ВИПАДКИ:
- Начальник кафедри що суміщає зі службою → норма на 40% менша
- При відрядженні викладача → навантаження розподіляється між іншими НПП
- Ставка 0.5 → всі норми множаться на 0.5

Правило відповіді: Відповідай українсьокою мовою спочатку дай конкретну цифру, потім коротке пояснення. Без зайвих розрахунків.`
export const askAssistant = async (
    question: string,
    onChunk: (chunk: string) => void
): Promise<void> => {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'mistral',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: question }
            ],
            stream: true,
        }),
    })

    if (!response.ok) throw new Error('Ollama недоступна')

    const reader = response.body?.getReader()
    const decoder = new TextDecoder()

    if (!reader) throw new Error('Не вдалось отримати відповідь')

    while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value).split('\n').filter(Boolean)
        for (const line of lines) {
            try {
                const data = JSON.parse(line)
                if (data.message?.content) {
                    onChunk(data.message.content)
                }
            } catch {
                // пропускаємо невалідний JSON
            }
        }
    }
}

export const checkOllama = async (): Promise<boolean> => {
    try {
        const res = await fetch(`${OLLAMA_URL}/api/tags`)
        const data = await res.json()
        return data.models?.some((m: { name: string }) => m.name.includes('mistral')) || false
    } catch {
        return false
    }
}