import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// GET /api/test-documents - получить все документы (без авторизации для тестирования)
export async function GET() {
    try {
        const documents = await prisma.document.findMany({
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

// POST /api/test-documents - создать новый документ (без авторизации для тестирования)
export async function POST(request: NextRequest) {
    try {
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
                type: type.toLowerCase() as 'docx' | 'pptx' | 'xlsx' | 'pdf' | 'html',
                storageKey: `test-${Date.now()}`, // Уникальный ключ для тестирования
                html: content || '',
                ownerId: 'cmg1csood000ex9jpz4fo06ns' // ID тестового пользователя
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
