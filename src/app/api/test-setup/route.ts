import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// POST /api/test-setup - создать тестового пользователя
export async function POST() {
    try {
        // Создаем тестового пользователя
        const user = await prisma.user.upsert({
            where: { clerkId: 'test-user' },
            update: {},
            create: {
                clerkId: 'test-user',
                email: 'test@example.com'
            }
        })

        return NextResponse.json({ user })
    } catch (error) {
        console.error('Ошибка при создании пользователя:', error)
        return NextResponse.json(
            { error: 'Ошибка сервера' },
            { status: 500 }
        )
    }
}
