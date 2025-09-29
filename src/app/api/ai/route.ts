import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { processWithGemini } from '@/lib/gemini-client'

export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const { message, documentId, document } = await req.json()
        const targetId: string | undefined = documentId ?? document?.id

        if (!message || !targetId) {
            return NextResponse.json({ error: 'Отсутствуют обязательные параметры' }, { status: 400 })
        }

        const targetDocument = await db.document.findFirst({
            where: {
                id: targetId,
                ownerId: user.id
            },
            select: {
                id: true,
                title: true,
                html: true,
                type: true
            }
        })

        if (!targetDocument) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        const aiResult = await processWithGemini(message, {
            ...targetDocument,
            html: targetDocument.html || ''
        })

        return NextResponse.json(aiResult)

    } catch (error) {
        console.error('Ошибка в API ИИ:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
