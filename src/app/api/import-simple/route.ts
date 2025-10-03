import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as mammoth from 'mammoth'
import { convertDocxToHtmlWithStyles } from '@/lib/docx'
// Примечание: санитизация выполняется при просмотре в iframe (CSP + удаление script)

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        console.log('=== НАЧАЛО ПРОСТОГО ИМПОРТА ===')

        const user = await getCurrentUser()

        if (!user) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('Dev: пользователь не авторизован — продолжаем анонимный простой импорт')
            } else {
                console.log('Пользователь не авторизован')
                return NextResponse.json({ error: 'Не авторизован' }, { status: 401 })
            }
        } else {
            console.log('Пользователь авторизован:', user.id)
        }

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

        console.log('Начинаем конвертацию с сохранением инлайн-стилей...')

        // Улучшенная конвертация, которая сохраняет инлайн-стили (pt, text-indent, margins)
        const enhanced = await convertDocxToHtmlWithStyles(arrayBuffer, {
            convertImage: mammoth.images.imgElement(function (image) {
                return image.read('base64').then(function (imageBuffer) {
                    return {
                        src: 'data:' + image.contentType + ';base64,' + imageBuffer
                    }
                })
            })
        })

        console.log('Конвертация завершена!')
        console.log('Длина HTML:', enhanced.html.length, 'символов')

        // Сохраняем все inline-стили как есть (без санитизации на этом этапе)
        let processedHtml = enhanced.html

        console.log('HTML обработан')

        // Неблокирующее сохранение в БД: при ошибке или отсутствии пользователя вернем временный документ
        let responseDocument: any

        if (user) {
            // Только если пользователь авторизован, пробуем сохранить в БД
            try {
                const saved = await prisma.document.create({
                    data: {
                        title: file.name.replace(/\.[^/.]+$/, ''),
                        type: 'docx',
                        storageKey: `imported/${Date.now()}-${file.name}`,
                        html: processedHtml,
                        ownerId: user.id
                    }
                })
                console.log('Документ сохранен в БД:', saved.id)
                responseDocument = {
                    id: saved.id,
                    title: saved.title,
                    type: saved.type,
                    html: saved.html,
                    storageKey: saved.storageKey,
                    createdAt: saved.createdAt,
                    updatedAt: saved.updatedAt
                }
            } catch (dbError) {
                console.warn('Ошибка БД, возвращаем временный документ:', dbError)
                const now = new Date().toISOString()
                responseDocument = {
                    id: `temp-${Date.now()}`,
                    title: file.name.replace(/\.[^/.]+$/, ''),
                    type: 'docx',
                    html: processedHtml,
                    storageKey: `imported/${Date.now()}-${file.name}`,
                    createdAt: now,
                    updatedAt: now
                }
            }
        } else {
            // В dev без пользователя: возвращаем временный документ сразу
            console.log('Dev mode без пользователя: возвращаем временный документ')
            const now = new Date().toISOString()
            responseDocument = {
                id: `temp-${Date.now()}`,
                title: file.name.replace(/\.[^/.]+$/, ''),
                type: 'docx',
                html: processedHtml,
                storageKey: `imported/${Date.now()}-${file.name}`,
                createdAt: now,
                updatedAt: now
            }
        }

        console.log('=== ПРОСТОЙ ИМПОРТ ЗАВЕРШЕН УСПЕШНО ===')

        return NextResponse.json({
            success: true,
            document: responseDocument,
            warnings: enhanced.warnings ?? [],
            method: 'jsDocxToHtml'
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
