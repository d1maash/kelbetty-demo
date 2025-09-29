import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { PrismaClient } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'

const prisma = new PrismaClient()

// GET /api/documents - получить все документы пользователя
export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const documents = await prisma.document.findMany({
            where: { ownerId: user.id },
            include: {
                revisions: {
                    orderBy: { createdAt: 'desc' },
                    take: 1
                }
            },
            orderBy: { updatedAt: 'desc' }
        })

        return NextResponse.json({ documents })
    } catch (error) {
        console.error('Ошибка при получении документов:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}

// POST /api/documents - создать новый документ
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const body = await request.json()
        const { title, type, content, metadata } = body

        if (!title || !type) {
            return NextResponse.json(
                { error: 'Название и тип документа обязательны' },
                { status: 400 }
            )
        }

        const document = await prisma.document.create({
            data: {
                title,
                type: type.toLowerCase() as any,
                storageKey: '', // Пока пустой
                html: content || '',
                ownerId: user.id
            }
        })

        return NextResponse.json({ document })
    } catch (error) {
        console.error('Ошибка при создании документа:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}
