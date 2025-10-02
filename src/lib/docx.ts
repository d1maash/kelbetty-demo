import * as mammoth from 'mammoth'

// @ts-ignore
const documents: any = require('mammoth/lib/documents')

interface ParagraphStyleMarker {
    marker: string
    style: string
}

interface RunStyleMarker {
    startMarker: string
    endMarker: string
    style: string
}

interface ConvertOptions {
    convertImage?: any
    styleMap?: string[]
}

interface ConvertResult {
    html: string
    warnings: any[]
}

export async function convertDocxToHtmlWithStyles(
    input: ArrayBuffer | Uint8Array | Buffer,
    options: ConvertOptions = {}
): Promise<ConvertResult> {
    // Добавляем таймаут для предотвращения зависания
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Таймаут конвертации DOCX')), 60000) // 60 секунд
    })

    const convertPromise = convertDocxToHtmlWithStylesInternal(input, options)

    return Promise.race([convertPromise, timeoutPromise])
}

async function convertDocxToHtmlWithStylesInternal(
    input: ArrayBuffer | Uint8Array | Buffer,
    options: ConvertOptions = {}
): Promise<ConvertResult> {
    console.log('convertDocxToHtmlWithStyles: Начало конвертации')
    const buffer = toBuffer(input)
    console.log('convertDocxToHtmlWithStyles: Буфер создан, размер:', buffer.length)

    const paragraphMarkers: ParagraphStyleMarker[] = []
    const runMarkers: RunStyleMarker[] = []

    const transformRuns = (mammoth as any).transforms.run((run: any) => {
        const style = buildRunStyle(run)
        if (!style) {
            return run
        }

        const index = runMarkers.length + 1
        const startMarker = `__KELBETTY_RUN_${index}_START__`
        const endMarker = `__KELBETTY_RUN_${index}_END__`

        runMarkers.push({ startMarker, endMarker, style })

        const newChildren = [
            documents.text(startMarker),
            ...run.children,
            documents.text(endMarker)
        ]

        return {
            ...run,
            children: newChildren
        }
    })

    const transformParagraphs = (mammoth as any).transforms.paragraph((paragraph: any) => {
        const style = buildParagraphStyle(paragraph)
        const index = paragraphMarkers.length + 1
        const marker = `__KELBETTY_PARAGRAPH_${index}__`

        paragraphMarkers.push({ marker, style })

        const markerRun = documents.run([documents.text(marker)])
        return {
            ...paragraph,
            children: [markerRun, ...paragraph.children]
        }
    })

    const transformDocument = (document: any) => transformParagraphs(transformRuns(document))

    console.log('convertDocxToHtmlWithStyles: Запускаем mammoth.convertToHtml')
    const mammothOptions: any = {
        includeDefaultStyleMap: true,
        convertImage: options.convertImage,
        transformDocument
    }

    if (options.styleMap) {
        mammothOptions.styleMap = options.styleMap
    }

    const result = await mammoth.convertToHtml({ buffer }, mammothOptions)
    console.log('convertDocxToHtmlWithStyles: mammoth.convertToHtml завершен')

    let html = result.value
    console.log('convertDocxToHtmlWithStyles: Применяем базовые стили к HTML')

    // Упрощенная обработка стилей - применяем только базовые стили
    html = html
        // Заголовки без стилей получают базовые стили
        .replace(/<h1(?!\s+style)/gi, '<h1 style="font-size: 24pt; font-weight: bold; margin: 16pt 0 8pt 0;"')
        .replace(/<h2(?!\s+style)/gi, '<h2 style="font-size: 20pt; font-weight: bold; margin: 14pt 0 6pt 0;"')
        .replace(/<h3(?!\s+style)/gi, '<h3 style="font-size: 18pt; font-weight: bold; margin: 12pt 0 4pt 0;"')
        .replace(/<h4(?!\s+style)/gi, '<h4 style="font-size: 16pt; font-weight: bold; margin: 10pt 0 4pt 0;"')
        .replace(/<h5(?!\s+style)/gi, '<h5 style="font-size: 14pt; font-weight: bold; margin: 8pt 0 4pt 0;"')
        .replace(/<h6(?!\s+style)/gi, '<h6 style="font-size: 12pt; font-weight: bold; margin: 6pt 0 4pt 0;"')
        // Параграфы без стилей
        .replace(/<p(?!\s+style)/gi, '<p style="margin: 0 0 6pt 0; line-height: 1.15;"')
        // Списки без стилей
        .replace(/<ul(?!\s+style)/gi, '<ul style="margin: 6pt 0; padding-left: 20pt;"')
        .replace(/<ol(?!\s+style)/gi, '<ol style="margin: 6pt 0; padding-left: 20pt;"')
        .replace(/<li(?!\s+style)/gi, '<li style="margin: 2pt 0;"')
        // Таблицы без стилей
        .replace(/<table(?!\s+style)/gi, '<table style="border-collapse: collapse; width: 100%; margin: 6pt 0;"')
        .replace(/<td(?!\s+style)/gi, '<td style="border: 1pt solid #000; padding: 2pt;"')
        .replace(/<th(?!\s+style)/gi, '<th style="border: 1pt solid #000; padding: 2pt; font-weight: bold; background-color: #f0f0f0;"')

    console.log('convertDocxToHtmlWithStyles: Базовые стили применены')

    console.log('convertDocxToHtmlWithStyles: Конвертация завершена, размер HTML:', html.length)
    return {
        html,
        warnings: result.messages
    }
}

