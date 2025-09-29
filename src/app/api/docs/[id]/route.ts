import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { db } from '@/lib/db'

interface RouteParams {
    params: {
        id: string
    }
}

export async function GET(req: NextRequest, { params }: RouteParams) {
    try {
        const { userId } = auth()

        if (!userId) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const document = await db.document.findFirst({
            where: {
                id: params.id,
                owner: {
                    clerkId: userId
                }
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
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
    try {
        const { userId } = auth()

        if (!userId) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const { title, html, pptxJson, xlsxJson, pdfAnnots, patch } = await req.json()

        // Проверяем, что документ принадлежит пользователю
        const existingDocument = await db.document.findFirst({
            where: {
                id: params.id,
                owner: {
                    clerkId: userId
                }
            }
        })

        if (!existingDocument) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Если есть патч, сохраняем его как ревизию
        if (patch) {
            await db.revision.create({
                data: {
                    documentId: params.id,
                    patch
                }
            })
        }

        // Обновляем документ
        const updatedDocument = await db.document.update({
            where: { id: params.id },
            data: {
                ...(title && { title }),
                ...(html !== undefined && { html }),
                ...(pptxJson !== undefined && { pptxJson }),
                ...(xlsxJson !== undefined && { xlsxJson }),
                ...(pdfAnnots !== undefined && { pdfAnnots }),
            }
        })

        return NextResponse.json({ document: updatedDocument })

    } catch (error) {
        console.error('Ошибка при обновлении документа:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
    try {
        const { userId } = auth()

        if (!userId) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        // Проверяем, что документ принадлежит пользователю
        const existingDocument = await db.document.findFirst({
            where: {
                id: params.id,
                owner: {
                    clerkId: userId
                }
            }
        })

        if (!existingDocument) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Удаляем все ревизии
        await db.revision.deleteMany({
            where: { documentId: params.id }
        })

        // Удаляем документ
        await db.document.delete({
            where: { id: params.id }
        })

        return NextResponse.json({ success: true })

    } catch (error) {
        console.error('Ошибка при удалении документа:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}
