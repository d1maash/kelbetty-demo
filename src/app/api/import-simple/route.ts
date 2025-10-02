import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as mammoth from 'mammoth'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        console.log('=== НАЧАЛО ПРОСТОГО ИМПОРТА ===')

        const user = await getCurrentUser()

        if (!user) {
            console.log('Пользователь не авторизован')
            return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
        }

        console.log('Пользователь авторизован:', user.id)

        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
        }

        const extension = file.name.split('.').pop()?.toLowerCase()
        if (extension !== 'docx') {
            return NextResponse.json({
                error: 'Поддерживаются только DOCX файлы'
            }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        console.log('Размер файла:', arrayBuffer.byteLength, 'байт')

        console.log('Начинаем простую конвертацию...')

        // Простая конвертация с базовыми настройками
        const result = await mammoth.convertToHtml({ buffer: Buffer.from(arrayBuffer) }, {
            styleMap: [
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Heading 4'] => h4:fresh",
                "p[style-name='Heading 5'] => h5:fresh",
                "p[style-name='Heading 6'] => h6:fresh",
                "p[style-name='Title'] => h1.title:fresh",
                "p => p:fresh",
                "p[style-name='List Paragraph'] => p.list-item:fresh",
                "u => u",
                "b => strong",
                "i => em",
                "strike => del",
                "r[style-name='Strong'] => strong",
                "r[style-name='Emphasis'] => em",
                "table => table.table:fresh",
                "tr => tr:fresh",
                "td => td:fresh",
                "th => th:fresh"
            ],
            includeDefaultStyleMap: true,
            includeEmbeddedStyleMap: true,
            convertImage: mammoth.images.imgElement(function (image) {
                return image.read("base64").then(function (imageBuffer) {
                    return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                    }
                })
            })
        })

        console.log('Конвертация завершена!')
        console.log('Длина HTML:', result.value.length, 'символов')

        // Простая постобработка
        let processedHtml = result.value

        // Применяем базовые стили только для элементов без inline стилей
        processedHtml = processedHtml
            .replace(/<h1(?!\s+style)/gi, '<h1 style="font-size: 24pt; font-weight: bold; margin: 16pt 0 8pt 0;"')
            .replace(/<h2(?!\s+style)/gi, '<h2 style="font-size: 20pt; font-weight: bold; margin: 14pt 0 6pt 0;"')
            .replace(/<h3(?!\s+style)/gi, '<h3 style="font-size: 18pt; font-weight: bold; margin: 12pt 0 4pt 0;"')
            .replace(/<h4(?!\s+style)/gi, '<h4 style="font-size: 16pt; font-weight: bold; margin: 10pt 0 4pt 0;"')
            .replace(/<h5(?!\s+style)/gi, '<h5 style="font-size: 14pt; font-weight: bold; margin: 8pt 0 4pt 0;"')
            .replace(/<h6(?!\s+style)/gi, '<h6 style="font-size: 12pt; font-weight: bold; margin: 6pt 0 4pt 0;"')
            .replace(/<p(?!\s+style)/gi, '<p style="margin: 0 0 6pt 0; line-height: 1.15;"')
            .replace(/<ul(?!\s+style)/gi, '<ul style="margin: 6pt 0; padding-left: 20pt;"')
            .replace(/<ol(?!\s+style)/gi, '<ol style="margin: 6pt 0; padding-left: 20pt;"')
            .replace(/<li(?!\s+style)/gi, '<li style="margin: 2pt 0;"')
            .replace(/<table(?!\s+style)/gi, '<table style="border-collapse: collapse; width: 100%; margin: 6pt 0;"')
            .replace(/<td(?!\s+style)/gi, '<td style="border: 1pt solid #000; padding: 2pt;"')
            .replace(/<th(?!\s+style)/gi, '<th style="border: 1pt solid #000; padding: 2pt; font-weight: bold; background-color: #f0f0f0;"')

        console.log('HTML обработан')

        const document = await prisma.document.create({
            data: {
                title: file.name.replace(/\.[^/.]+$/, ''),
                type: 'docx',
                storageKey: `imported/${Date.now()}-${file.name}`,
                html: processedHtml,
                ownerId: user.id
            }
        })

        console.log('Документ сохранен в БД:', document.id)
        console.log('=== ПРОСТОЙ ИМПОРТ ЗАВЕРШЕН УСПЕШНО ===')

        return NextResponse.json({
            success: true,
            document: {
                id: document.id,
                title: document.title,
                type: document.type,
                html: document.html,
                createdAt: document.createdAt,
                updatedAt: document.updatedAt
            },
            warnings: result.messages
        })

    } catch (error) {
        console.error('Ошибка при простом импорте документа:', error)

        let errorMessage = 'Ошибка простого импорта документа'
        if (error instanceof Error) {
            if (error.message.includes('Could not find file')) {
                errorMessage = 'Не удалось прочитать DOCX файл. Убедитесь, что файл не поврежден.'
            } else if (error.message.includes('Invalid file format')) {
                errorMessage = 'Неподдерживаемый формат файла. Используйте только DOCX файлы.'
            } else {
                errorMessage = `Ошибка обработки: ${error.message}`
            }
        }

        return NextResponse.json(
            { error: errorMessage },
            { status: 500 }
        )
    }
}
