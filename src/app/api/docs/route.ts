import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { db } from '@/lib/db'

export async function GET(req: NextRequest) {
    try {
        const { userId } = auth()

        if (!userId) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        // Получаем пользователя из базы данных
        let user = await db.user.findUnique({
            where: { clerkId: userId },
            include: {
                documents: {
                    orderBy: { createdAt: 'desc' }
                }
            }
        })

        // Если пользователя нет, создаем его
        if (!user) {
            const clerkUser = await auth()
            user = await db.user.create({
                data: {
                    clerkId: userId,
                    email: clerkUser.sessionClaims?.email as string || `user-${userId}@kelbetty.ai`
                },
                include: {
                    documents: true
                }
            })
        }

        return NextResponse.json({ documents: user.documents })

    } catch (error) {
        console.error('Ошибка при получении документов:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function POST(req: NextRequest) {
    try {
        const { userId } = auth()

        if (!userId) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const { title, type, storageKey, html, pptxJson, xlsxJson, pdfAnnots } = await req.json()

        if (!title || !type) {
            return NextResponse.json({ error: 'Отсутствуют обязательные параметры' }, { status: 400 })
        }

        // Получаем или создаем пользователя
        let user = await db.user.findUnique({
            where: { clerkId: userId }
        })

        if (!user) {
            const clerkUser = await auth()
            user = await db.user.create({
                data: {
                    clerkId: userId,
                    email: clerkUser.sessionClaims?.email as string || `user-${userId}@kelbetty.ai`
                }
            })
        }

        // Создаем документ
        const document = await db.document.create({
            data: {
                ownerId: user.id,
                title,
                type,
                storageKey: storageKey || `documents/${Date.now()}-${title}`,
                html,
                pptxJson,
                xlsxJson,
                pdfAnnots
            }
        })

        return NextResponse.json({ document })

    } catch (error) {
        console.error('Ошибка при создании документа:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