function buildParagraphStyle(paragraph: any): string {
    const styles: string[] = []

    const indent = paragraph.indent || {}
    const start = twipStringToPt(indent.start)
    const end = twipStringToPt(indent.end)
    const firstLine = twipStringToPt(indent.firstLine)
    const hanging = twipStringToPt(indent.hanging)

    if (start !== null) {
        styles.push(`margin-left: ${formatPt(start)}`)
    }

    if (end !== null) {
        styles.push(`margin-right: ${formatPt(end)}`)
    }

    if (firstLine !== null) {
        styles.push(`text-indent: ${formatPt(firstLine)}`)
    }

    if (hanging !== null) {
        // Hanging indent means negative first line
        styles.push(`text-indent: -${formatPt(hanging)}`)
    }

    if (paragraph.alignment) {
        styles.push(`text-align: ${mapAlignment(paragraph.alignment)}`)
    }

    // Добавляем межстрочный интервал если есть
    if (paragraph.lineHeight) {
        styles.push(`line-height: ${paragraph.lineHeight}`)
    }

    // Добавляем отступы сверху и снизу если есть
    if (paragraph.spaceBefore) {
        const spaceBefore = twipStringToPt(paragraph.spaceBefore)
        if (spaceBefore !== null) {
            styles.push(`margin-top: ${formatPt(spaceBefore)}`)
        }
    }

    if (paragraph.spaceAfter) {
        const spaceAfter = twipStringToPt(paragraph.spaceAfter)
        if (spaceAfter !== null) {
            styles.push(`margin-bottom: ${formatPt(spaceAfter)}`)
        }
    }

    return styles.join('; ')
}

function buildRunStyle(run: any): string {
    const styles: string[] = []

    if (run.fontSize) {
        styles.push(`font-size: ${formatPt(run.fontSize)}`)
    }

    if (run.font) {
        const font = typeof run.font === 'string' ? run.font : run.font?.ascii
        if (font) {
            styles.push(`font-family: '${font.replace(/'/g, "\\'")}'`)
        }
    }

    // Добавляем цвет текста если есть
    if (run.color) {
        styles.push(`color: ${run.color}`)
    }

    // Добавляем жирность если есть
    if (run.bold) {
        styles.push(`font-weight: bold`)
    }

    // Добавляем курсив если есть
    if (run.italic) {
        styles.push(`font-style: italic`)
    }

    // Добавляем подчеркивание если есть
    if (run.underline) {
        styles.push(`text-decoration: underline`)
    }

    // Добавляем зачеркивание если есть
    if (run.strikethrough) {
        styles.push(`text-decoration: line-through`)
    }

    return styles.join('; ')
}

function applyParagraphStyles(html: string, markers: ParagraphStyleMarker[]): string {
    let output = html

    for (const { marker, style } of markers) {
        let index = output.indexOf(marker)
        while (index !== -1) {
            const tagStart = output.lastIndexOf('<', index)
            const tagEnd = output.indexOf('>', tagStart)

            if (tagStart === -1 || tagEnd === -1) {
                break
            }

            const tag = output.slice(tagStart, tagEnd + 1)
            const updatedTag = style ? addStyleToTag(tag, style) : tag

            output = output.slice(0, tagStart) + updatedTag + output.slice(tagEnd + 1)
            output = output.slice(0, index) + output.slice(index + marker.length)
            index = output.indexOf(marker)
        }
    }

    return output
}

function applyRunStyles(html: string, markers: RunStyleMarker[]): string {
    let output = html

    for (const { startMarker, endMarker, style } of markers) {
        if (!style) {
            continue
        }

        const regex = new RegExp(`${escapeForRegex(startMarker)}([\\s\\S]*?)${escapeForRegex(endMarker)}`, 'g')
        output = output.replace(regex, (_match, content) => {
            const cleaned = content
            return `<span style="${style}">${cleaned}</span>`
        })
    }

    return output
}

function removeResidualMarkers(html: string): string {
    return html.replace(/__KELBETTY_[A-Z0-9_]+__/g, '')
}

function addStyleToTag(tag: string, style: string): string {
    if (!style) {
        return tag
    }

    if (/style\s*=/.test(tag)) {
        return tag.replace(/style\s*=\s*"([^"]*)"/, (_match, existing) => {
            const merged = existing.trim().length > 0 ? `${existing.trim()}; ${style}` : style
            return `style="${merged}"`
        })
    }

    return tag.replace(/^(<\w+)([^>]*)(>)/, (_match, start, attrs, end) => {
        const space = attrs?.length ? attrs : ''
        const spacer = space && /\s$/.test(space) ? '' : ' '
        return `${start}${attrs}${spacer}style="${style}"${end}`
    })
}

function twipStringToPt(value?: string | null): number | null {
    if (!value) {
        return null
    }

    const numeric = parseInt(value, 10)
    if (Number.isNaN(numeric)) {
        return null
    }

    return numeric / 20
}

function formatPt(value: number): string {
    const fixed = Number(value.toFixed(2))
    return Number.isInteger(fixed) ? `${fixed}pt` : `${fixed.toFixed(2)}pt`
}

function mapAlignment(alignment: string): string {
    switch (alignment) {
        case 'center':
            return 'center'
        case 'right':
            return 'right'
        case 'both':
            return 'justify'
        default:
            return 'left'
    }
}

function escapeForRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function toBuffer(input: ArrayBuffer | Uint8Array | Buffer): Buffer {
    if (Buffer.isBuffer(input)) {
        return input
    }

    if (input instanceof Uint8Array) {
        return Buffer.from(input)
    }

    return Buffer.from(new Uint8Array(input))
}
