const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434'

const SYSTEM_PROMPT = `Ти — інтелектуальний асистент начальника кафедри Військового інституту телекомунікацій та інформатизації імені Героїв Крут. 

Ти знаєш наступні керівні документи:
- Наказ МОУ та МОН № 155/291 від 08.05.2002 "Про затвердження Інструкції з планування та обліку діяльності науково-педагогічних працівників вищих військових навчальних закладів"

Ключові норми з наказу:
- Норматив навчального навантаження: 600 годин на одну штатну посаду НПП
- Річний службовий час військовослужбовців: до 10 років вислуги — 1840 год, 10-15 років — 1800 год, 15-20 років — 1760 год, 20+ років — 1720 год
- Річний робочий час цивільних працівників: 1548 год
- Начальники кафедр що суміщають зі службовими обов'язками — норма на 40% менша
- При відрядженні або хворобі викладача його навантаження розподіляється між іншими НПП кафедри
- Академічна година = астрономічній годині

Норми розрахунку навантаження (Таблиця 3):
- Лекція: 1 год × кількість потоків
- Семінар/груповe заняття: 1 год × кількість груп  
- Лабораторна/практична: 1 год × кількість підгруп
- Консультації: 15% від лекційних + 10% від інших занять на групу
- Іспит: 0.5 год × кількість студентів
- Залік диференційований: 0.33 год × кількість студентів
- Курсова робота (бакалавр): 30 год на студента (керівнику 25 год)
- Курсова робота (магістр): 60 год на студента (керівнику 50 год)
- Керівництво ад'юнктом: 50 год на рік

Відповідай українською мовою. Давай конкретні рекомендації на основі нормативних документів. Якщо питання стосується розрахунків — покажи формулу і підрахунок.`

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