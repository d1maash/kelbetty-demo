import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'

// GET /api/chat/[documentId] - получить историю чата для документа
export async function GET(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        // Проверяем, что документ принадлежит пользователю
        const document = await db.document.findFirst({
            where: {
                id: params.documentId,
                ownerId: user.id
            }
        })

        if (!document) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Получаем историю чата для документа
        const chatHistory = await db.chatMessage.findMany({
            where: {
                documentId: params.documentId
            },
            orderBy: {
                createdAt: 'asc'
            }
        })

        return NextResponse.json({ messages: chatHistory })
    } catch (error) {
        console.error('Ошибка при получении истории чата:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}

// POST /api/chat/[documentId] - сохранить сообщение в чат
export async function POST(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        // Проверяем, что документ принадлежит пользователю
        const document = await db.document.findFirst({
            where: {
                id: params.documentId,
                ownerId: user.id
            }
        })

        if (!document) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        const body = await request.json()
        const { type, content, suggestion } = body

        // Сохраняем сообщение в базу данных
        const chatMessage = await db.chatMessage.create({
            data: {
                documentId: params.documentId,
                type,
                content,
                suggestion: suggestion || null,
                createdAt: new Date()
            }
        })

        return NextResponse.json({ message: chatMessage })
    } catch (error) {
        console.error('Ошибка при сохранении сообщения:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}

// DELETE /api/chat/[documentId] - очистить историю чата для документа
export async function DELETE(
    request: NextRequest,
    { params }: { params: { documentId: string } }
) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        // Проверяем, что документ принадлежит пользователю
        const document = await db.document.findFirst({
            where: {
                id: params.documentId,
                ownerId: user.id
            }
        })

        if (!document) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Удаляем все сообщения чата для документа
        await db.chatMessage.deleteMany({
            where: {
                documentId: params.documentId
            }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Ошибка при очистке истории чата:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}
