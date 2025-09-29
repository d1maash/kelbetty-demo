import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as mammoth from 'mammoth'

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        console.log('=== НАЧАЛО ИМПОРТА ===')

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
                error: 'Поддерживаются только DOCX файлы для импорта с сохранением стилей'
            }, { status: 400 })
        }

        // Читаем файл
        const arrayBuffer = await file.arrayBuffer()
        console.log('Размер файла:', arrayBuffer.byteLength, 'байт')
        console.log('Тип файла:', file.type)
        console.log('Имя файла:', file.name)

        // Конвертируем DOCX в HTML с сохранением стилей
        console.log('Начинаем конвертацию с mammoth...')

        // Добавляем таймаут для mammoth
        const mammothPromise = mammoth.convertToHtml({ buffer: Buffer.from(arrayBuffer) }, {
            styleMap: [
                // Заголовки
                "p[style-name='Heading 1'] => h1:fresh",
                "p[style-name='Heading 2'] => h2:fresh",
                "p[style-name='Heading 3'] => h3:fresh",
                "p[style-name='Heading 4'] => h4:fresh",
                "p[style-name='Heading 5'] => h5:fresh",
                "p[style-name='Heading 6'] => h6:fresh",
                "p[style-name='Title'] => h1.title:fresh",

                // Списки
                "p[style-name='List Paragraph'] => p.list-item:fresh",

                // Форматирование текста
                "u => u",
                "b => strong",
                "i => em",
                "strike => del",

                // Цвета и размеры шрифтов
                "r[style-name='Strong'] => strong",
                "r[style-name='Emphasis'] => em",

                // Таблицы
                "table => table.table:fresh",
                "tr => tr:fresh",
                "td => td:fresh",
                "th => th:fresh"
            ],
            includeDefaultStyleMap: true,
            convertImage: mammoth.images.imgElement(function (image) {
                return image.read("base64").then(function (imageBuffer) {
                    return {
                        src: "data:" + image.contentType + ";base64," + imageBuffer
                    }
                })
            })
        })

        // Добавляем таймаут для mammoth (30 секунд)
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Таймаут конвертации mammoth')), 30000)
        })

        const result = await Promise.race([mammothPromise, timeoutPromise]) as any

        console.log('Конвертация завершена успешно!')
        console.log('Длина HTML:', result.value.length, 'символов')
        console.log('Количество предупреждений:', result.messages.length)
        console.log('Исходный HTML (первые 500 символов):', result.value.substring(0, 500))

        // Постобработка HTML для улучшения стилей
        let processedHtml = result.value

        // Добавляем стили для размеров шрифтов и отступов
        processedHtml = processedHtml
            // Сохраняем inline стили размеров шрифтов
            .replace(/font-size:\s*(\d+(?:\.\d+)?)pt/gi, 'font-size: $1pt !important')
            .replace(/font-size:\s*(\d+(?:\.\d+)?)px/gi, 'font-size: $1px !important')
            // Сохраняем отступы
            .replace(/margin:\s*([^;]+)/gi, 'margin: $1 !important')
            .replace(/padding:\s*([^;]+)/gi, 'padding: $1 !important')
            .replace(/text-indent:\s*([^;]+)/gi, 'text-indent: $1 !important')
            // Сохраняем выравнивание
            .replace(/text-align:\s*([^;]+)/gi, 'text-align: $1 !important')
            // Сохраняем цвета
            .replace(/color:\s*([^;]+)/gi, 'color: $1 !important')
            // Сохраняем жирность и курсив
            .replace(/font-weight:\s*([^;]+)/gi, 'font-weight: $1 !important')
            .replace(/font-style:\s*([^;]+)/gi, 'font-style: $1 !important')
            // Сохраняем подчеркивание
            .replace(/text-decoration:\s*([^;]+)/gi, 'text-decoration: $1 !important')

        // Добавляем базовые стили для заголовков и параграфов
        processedHtml = processedHtml
            // Заголовки с размерами шрифтов
            .replace(/<h1([^>]*)>/gi, '<h1$1 style="font-size: 24pt !important; font-weight: bold !important; margin: 16pt 0 8pt 0 !important;">')
            .replace(/<h2([^>]*)>/gi, '<h2$1 style="font-size: 20pt !important; font-weight: bold !important; margin: 14pt 0 6pt 0 !important;">')
            .replace(/<h3([^>]*)>/gi, '<h3$1 style="font-size: 18pt !important; font-weight: bold !important; margin: 12pt 0 4pt 0 !important;">')
            .replace(/<h4([^>]*)>/gi, '<h4$1 style="font-size: 16pt !important; font-weight: bold !important; margin: 10pt 0 4pt 0 !important;">')
            .replace(/<h5([^>]*)>/gi, '<h5$1 style="font-size: 14pt !important; font-weight: bold !important; margin: 8pt 0 4pt 0 !important;">')
            .replace(/<h6([^>]*)>/gi, '<h6$1 style="font-size: 12pt !important; font-weight: bold !important; margin: 6pt 0 4pt 0 !important;">')
            // Параграфы с отступами
            .replace(/<p([^>]*)>/gi, '<p$1 style="margin: 0 0 6pt 0 !important; line-height: 1.15 !important;">')
            // Списки с отступами
            .replace(/<ul([^>]*)>/gi, '<ul$1 style="margin: 6pt 0 !important; padding-left: 20pt !important;">')
            .replace(/<ol([^>]*)>/gi, '<ol$1 style="margin: 6pt 0 !important; padding-left: 20pt !important;">')
            .replace(/<li([^>]*)>/gi, '<li$1 style="margin: 2pt 0 !important;">')
            // Таблицы с границами
            .replace(/<table([^>]*)>/gi, '<table$1 style="border-collapse: collapse !important; width: 100% !important; margin: 6pt 0 !important;">')
            .replace(/<td([^>]*)>/gi, '<td$1 style="border: 1pt solid #000 !important; padding: 2pt !important;">')
            .replace(/<th([^>]*)>/gi, '<th$1 style="border: 1pt solid #000 !important; padding: 2pt !important; font-weight: bold !important; background-color: #f0f0f0 !important;">')

        console.log('HTML постобработан для сохранения стилей')
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
        console.log('=== ИМПОРТ ЗАВЕРШЕН УСПЕШНО ===')

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
        console.error('Ошибка при импорте документа:', error)

        // Более детальная обработка ошибок
        let errorMessage = 'Ошибка импорта документа'
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