import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'
import * as mammoth from 'mammoth'
import { convertDocxToHtmlWithStyles } from '@/lib/docx'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import DOMPurify from 'isomorphic-dompurify'
import { JSDOM } from 'jsdom'

const execAsync = promisify(exec)

const prisma = new PrismaClient()

export async function POST(req: NextRequest) {
    try {
        console.log('=== НАЧАЛО ИМПОРТА ===')

        const user = await getCurrentUser()

        if (!user) {
            if (process.env.NODE_ENV !== 'production') {
                console.log('Dev: пользователь не авторизован — продолжаем анонимный импорт')
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

        // Проверяем тип файла
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (!['docx', 'rtf'].includes(extension || '')) {
            return NextResponse.json({
                error: 'Поддерживаются только DOCX и RTF файлы для импорта с сохранением стилей'
            }, { status: 400 })
        }

        // Читаем файл
        const arrayBuffer = await file.arrayBuffer()
        console.log('Размер файла:', arrayBuffer.byteLength, 'байт')
        console.log('Тип файла:', file.type)
        console.log('Имя файла:', file.name)

        // Конвертируем документ в HTML с максимальным сохранением стилей
        console.log('Начинаем конвертацию с сохранением стилей...')

        let result: { html: string; warnings: any[]; method: string }
        let processedHtml: string

        // Проверяем доступность LibreOffice
        const isLibreOfficeAvailable = await checkLibreOfficeAvailability()

        if (isLibreOfficeAvailable && extension === 'docx') {
            try {
                console.log('Пробуем LibreOffice headless...')
                result = await convertWithLibreOffice(arrayBuffer, file.name, extension || 'docx')
                processedHtml = result.html
                console.log('Конвертация через LibreOffice завершена успешно!')
            } catch (libreOfficeError) {
                console.warn('LibreOffice недоступен, используем fallback:', libreOfficeError)
                result = await convertWithMammothFallback(arrayBuffer)
                processedHtml = result.html
            }
        } else {
            console.log('LibreOffice недоступен, используем mammoth fallback')
            result = await convertWithMammothFallback(arrayBuffer)
            processedHtml = result.html
        }

        console.log('Конвертация завершена успешно!')
        console.log('Метод:', result.method)
        console.log('Длина HTML:', result.html.length, 'символов')
        console.log('Количество предупреждений:', result.warnings.length)
        console.log('Обработанный HTML (первые 500 символов):', processedHtml.substring(0, 500))

        // Пытаемся сохранить документ в БД, но не блокируем ответ при недоступной БД или отсутствии пользователя
        let responseDocument: any

        if (user) {
            // Только если пользователь авторизован, пробуем сохранить в БД
            try {
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
                responseDocument = {
                    id: document.id,
                    title: document.title,
                    type: document.type,
                    html: document.html,
                    storageKey: document.storageKey,
                    createdAt: document.createdAt,
                    updatedAt: document.updatedAt
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

        console.log('=== ИМПОРТ ЗАВЕРШЕН УСПЕШНО ===')

        return NextResponse.json({
            success: true,
            document: responseDocument,
            warnings: result.warnings,
            method: result.method
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

async function convertWithLibreOffice(arrayBuffer: ArrayBuffer, fileName: string, extension: string): Promise<{ html: string; warnings: any[]; method: string }> {
    console.log('Запускаем LibreOffice headless...')

    // Создаем уникальную директорию для обработки
    const sessionId = createHash('md5').update(`${Date.now()}-${Math.random()}`).digest('hex')
    const workDir = path.join('/tmp/convert', sessionId)

    await mkdir(workDir, { recursive: true })

    const inputPath = path.join(workDir, `input.${extension}`)
    const outputPath = path.join(workDir, 'output.html')
    const outputCssPath = path.join(workDir, 'output.css')

    // Сохраняем файл
    await writeFile(inputPath, Buffer.from(arrayBuffer))

    // Команда LibreOffice: используем XHTML Writer File для лучшей fidelity
    const command = `libreoffice --headless --convert-to "html:XHTML Writer File" --outdir "${workDir}" "${inputPath}"`

    console.log('Выполняем команду:', command)

    const { stdout, stderr } = await execAsync(command, {
        timeout: 30000, // 30 секунд таймаут
        cwd: workDir
    })

    console.log('LibreOffice stdout:', stdout)
    if (stderr) {
        console.log('LibreOffice stderr:', stderr)
    }

    // Проверяем, что файл создан
    if (!existsSync(outputPath)) {
        throw new Error('LibreOffice не создал выходной файл')
    }

    // Читаем HTML
    let htmlContent = await import('fs/promises').then(fs => fs.readFile(outputPath, 'utf-8'))

    // Если LibreOffice сгенерировал внешний CSS, инлайним его в <head>
    if (existsSync(outputCssPath)) {
        try {
            const css = await import('fs/promises').then(fs => fs.readFile(outputCssPath, 'utf-8'))
            htmlContent = htmlContent.replace(
                /<head>/i,
                `<head>\n<style>${css}</style>`
            )
        } catch (e) {
            console.warn('Не удалось прочитать внешний CSS LibreOffice:', e)
        }
    }

    // Обрабатываем HTML (без агрессивной санитации, сохраняем inline стили)
    const processedHtml = await processLibreOfficeHtml(htmlContent)

    // Очищаем временные файлы
    try {
        await unlink(inputPath)
        if (existsSync(outputPath)) {
            await unlink(outputPath)
        }
        if (existsSync(outputCssPath)) {
            await unlink(outputCssPath)
        }
    } catch (cleanupError) {
        console.warn('Ошибка очистки временных файлов:', cleanupError)
    }

    return {
        html: processedHtml,
        warnings: [],
        method: 'libreoffice'
    }
}

async function processLibreOfficeHtml(html: string): Promise<string> {
    console.log('Обрабатываем HTML от LibreOffice...')

    // Создаем DOM для обработки
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Очищаем HTML через DOMPurify
    const cleanHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'strong', 'em', 'u', 's', 'b', 'i',
            'ul', 'ol', 'li',
            'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
            'img', 'br', 'hr',
            'blockquote', 'pre', 'code'
        ],
        ALLOWED_ATTR: [
            'style', 'class', 'id',
            'src', 'alt', 'width', 'height',
            'colspan', 'rowspan',
            'href', 'target'
        ],
        ALLOW_DATA_ATTR: true,
        KEEP_CONTENT: true
    })

    console.log('HTML очищен через DOMPurify')

    return cleanHtml
}

/**
 * Проверка доступности LibreOffice
 */
async function checkLibreOfficeAvailability(): Promise<boolean> {
    try {
        // Проверяем, есть ли команда libreoffice
        await execAsync('which libreoffice', { timeout: 5000 })
        return true
    } catch {
        console.log('LibreOffice недоступен в системе')
        return false
    }
}

/**
 * Fallback конвертация через mammoth с улучшенными стилями
 */
async function convertWithMammothFallback(arrayBuffer: ArrayBuffer): Promise<{ html: string; warnings: any[]; method: string }> {
    console.log('Используем mammoth fallback с улучшенными стилями...')

    const mammothResult = await convertDocxToHtmlWithStyles(arrayBuffer, {
        convertImage: mammoth.images.imgElement(function (image) {
            return image.read("base64").then(function (imageBuffer) {
                return {
                    src: "data:" + image.contentType + ";base64," + imageBuffer
                }
            })
        })
    })

    console.log('Mammoth fallback конвертация завершена')

    return {
        html: mammothResult.html,
        warnings: mammothResult.warnings,
        method: 'mammoth-fallback'
    }
}