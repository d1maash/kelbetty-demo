import { NextRequest, NextResponse } from 'next/server'
import { exec } from 'child_process'
import { promisify } from 'util'
import { writeFile, unlink, mkdir, readFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { createHash } from 'crypto'
import DOMPurify from 'isomorphic-dompurify'
import { JSDOM } from 'jsdom'

const execAsync = promisify(exec)

export async function POST(req: NextRequest) {
    try {
        console.log('=== НАЧАЛО КОНВЕРТАЦИИ LIBREOFFICE ===')

        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
        }

        const extension = file.name.split('.').pop()?.toLowerCase()
        if (!['docx', 'rtf'].includes(extension || '')) {
            return NextResponse.json({
                error: 'Поддерживаются только DOCX и RTF файлы'
            }, { status: 400 })
        }

        const arrayBuffer = await file.arrayBuffer()
        console.log('Размер файла:', arrayBuffer.byteLength, 'байт')

        // Конвертируем через LibreOffice с максимальной точностью
        const result = await convertWithLibreOfficeHighFidelity(arrayBuffer, file.name, extension || 'docx')

        console.log('=== КОНВЕРТАЦИЯ ЗАВЕРШЕНА УСПЕШНО ===')
        console.log('Метод:', result.method)
        console.log('Длина HTML:', result.html.length, 'символов')
        console.log('Длина CSS:', result.css?.length || 0, 'символов')

        return NextResponse.json({
            success: true,
            html: result.html,
            css: result.css,
            method: result.method,
            warnings: result.warnings,
            fidelity: result.fidelity
        })

    } catch (error) {
        console.error('Ошибка при конвертации:', error)
        return NextResponse.json(
            { error: `Ошибка конвертации: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}` },
            { status: 500 }
        )
    }
}

async function convertWithLibreOfficeHighFidelity(
    arrayBuffer: ArrayBuffer,
    fileName: string,
    extension: string
): Promise<{ html: string; css?: string; method: string; warnings: any[]; fidelity: number }> {
    console.log('Запускаем LibreOffice с максимальной точностью...')

    // Создаем уникальную директорию для обработки
    const sessionId = createHash('md5').update(`${Date.now()}-${Math.random()}`).digest('hex')
    const workDir = path.join('/tmp/convert', sessionId)

    await mkdir(workDir, { recursive: true })

    const inputPath = path.join(workDir, `input.${extension}`)
    const outputHtmlPath = path.join(workDir, 'output.html')
    const outputCssPath = path.join(workDir, 'output.css')

    // Сохраняем файл
    await writeFile(inputPath, Buffer.from(arrayBuffer))

    // Команда LibreOffice для конвертации в HTML с максимальной точностью
    // Используем XHTML Writer для лучшего сохранения форматирования
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
    if (!existsSync(outputHtmlPath)) {
        throw new Error('LibreOffice не создал выходной HTML файл')
    }

    // Читаем HTML
    const htmlContent = await readFile(outputHtmlPath, 'utf-8')

    // Ищем CSS файл (LibreOffice может создать отдельный CSS)
    let cssContent = ''
    if (existsSync(outputCssPath)) {
        cssContent = await readFile(outputCssPath, 'utf-8')
        console.log('Найден внешний CSS файл')
    }

    // Обрабатываем HTML с сохранением всех inline стилей
    const processedHtml = await processLibreOfficeHtmlHighFidelity(htmlContent)

    // Очищаем временные файлы
    try {
        await unlink(inputPath)
        if (existsSync(outputHtmlPath)) {
            await unlink(outputHtmlPath)
        }
        if (existsSync(outputCssPath)) {
            await unlink(outputCssPath)
        }
    } catch (cleanupError) {
        console.warn('Ошибка очистки временных файлов:', cleanupError)
    }

    // Оцениваем качество конвертации
    const fidelity = scoreFidelity(processedHtml)

    return {
        html: processedHtml,
        css: cssContent || undefined,
        method: 'libreoffice',
        warnings: [],
        fidelity
    }
}

async function processLibreOfficeHtmlHighFidelity(html: string): Promise<string> {
    console.log('Обрабатываем HTML от LibreOffice с максимальным сохранением стилей...')

    // Создаем DOM для обработки
    const dom = new JSDOM(html)
    const document = dom.window.document

    // КРИТИЧНО: Сохраняем все inline стили и не конвертируем pt в rem
    // Очищаем HTML через DOMPurify, но сохраняем все стили
    const cleanHtml = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: [
            'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
            'strong', 'em', 'u', 's', 'b', 'i',
            'ul', 'ol', 'li',
            'table', 'tr', 'td', 'th', 'thead', 'tbody', 'tfoot',
            'img', 'br', 'hr',
            'blockquote', 'pre', 'code',
            'style' // Разрешаем style теги
        ],
        ALLOWED_ATTR: [
            'style', 'class', 'id',
            'src', 'alt', 'width', 'height',
            'colspan', 'rowspan',
            'href', 'target'
        ],
        ALLOW_DATA_ATTR: true,
        KEEP_CONTENT: true,
        // КРИТИЧНО: Не удаляем inline стили
        ALLOW_UNKNOWN_PROTOCOLS: false
    })

    console.log('HTML очищен с сохранением всех inline стилей')

    return cleanHtml
}

function scoreFidelity(html: string): number {
    console.log('Оцениваем качество конвертации...')

    let score = 0
    const maxScore = 100

    // Проверяем наличие ключевых стилей форматирования
    const hasTextIndent = /text-indent\s*:\s*[^;]+/i.test(html)
    const hasMarginLeft = /margin-left\s*:\s*[^;]+/i.test(html)
    const hasMarginRight = /margin-right\s*:\s*[^;]+/i.test(html)
    const hasFontSize = /font-size\s*:\s*[^;]+/i.test(html)
    const hasLineHeight = /line-height\s*:\s*[^;]+/i.test(html)
    const hasInlineStyles = /style\s*=\s*["'][^"']*["']/i.test(html)

    // Подсчитываем очки
    if (hasTextIndent) score += 20
    if (hasMarginLeft) score += 15
    if (hasMarginRight) score += 15
    if (hasFontSize) score += 20
    if (hasLineHeight) score += 15
    if (hasInlineStyles) score += 15

    console.log(`Оценка качества конвертации: ${score}/${maxScore}`)

    return score
}