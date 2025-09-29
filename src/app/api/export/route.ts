import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { db } from '@/lib/db'

export async function POST(req: NextRequest) {
    try {
        const { userId } = auth()

        if (!userId) {
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        const { documentId, format } = await req.json()

        if (!documentId || !format) {
            return NextResponse.json({ error: 'Отсутствуют обязательные параметры' }, { status: 400 })
        }

        // Проверяем, что документ принадлежит пользователю
        const document = await db.document.findFirst({
            where: {
                id: documentId,
                owner: {
                    clerkId: userId
                }
            }
        })

        if (!document) {
            return NextResponse.json({ error: 'Документ не найден' }, { status: 404 })
        }

        // Проверяем совместимость формата
        const validFormats = {
            docx: ['docx', 'pdf'],
            pptx: ['pptx', 'pdf'],
            xlsx: ['xlsx', 'pdf', 'csv'],
            pdf: ['pdf']
        }

        if (!validFormats[document.type as keyof typeof validFormats]?.includes(format)) {
            return NextResponse.json({
                error: `Формат ${format} не поддерживается для типа ${document.type}`
            }, { status: 400 })
        }

        let exportData: any = {}

        try {
            switch (format) {
                case 'docx':
                    exportData = await exportToDocx(document)
                    break
                case 'pptx':
                    exportData = await exportToPptx(document)
                    break
                case 'xlsx':
                    exportData = await exportToXlsx(document)
                    break
                case 'pdf':
                    exportData = await exportToPdf(document)
                    break
                case 'csv':
                    exportData = await exportToCsv(document)
                    break
                default:
                    throw new Error('Неподдерживаемый формат экспорта')
            }
        } catch (exportError) {
            console.error('Ошибка при экспорте:', exportError)
            return NextResponse.json({
                error: 'Не удалось экспортировать документ'
            }, { status: 500 })
        }

        // В реальном приложении здесь был бы upload в S3 и возврат URL для скачивания
        const downloadUrl = `/api/download/${document.id}?format=${format}&token=${Date.now()}`

        return NextResponse.json({
            success: true,
            downloadUrl,
            filename: `${document.title.replace(/\.[^/.]+$/, '')}.${format}`,
            ...exportData
        })

    } catch (error) {
        console.error('Ошибка при экспорте файла:', error)
        return NextResponse.json(
            { error: 'Внутренняя ошибка сервера' },
            { status: 500 }
        )
    }
}

// Функции экспорта (заглушки для демо)
async function exportToDocx(document: any) {
    // В реальном приложении здесь была бы конвертация через html-docx-js
    return {
        contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: 1024 * 50, // 50KB для демо
        preview: 'DOCX файл с сохраненным форматированием'
    }
}

async function exportToPptx(document: any) {
    // В реальном приложении здесь была бы генерация через pptxgenjs
    return {
        contentType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        size: 1024 * 200, // 200KB для демо
        slides: document.pptxJson?.slides?.length || 1,
        preview: 'PPTX файл со всеми слайдами и стилями'
    }
}

async function exportToXlsx(document: any) {
    // В реальном приложении здесь была бы генерация через xlsx
    return {
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: 1024 * 30, // 30KB для демо
        sheets: document.xlsxJson?.sheets?.length || 1,
        preview: 'XLSX файл с сохраненными формулами и стилями'
    }
}

async function exportToPdf(document: any) {
    // В реальном приложении здесь была бы генерация через puppeteer или pdf-lib
    return {
        contentType: 'application/pdf',
        size: 1024 * 100, // 100KB для демо
        pages: calculatePages(document),
        preview: 'PDF файл с высоким качеством'
    }
}

async function exportToCsv(document: any) {
    // Только для XLSX документов
    if (document.type !== 'xlsx') {
        throw new Error('CSV экспорт доступен только для XLSX документов')
    }

    return {
        contentType: 'text/csv',
        size: 1024 * 5, // 5KB для демо
        encoding: 'UTF-8',
        preview: 'CSV файл с данными таблицы'
    }
}

function calculatePages(document: any): number {
    switch (document.type) {
        case 'docx':
            // Примерная оценка страниц на основе HTML контента
            const htmlLength = document.html?.length || 0
            return Math.max(1, Math.ceil(htmlLength / 3000))
        case 'pptx':
            return document.pptxJson?.slides?.length || 1
        case 'xlsx':
            return document.xlsxJson?.sheets?.length || 1
        case 'pdf':
            return document.pdfAnnots?.metadata?.pages || 1
        default:
            return 1
    }
}
