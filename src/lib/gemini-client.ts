import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

export interface GeminiResponse {
    response: string
    suggestion?: {
        description: string
        preview: string
        patch: {
            type: 'html_overwrite'
            documentId: string
            updatedHtml: string
            changes: Array<{
                selector: string
                style: Record<string, string>
                summary: string
            }>
        }
    }
}

export async function processWithGemini(
    message: string,
    document: { id: string; title: string; html: string; type: string }
): Promise<GeminiResponse> {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY не настроен')
        }

        // Пробуем новую модель Gemini 2.5 Flash, fallback на gemini-pro
        let model
        try {
            model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        } catch (error) {
            console.log('Gemini 2.5 Flash недоступна, используем gemini-pro...')
            model = genAI.getGenerativeModel({ model: 'gemini-pro' })
        }

        const prompt = `
Ты - ИИ помощник для редактирования HTML документов. Пользователь хочет изменить документ "${document.title}".

Текущий HTML документ:
${document.html}

Запрос пользователя: "${message}"

Твоя задача:
1. Понять, что хочет пользователь
2. Сгенерировать обновленный HTML с нужными изменениями
3. Вернуть ответ в формате JSON:

{
    "response": "Описание того, что было сделано",
    "suggestion": {
        "description": "Краткое описание изменений",
        "preview": "Предварительный просмотр изменений",
        "patch": {
            "type": "html_overwrite",
            "documentId": "${document.id}",
            "updatedHtml": "Обновленный HTML код",
            "changes": [
                {
                    "selector": "CSS селектор",
                    "style": {"css-свойство": "значение"},
                    "summary": "Описание изменения"
                }
            ]
        }
    }
}

ВАЖНО:
- Отвечай ТОЛЬКО в формате JSON
- Не добавляй никакого текста кроме JSON
- Если не можешь выполнить запрос, верни response с объяснением
- Используй CSS стили для форматирования
- Сохраняй структуру HTML документа
`

        const result = await model.generateContent(prompt)
        const response = await result.response.text()

        console.log('Ответ от Gemini:', response)

        // Парсим JSON ответ
        const jsonMatch = response.match(/\{[\s\S]*\}/)
        if (!jsonMatch) {
            console.error('Не удалось найти JSON в ответе:', response)
            throw new Error('Не удалось распознать JSON ответ от Gemini')
        }

        const parsedResponse = JSON.parse(jsonMatch[0])
        console.log('Распарсенный ответ:', parsedResponse)

        return {
            response: parsedResponse.response || 'Изменения применены',
            suggestion: parsedResponse.suggestion
        }

    } catch (error) {
        console.error('Ошибка при обращении к Gemini API:', error)

        let errorMessage = 'Извините, произошла ошибка при обработке вашего запроса.'

        if (error instanceof Error) {
            if (error.message.includes('GEMINI_API_KEY не настроен')) {
                errorMessage = 'ИИ чат не настроен. Пожалуйста, настройте GEMINI_API_KEY в переменных окружения.'
            } else if (error.message.includes('API key')) {
                errorMessage = 'Неверный API ключ Gemini. Проверьте настройки.'
            } else if (error.message.includes('quota')) {
                errorMessage = 'Превышена квота API. Попробуйте позже.'
            } else if (error.message.includes('404') || error.message.includes('Not Found')) {
                errorMessage = 'Модель Gemini недоступна. Проверьте настройки API.'
            } else if (error.message.includes('models')) {
                errorMessage = 'Проблема с доступом к моделям Gemini. Проверьте API ключ.'
            } else {
                errorMessage = `Ошибка: ${error.message}`
            }
        }

        return {
            response: errorMessage
        }
    }
}
