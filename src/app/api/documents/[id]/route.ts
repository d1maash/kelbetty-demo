import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'

const prisma = new PrismaClient()

// GET /api/documents/[id] - получить конкретный документ
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const document = await prisma.document.findFirst({
            where: {
                id: params.id,
                ownerId: user.id
            },
            include: {
                revisions: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        if (!document) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        return NextResponse.json({ document })
    } catch (error) {
        console.error('Ошибка при получении документа:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}

// PUT /api/documents/[id] - обновить документ
export async function PUT(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { title, content, html, metadata } = body

        // Проверяем, что документ принадлежит пользователю
        const existingDocument = await prisma.document.findFirst({
            where: {
                id: params.id,
                ownerId: user.id
            }
        })

        if (!existingDocument) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Обновляем документ
        const updatedDocument = await prisma.document.update({
            where: { id: params.id },
            data: {
                title: title || existingDocument.title,
                html: html || content || existingDocument.html,
                updatedAt: new Date()
            }
        })

        // Создаем новую ревизию
        await prisma.revision.create({
            data: {
                documentId: params.id,
                patch: {
                    content: html || content || existingDocument.html,
                    timestamp: new Date().toISOString()
                }
            }
        })

        return NextResponse.json({ document: updatedDocument })
    } catch (error) {
        console.error('Ошибка при обновлении документа:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}

// DELETE /api/documents/[id] - удалить документ
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        // Проверяем, что документ принадлежит пользователю
        const existingDocument = await prisma.document.findFirst({
            where: {
                id: params.id,
                ownerId: user.id
            }
        })

        if (!existingDocument) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Удаляем документ (ревизии удалятся каскадно)
        await prisma.document.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Ошибка при удалении документа:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}
