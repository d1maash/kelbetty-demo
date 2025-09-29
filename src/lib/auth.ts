import { auth } from '@clerk/nextjs'
import { db } from './db'

export async function getCurrentUser() {
    const { userId } = auth()

    if (!userId) {
        return null
    }

    try {
        let user = await db.user.findUnique({
            where: { clerkId: userId },
            include: {
                documents: {
                    orderBy: { createdAt: 'desc' },
                    take: 10 // Последние 10 документов
                }
            }
        })

        // Если пользователя нет в базе, создаем его
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

        return user
    } catch (error) {
        console.error('Ошибка при получении пользователя:', error)
        return null
    }
}

export async function requireAuth() {
    const user = await getCurrentUser()

    if (!user) {
        throw new Error('Требуется аутентификация')
    }

    return user
}
