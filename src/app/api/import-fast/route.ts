import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as mammoth from 'mammoth'
import { convertDocxToHtmlWithStyles } from '@/lib/docx'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        console.log('=== БЫСТРЫЙ ИМПОРТ ===')

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

        // Проверяем тип файла
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (extension !== 'docx') {
            return NextResponse.json({
                error: 'Поддерживаются только DOCX файлы для быстрого импорта'
            }, { status: 400 })
        }

        // Читаем файл
        const arrayBuffer = await file.arrayBuffer()
        console.log('Размер файла:', arrayBuffer.byteLength, 'байт')

        // Быстрая конвертация с сохранением стилей
        console.log('Начинаем быструю конвертацию с сохранением стилей...')

        // Используем нашу улучшенную функцию конвертации
        const result = await convertDocxToHtmlWithStyles(arrayBuffer, {
            convertImage: mammoth.images.imgElement(function (image) {
                return image.read("base64").then(function (imageBuffer) {
                    return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                    }
                })
            })
        })

        console.log('Конвертация завершена!')
        console.log('Длина HTML:', result.html.length, 'символов')
        console.log('Количество предупреждений:', result.warnings.length)
        console.log('Исходный HTML (первые 1000 символов):', result.html.substring(0, 1000))

        // HTML уже обработан нашей улучшенной функцией
        const processedHtml = result.html

        console.log('HTML обработан с сохранением всех стилей')
        console.log('Обработанный HTML (первые 500 символов):', processedHtml.substring(0, 500))

        // Создаем документ в базе данных
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
        console.log('=== БЫСТРЫЙ ИМПОРТ ЗАВЕРШЕН ===')

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
            warnings: result.warnings
        })

    } catch (error) {
        console.error('Ошибка при быстром импорте документа:', error)

        let errorMessage = 'Ошибка быстрого импорта документа'
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
