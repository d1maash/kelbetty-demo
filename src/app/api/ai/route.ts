import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'

export async function POST(req: NextRequest) {
    try {
        const { userId } = auth()

        if (!userId) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const { message, document } = await req.json()

        if (!message || !document) {
            return NextResponse.json({ error: 'Отсутствуют обязательные параметры' }, { status: 400 })
        }

        // В реальном приложении здесь был бы вызов Gemini API
        // const geminiResponse = await callGeminiAPI(message, document)

        // Для демо создаем фиктивный ответ ИИ
        const demoResponses = [
            {
                response: 'Я проанализировал ваш документ и подготовил изменения для улучшения форматирования.',
                suggestion: {
                    description: 'Увеличить межстрочный интервал в абзацах до 1.5 и сделать заголовки синими',
                    patch: {
                        type: 'style_update',
                        changes: [
                            { selector: 'p', style: { lineHeight: '1.5' } },
                            { selector: 'h1,h2,h3', style: { color: '#2563eb' } }
                        ]
                    },
                    preview: 'Заголовки станут синими, а текст будет лучше читаться с увеличенным интервалом'
                }
            },
            {
                response: 'Отличная идея! Я подготовил изменения для улучшения читаемости документа.',
                suggestion: {
                    description: 'Увеличить размер шрифта основного текста и добавить отступы',
                    patch: {
                        type: 'formatting_update',
                        changes: [
                            { selector: 'body', style: { fontSize: '16px', margin: '20px' } },
                            { selector: 'p', style: { marginBottom: '12px' } }
                        ]
                    },
                    preview: 'Документ станет более читаемым с увеличенным шрифтом и отступами'
                }
            },
            {
                response: 'Я понял ваш запрос. Вот что я предлагаю изменить в документе.',
                suggestion: {
                    description: 'Выровнять изображения по центру и добавить рамки',
                    patch: {
                        type: 'image_update',
                        changes: [
                            { selector: 'img', style: { textAlign: 'center', border: '1px solid #e5e7eb', borderRadius: '8px' } }
                        ]
                    },
                    preview: 'Изображения будут выровнены по центру с красивыми рамками'
                }
            }
        ]

        // Выбираем случайный ответ для демо
        const randomResponse = demoResponses[Math.floor(Math.random() * demoResponses.length)]

        // Симуляция задержки API
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000))

        return NextResponse.json(randomResponse)

    } catch (error) {
        console.error('Ошибка в API ИИ:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

// Функция для реального вызова Gemini API (заглушка)
async function callGeminiAPI(message: string, document: any) {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY

    if (!GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY не настроен')
    }

    const systemPrompt = `
Ты — редактор документов. Твоя задача — модифицировать переданный документ, СТРОГО сохраняя существующие шрифты, отступы, цвета и стили. 

Возвращай только структурированные изменения в формате JSON Patch без лишнего текста. 

Если действие невозможно без потери стиля — предложи альтернативу.

Документ: ${JSON.stringify(document)}
Запрос пользователя: ${message}

Верни JSON в формате:
{
  "response": "Краткое описание того, что будет изменено",
  "suggestion": {
    "description": "Подробное описание изменений",
    "patch": {
      "type": "тип_изменения",
      "changes": [массив_изменений]
    },
    "preview": "Как будет выглядеть результат"
  }
}
`

    // Здесь был бы реальный вызов Gemini API
    // const response = await fetch('https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent', {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${GEMINI_API_KEY}`
    //   },
    //   body: JSON.stringify({
    //     prompt: systemPrompt
    //   })
    // })

    // return await response.json()
}
