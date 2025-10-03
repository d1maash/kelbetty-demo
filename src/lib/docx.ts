import * as mammoth from 'mammoth'
import JSZip from 'jszip'
import { DOMParser } from '@xmldom/xmldom'

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

interface ParagraphIndent {
    start?: number | null
    end?: number | null
    firstLine?: number | null
    hanging?: number | null
}

interface ParagraphSpacing {
    before?: number | null
    after?: number | null
    line?: number | null
    lineRule?: string | null
}

interface RunFormatting {
    fontSize?: number | null
    fontFamily?: string | null
}

interface ParagraphStyleInfo {
    styleId: string
    basedOn?: string | null
    indent?: ParagraphIndent
    spacing?: ParagraphSpacing
    alignment?: string | null
    run?: RunFormatting
}

interface CharacterStyleInfo {
    styleId: string
    basedOn?: string | null
    run?: RunFormatting
}

interface ResolvedParagraphStyle {
    indent: ParagraphIndent
    spacing: ParagraphSpacing
    alignment?: string | null
    run: RunFormatting
}

interface SectionMargins {
    top?: number | null
    bottom?: number | null
    left?: number | null
    right?: number | null
}

interface FormattingContext {
    paragraphStyles: Map<string, ParagraphStyleInfo>
    characterStyles: Map<string, CharacterStyleInfo>
    defaultParagraphStyleId: string | null
    defaultCharacterStyleId: string | null
    resolvedParagraphCache: Map<string, ResolvedParagraphStyle>
    resolvedCharacterCache: Map<string, RunFormatting>
    sectionMargins?: SectionMargins
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

    const formattingContext = await buildFormattingContext(buffer)

    const paragraphMarkers: ParagraphStyleMarker[] = []
    const runMarkers: RunStyleMarker[] = []

    const transformParagraphs = (mammoth as any).transforms.paragraph((paragraph: any) => {
        const resolvedStyle = resolveParagraphStyle(formattingContext, paragraph.styleId)
        const style = buildParagraphStyle(paragraph, resolvedStyle)
        const index = paragraphMarkers.length + 1
        const marker = `__KELBETTY_PARAGRAPH_${index}__`

        paragraphMarkers.push({ marker, style })

        const markerRun = documents.run([documents.text(marker)])
        const transformedChildren = wrapRunsWithMarkers(
            paragraph.children,
            resolvedStyle,
            formattingContext,
            runMarkers
        )

        return {
            ...paragraph,
            children: [markerRun, ...transformedChildren]
        }
    })

    const transformDocument = (document: any) => transformParagraphs(document)

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

    console.log('convertDocxToHtmlWithStyles: Применяем стили параграфов и текстовых фрагментов')
    html = applyParagraphStyles(html, paragraphMarkers)
    html = applyRunStyles(html, runMarkers)
    html = removeResidualMarkers(html)

    // Дополнительная обработка для улучшения сохранения форматирования
    html = enhanceFormattingPreservation(html)

    if (formattingContext.sectionMargins) {
        html = wrapHtmlWithSectionMargins(html, formattingContext.sectionMargins)
    }

    console.log('convertDocxToHtmlWithStyles: Применяем базовые стили только к элементам БЕЗ inline стилей')

    // Применяем базовые стили ТОЛЬКО к элементам без inline стилей
    html = html
        // Заголовки без стилей получают базовые стили
        .replace(/<h1(?!\s+style)/gi, '<h1 style="font-size: 24pt; font-weight: bold; margin: 16pt 0 8pt 0;"')
        .replace(/<h2(?!\s+style)/gi, '<h2 style="font-size: 20pt; font-weight: bold; margin: 14pt 0 6pt 0;"')
        .replace(/<h3(?!\s+style)/gi, '<h3 style="font-size: 18pt; font-weight: bold; margin: 12pt 0 4pt 0;"')
        .replace(/<h4(?!\s+style)/gi, '<h4 style="font-size: 16pt; font-weight: bold; margin: 10pt 0 4pt 0;"')
        .replace(/<h5(?!\s+style)/gi, '<h5 style="font-size: 14pt; font-weight: bold; margin: 8pt 0 4pt 0;"')
        .replace(/<h6(?!\s+style)/gi, '<h6 style="font-size: 12pt; font-weight: bold; margin: 6pt 0 4pt 0;"')
        // Параграфы без стилей получают минимальные стили
        .replace(/<p(?!\s+style)/gi, '<p style="margin: 0 0 6pt 0; line-height: 1.15;"')
        // Списки без стилей
        .replace(/<ul(?!\s+style)/gi, '<ul style="margin: 6pt 0; padding-left: 20pt;"')
        .replace(/<ol(?!\s+style)/gi, '<ol style="margin: 6pt 0; padding-left: 20pt;"')
        .replace(/<li(?!\s+style)/gi, '<li style="margin: 2pt 0;"')
        // Таблицы без стилей
        .replace(/<table(?!\s+style)/gi, '<table style="border-collapse: collapse; width: 100%; margin: 6pt 0;"')
        .replace(/<td(?!\s+style)/gi, '<td style="border: 1pt solid #000; padding: 2pt;"')
        .replace(/<th(?!\s+style)/gi, '<th style="border: 1pt solid #000; padding: 2pt; font-weight: bold; background-color: #f0f0f0;"')

    console.log('convertDocxToHtmlWithStyles: Базовые стили применены только к элементам без inline стилей')

    console.log('convertDocxToHtmlWithStyles: Конвертация завершена, размер HTML:', html.length)
    return {
        html,
        warnings: result.messages
    }
}

function buildParagraphStyle(paragraph: any, resolvedStyle: ResolvedParagraphStyle): string {
    const styles: string[] = []

    const directIndent = normalizeParagraphIndent(paragraph.indent)
    const indent = mergeParagraphIndent(resolvedStyle.indent, directIndent)

    // Обработка отступов - более точная
    if (indent.start !== null && indent.start !== undefined && indent.start !== 0) {
        styles.push(`margin-left: ${formatPt(indent.start)}`)
    }

    if (indent.end !== null && indent.end !== undefined && indent.end !== 0) {
        styles.push(`margin-right: ${formatPt(indent.end)}`)
    }

    // Обработка отступа первой строки и висячего отступа
    if (indent.firstLine !== null && indent.firstLine !== undefined && indent.firstLine !== 0) {
        if (indent.hanging !== null && indent.hanging !== undefined && indent.hanging !== 0) {
            // Висячий отступ (отрицательный)
            styles.push(`text-indent: -${formatPt(indent.hanging)}`)
            styles.push(`padding-left: ${formatPt(indent.hanging)}`)
        } else {
            // Обычный отступ первой строки
            styles.push(`text-indent: ${formatPt(indent.firstLine)}`)
        }
    } else if (indent.hanging !== null && indent.hanging !== undefined && indent.hanging !== 0) {
        // Только висячий отступ
        styles.push(`text-indent: -${formatPt(indent.hanging)}`)
        styles.push(`padding-left: ${formatPt(indent.hanging)}`)
    }

    const spacing = resolvedStyle.spacing || {}

    // Обработка отступов до и после абзаца
    if (spacing.before !== null && spacing.before !== undefined && spacing.before !== 0) {
        styles.push(`margin-top: ${formatPt(spacing.before)}`)
    }

    if (spacing.after !== null && spacing.after !== undefined && spacing.after !== 0) {
        styles.push(`margin-bottom: ${formatPt(spacing.after)}`)
    }

    // Межстрочный интервал
    const lineHeightStyle = buildLineHeightCss(spacing)
    if (lineHeightStyle) {
        styles.push(lineHeightStyle)
    }

    // Выравнивание
    const alignment = paragraph.alignment || resolvedStyle.alignment
    if (alignment) {
        styles.push(`text-align: ${mapAlignment(alignment)}`)
    }

    return styles.join('; ')
}

function buildRunStyle(
    run: any,
    resolvedParagraphStyle: ResolvedParagraphStyle,
    context: FormattingContext
): string {
    const resolvedFormatting = resolveRunFormatting(run, resolvedParagraphStyle, context)
    const styles: string[] = []

    // Размер шрифта - более точная обработка
    if (resolvedFormatting.fontSize !== null && resolvedFormatting.fontSize !== undefined && resolvedFormatting.fontSize > 0) {
        const fontSize = Math.max(6, Math.min(72, resolvedFormatting.fontSize)) // Ограничиваем разумными пределами
        styles.push(`font-size: ${formatPt(fontSize)}`)
    }

    // Семейство шрифтов
    if (resolvedFormatting.fontFamily && resolvedFormatting.fontFamily.trim()) {
        const fontFamily = resolvedFormatting.fontFamily.trim()
        // Обрабатываем множественные шрифты
        const fontList = fontFamily.split(',').map(font => {
            const cleanFont = font.trim().replace(/['"]/g, '')
            return cleanFont.includes(' ') ? `'${cleanFont}'` : cleanFont
        }).join(', ')
        styles.push(`font-family: ${fontList}`)
    }

    return styles.join('; ')
}

function wrapRunsWithMarkers(
    children: any[],
    resolvedParagraphStyle: ResolvedParagraphStyle,
    context: FormattingContext,
    runMarkers: RunStyleMarker[]
): any[] {
    if (!Array.isArray(children)) {
        return children
    }

    return children.map((child: any) => {
        if (!child) {
            return child
        }

        if (child.type === documents.types.run) {
            const style = buildRunStyle(child, resolvedParagraphStyle, context)
            if (!style) {
                return child
            }

            const index = runMarkers.length + 1
            const startMarker = `__KELBETTY_RUN_${index}_START__`
            const endMarker = `__KELBETTY_RUN_${index}_END__`

            runMarkers.push({ startMarker, endMarker, style })

            return {
                ...child,
                children: [documents.text(startMarker), ...(child.children || []), documents.text(endMarker)]
            }
        }

        if (Array.isArray(child.children) && child.children.length > 0) {
            return {
                ...child,
                children: wrapRunsWithMarkers(child.children, resolvedParagraphStyle, context, runMarkers)
            }
        }

        return child
    })
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

async function buildFormattingContext(buffer: Buffer): Promise<FormattingContext> {
    try {
        const zip = await JSZip.loadAsync(buffer)
        const [stylesXml, documentXml] = await Promise.all([
            readEntry(zip, 'word/styles.xml'),
            readEntry(zip, 'word/document.xml')
        ])

        const styles = stylesXml ? parseStylesXml(stylesXml) : {
            paragraphStyles: new Map<string, ParagraphStyleInfo>(),
            characterStyles: new Map<string, CharacterStyleInfo>(),
            defaultParagraphStyleId: null,
            defaultCharacterStyleId: null
        }

        const sectionMargins = documentXml ? parseSectionMargins(documentXml) : undefined

        return {
            paragraphStyles: styles.paragraphStyles,
            characterStyles: styles.characterStyles,
            defaultParagraphStyleId: styles.defaultParagraphStyleId,
            defaultCharacterStyleId: styles.defaultCharacterStyleId,
            resolvedParagraphCache: new Map<string, ResolvedParagraphStyle>(),
            resolvedCharacterCache: new Map<string, RunFormatting>(),
            sectionMargins
        }
    } catch (error) {
        console.warn('convertDocxToHtmlWithStyles: Ошибка разбора DOCX стилей:', error)
        return {
            paragraphStyles: new Map<string, ParagraphStyleInfo>(),
            characterStyles: new Map<string, CharacterStyleInfo>(),
            defaultParagraphStyleId: null,
            defaultCharacterStyleId: null,
            resolvedParagraphCache: new Map<string, ResolvedParagraphStyle>(),
            resolvedCharacterCache: new Map<string, RunFormatting>(),
            sectionMargins: undefined
        }
    }
}

async function readEntry(zip: JSZip, path: string): Promise<string | null> {
    const file = zip.file(path)
    if (!file) {
        return null
    }

    return file.async('text')
}

function parseStylesXml(xml: string): {
    paragraphStyles: Map<string, ParagraphStyleInfo>
    characterStyles: Map<string, CharacterStyleInfo>
    defaultParagraphStyleId: string | null
    defaultCharacterStyleId: string | null
} {
    const parser = new DOMParser()
    const document = parser.parseFromString(xml, 'application/xml')
    const styleNodes = Array.from(document.getElementsByTagName('w:style')) as any[]

    const paragraphStyles = new Map<string, ParagraphStyleInfo>()
    const characterStyles = new Map<string, CharacterStyleInfo>()
    let defaultParagraphStyleId: string | null = null
    let defaultCharacterStyleId: string | null = null

    for (const node of styleNodes) {
        const styleId = node.getAttribute('w:styleId')
        const type = node.getAttribute('w:type')

        if (!styleId || !type) {
            continue
        }

        const basedOn = getChildAttribute(node, 'w:basedOn', 'w:val')
        const isDefault = node.getAttribute('w:default') === '1'

        if (type === 'paragraph') {
            const paragraphProps = parseParagraphProperties(node)
            const runProps = parseRunProperties(node)

            paragraphStyles.set(styleId, {
                styleId,
                basedOn: basedOn || null,
                indent: paragraphProps.indent,
                spacing: paragraphProps.spacing,
                alignment: paragraphProps.alignment,
                run: runProps
            })

            if (isDefault) {
                defaultParagraphStyleId = styleId
            }
        } else if (type === 'character') {
            const runProps = parseRunProperties(node)

            characterStyles.set(styleId, {
                styleId,
                basedOn: basedOn || null,
                run: runProps
            })

            if (isDefault) {
                defaultCharacterStyleId = styleId
            }
        }
    }

    return {
        paragraphStyles,
        characterStyles,
        defaultParagraphStyleId,
        defaultCharacterStyleId
    }
}

function parseParagraphProperties(styleNode: any): {
    indent?: ParagraphIndent
    spacing?: ParagraphSpacing
    alignment?: string | null
} {
    const properties: {
        indent?: ParagraphIndent
        spacing?: ParagraphSpacing
        alignment?: string | null
    } = {}

    const paragraphProps = findChild(styleNode, 'w:pPr')
    if (!paragraphProps) {
        return properties
    }

    const indentNode = findChild(paragraphProps, 'w:ind')
    if (indentNode) {
        const indent: ParagraphIndent = {}
        const start = twipStringToPt(indentNode.getAttribute('w:start') || indentNode.getAttribute('w:left'))
        if (start !== null) {
            indent.start = start
        }

        const end = twipStringToPt(indentNode.getAttribute('w:end') || indentNode.getAttribute('w:right'))
        if (end !== null) {
            indent.end = end
        }

        const firstLine = twipStringToPt(indentNode.getAttribute('w:firstLine'))
        if (firstLine !== null) {
            indent.firstLine = firstLine
        }

        const hanging = twipStringToPt(indentNode.getAttribute('w:hanging'))
        if (hanging !== null) {
            indent.hanging = hanging
        }

        if (Object.keys(indent).length > 0) {
            properties.indent = indent
        }
    }

    const spacingNode = findChild(paragraphProps, 'w:spacing')
    if (spacingNode) {
        const spacing: ParagraphSpacing = {}
        const before = twipStringToPt(spacingNode.getAttribute('w:before'))
        if (before !== null) {
            spacing.before = before
        }

        const after = twipStringToPt(spacingNode.getAttribute('w:after'))
        if (after !== null) {
            spacing.after = after
        }

        const lineAttr = spacingNode.getAttribute('w:line')
        if (lineAttr) {
            const parsedLine = parseInt(lineAttr, 10)
            if (!Number.isNaN(parsedLine)) {
                spacing.line = parsedLine
                spacing.lineRule = spacingNode.getAttribute('w:lineRule') || null
            }
        }

        if (Object.keys(spacing).length > 0) {
            properties.spacing = spacing
        }
    }

    const alignmentNode = findChild(paragraphProps, 'w:jc')
    if (alignmentNode) {
        properties.alignment = alignmentNode.getAttribute('w:val')
    }

    return properties
}

function parseRunProperties(styleNode: any): RunFormatting | undefined {
    const runProps = findChild(styleNode, 'w:rPr')
    if (!runProps) {
        return undefined
    }

    const formatting: RunFormatting = {}

    const sizeNode = findChild(runProps, 'w:sz') || findChild(runProps, 'w:szCs')
    if (sizeNode) {
        const fontSize = halfPointsToPt(sizeNode.getAttribute('w:val'))
        if (fontSize !== null) {
            formatting.fontSize = fontSize
        }
    }

    const fontsNode = findChild(runProps, 'w:rFonts')
    if (fontsNode) {
        const font =
            fontsNode.getAttribute('w:ascii') ||
            fontsNode.getAttribute('w:hAnsi') ||
            fontsNode.getAttribute('w:cs')
        if (font) {
            formatting.fontFamily = font
        }
    }

    return Object.keys(formatting).length > 0 ? formatting : undefined
}

function parseSectionMargins(xml: string): SectionMargins | undefined {
    try {
        const parser = new DOMParser()
        const document = parser.parseFromString(xml, 'application/xml')
        const sectPrNodes = document.getElementsByTagName('w:sectPr')

        if (!sectPrNodes || sectPrNodes.length === 0) {
            return undefined
        }

        const sectionProperties = sectPrNodes.item(0) as any
        const pageMargin = findChild(sectionProperties, 'w:pgMar')

        if (!pageMargin) {
            return undefined
        }

        const margins: SectionMargins = {}

        const top = twipStringToPt(pageMargin.getAttribute('w:top'))
        if (top !== null) {
            margins.top = top
        }

        const bottom = twipStringToPt(pageMargin.getAttribute('w:bottom'))
        if (bottom !== null) {
            margins.bottom = bottom
        }

        const left = twipStringToPt(pageMargin.getAttribute('w:left') || pageMargin.getAttribute('w:start'))
        if (left !== null) {
            margins.left = left
        }

        const right = twipStringToPt(pageMargin.getAttribute('w:right') || pageMargin.getAttribute('w:end'))
        if (right !== null) {
            margins.right = right
        }

        return margins
    } catch (error) {
        console.warn('convertDocxToHtmlWithStyles: Не удалось разобрать sectPr:', error)
        return undefined
    }
}

function getChildAttribute(node: any, tagName: string, attributeName: string): string | null {
    const child = findChild(node, tagName)
    if (!child) {
        return null
    }
    const value = child.getAttribute(attributeName)
    return value !== undefined ? value : null
}

function findChild(node: any, tagName: string): any | null {
    if (!node || !node.childNodes) {
        return null
    }

    for (let i = 0; i < node.childNodes.length; i += 1) {
        const child = node.childNodes[i]
        if (child && child.nodeType === 1 && child.nodeName === tagName) {
            return child
        }
    }

    return null
}

function resolveParagraphStyle(
    context: FormattingContext,
    styleId?: string | null,
    visited: Set<string> = new Set()
): ResolvedParagraphStyle {
    const targetId = styleId ?? context.defaultParagraphStyleId
    if (!targetId) {
        return createEmptyResolvedParagraphStyle()
    }

    const cached = context.resolvedParagraphCache.get(targetId)
    if (cached) {
        return cached
    }

    if (visited.has(targetId)) {
        return createEmptyResolvedParagraphStyle()
    }

    visited.add(targetId)
    const style = context.paragraphStyles.get(targetId)

    let base = createEmptyResolvedParagraphStyle()
    if (style && style.basedOn) {
        base = resolveParagraphStyle(context, style.basedOn, visited)
    } else if (!style && targetId !== context.defaultParagraphStyleId && context.defaultParagraphStyleId) {
        base = resolveParagraphStyle(context, context.defaultParagraphStyleId, visited)
    }

    const resolved = style ? mergeResolvedParagraphStyle(base, style) : base
    context.resolvedParagraphCache.set(targetId, resolved)
    return resolved
}

function resolveCharacterStyle(
    context: FormattingContext,
    styleId?: string | null,
    visited: Set<string> = new Set()
): RunFormatting {
    const targetId = styleId ?? context.defaultCharacterStyleId
    if (!targetId) {
        return {}
    }

    const cached = context.resolvedCharacterCache.get(targetId)
    if (cached) {
        return cached
    }

    if (visited.has(targetId)) {
        return {}
    }

    visited.add(targetId)
    const style = context.characterStyles.get(targetId)

    let base: RunFormatting = {}
    if (style && style.basedOn) {
        base = resolveCharacterStyle(context, style.basedOn, visited)
    } else if (!style && targetId !== context.defaultCharacterStyleId && context.defaultCharacterStyleId) {
        base = resolveCharacterStyle(context, context.defaultCharacterStyleId, visited)
    }

    const resolved = style ? mergeRunFormatting(base, style.run) : base
    context.resolvedCharacterCache.set(targetId, resolved)
    return resolved
}

function createEmptyResolvedParagraphStyle(): ResolvedParagraphStyle {
    return {
        indent: {},
        spacing: {},
        alignment: null,
        run: {}
    }
}

function mergeResolvedParagraphStyle(base: ResolvedParagraphStyle, styleInfo: ParagraphStyleInfo): ResolvedParagraphStyle {
    return {
        indent: mergeParagraphIndent(base.indent, styleInfo.indent),
        spacing: mergeParagraphSpacing(base.spacing, styleInfo.spacing),
        alignment: styleInfo.alignment ?? base.alignment ?? null,
        run: mergeRunFormatting(base.run, styleInfo.run)
    }
}

function mergeParagraphIndent(base: ParagraphIndent = {}, override?: ParagraphIndent): ParagraphIndent {
    const result: ParagraphIndent = { ...base }

    if (!override) {
        return result
    }

    if (override.start !== undefined && override.start !== null) {
        result.start = override.start
    }

    if (override.end !== undefined && override.end !== null) {
        result.end = override.end
    }

    if (override.firstLine !== undefined && override.firstLine !== null) {
        result.firstLine = override.firstLine
    }

    if (override.hanging !== undefined && override.hanging !== null) {
        result.hanging = override.hanging
    }

    return result
}

function mergeParagraphSpacing(base: ParagraphSpacing = {}, override?: ParagraphSpacing): ParagraphSpacing {
    const result: ParagraphSpacing = { ...base }

    if (!override) {
        return result
    }

    if (override.before !== undefined && override.before !== null) {
        result.before = override.before
    }

    if (override.after !== undefined && override.after !== null) {
        result.after = override.after
    }

    if (override.line !== undefined && override.line !== null) {
        result.line = override.line
        result.lineRule = override.lineRule ?? result.lineRule ?? null
    }

    if (override.lineRule !== undefined && override.lineRule !== null) {
        result.lineRule = override.lineRule
    }

    return result
}

function mergeRunFormatting(base: RunFormatting = {}, override?: RunFormatting): RunFormatting {
    const result: RunFormatting = { ...base }

    if (!override) {
        return result
    }

    if (override.fontSize !== undefined && override.fontSize !== null) {
        result.fontSize = override.fontSize
    }

    if (override.fontFamily !== undefined && override.fontFamily !== null && override.fontFamily.trim().length > 0) {
        result.fontFamily = override.fontFamily
    }

    return result
}

function mergeRunFormattingMultiple(values: Array<RunFormatting | undefined>): RunFormatting {
    return values.reduce<RunFormatting>((accumulator, item) => mergeRunFormatting(accumulator, item), {})
}

function normalizeParagraphIndent(indent?: any): ParagraphIndent | undefined {
    if (!indent) {
        return undefined
    }

    const normalized: ParagraphIndent = {}

    const start = twipStringToPt(indent.start)
    if (start !== null) {
        normalized.start = start
    }

    const end = twipStringToPt(indent.end)
    if (end !== null) {
        normalized.end = end
    }

    const firstLine = twipStringToPt(indent.firstLine)
    if (firstLine !== null) {
        normalized.firstLine = firstLine
    }

    const hanging = twipStringToPt(indent.hanging)
    if (hanging !== null) {
        normalized.hanging = hanging
    }

    return Object.keys(normalized).length > 0 ? normalized : undefined
}

function buildLineHeightCss(spacing: ParagraphSpacing): string | null {
    if (!spacing || spacing.line === null || spacing.line === undefined) {
        return null
    }

    const lineValue = spacing.line
    const lineRule = spacing.lineRule || 'auto'

    if (lineRule === 'auto') {
        const multiplier = lineValue / 240
        if (!Number.isFinite(multiplier) || multiplier <= 0) {
            return null
        }
        return `line-height: ${Number(multiplier.toFixed(2))}`
    }

    const ptValue = lineValue / 20
    if (!Number.isFinite(ptValue) || ptValue <= 0) {
        return null
    }

    return `line-height: ${formatPt(ptValue)}`
}

function extractDirectRunFormatting(run: any): RunFormatting {
    const formatting: RunFormatting = {}

    const fontSize = normalizeFontSize(run.fontSize)
    if (fontSize !== null) {
        formatting.fontSize = fontSize
    }

    if (run.font) {
        const font = typeof run.font === 'string' ? run.font : run.font?.ascii
        if (font) {
            formatting.fontFamily = font
        }
    }

    return formatting
}

function resolveRunFormatting(
    run: any,
    resolvedParagraphStyle: ResolvedParagraphStyle,
    context: FormattingContext
): RunFormatting {
    const defaultCharacterFormatting = resolveCharacterStyle(context)
    const paragraphRunFormatting = resolvedParagraphStyle.run
    const runStyleFormatting = resolveCharacterStyle(context, run.styleId)
    const directFormatting = extractDirectRunFormatting(run)

    return mergeRunFormattingMultiple([
        defaultCharacterFormatting,
        paragraphRunFormatting,
        runStyleFormatting,
        directFormatting
    ])
}

function wrapHtmlWithSectionMargins(html: string, margins: SectionMargins): string {
    const styles: string[] = []

    if (margins.top !== null && margins.top !== undefined) {
        styles.push(`padding-top: ${formatPt(margins.top)}`)
    }

    if (margins.bottom !== null && margins.bottom !== undefined) {
        styles.push(`padding-bottom: ${formatPt(margins.bottom)}`)
    }

    if (margins.left !== null && margins.left !== undefined) {
        styles.push(`padding-left: ${formatPt(margins.left)}`)
    }

    if (margins.right !== null && margins.right !== undefined) {
        styles.push(`padding-right: ${formatPt(margins.right)}`)
    }

    if (styles.length === 0) {
        return html
    }

    return `<div class="docx-section" style="${styles.join('; ')}">${html}</div>`
}

function twipStringToPt(value?: string | number | null): number | null {
    if (value === undefined || value === null) {
        return null
    }

    const numeric = typeof value === 'string' ? parseInt(value, 10) : value
    if (Number.isNaN(numeric)) {
        return null
    }

    return numeric / 20
}

function halfPointsToPt(value?: string | null): number | null {
    if (!value) {
        return null
    }

    const numeric = parseFloat(value)
    if (Number.isNaN(numeric)) {
        return null
    }

    return numeric / 2
}

function formatPt(value: number): string {
    const fixed = Number(value.toFixed(2))
    return Number.isInteger(fixed) ? `${fixed}pt` : `${fixed.toFixed(2)}pt`
}

function normalizeFontSize(value: any): number | null {
    if (value === undefined || value === null) {
        return null
    }

    if (typeof value === 'number') {
        return value
    }

    if (typeof value === 'string') {
        const parsed = parseFloat(value)
        return Number.isNaN(parsed) ? null : parsed
    }

    if (typeof value === 'object' && value.value !== undefined) {
        const parsed = parseFloat(value.value)
        return Number.isNaN(parsed) ? null : parsed
    }

    return null
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

/**
 * Дополнительная обработка HTML для улучшения сохранения форматирования
 */
function enhanceFormattingPreservation(html: string): string {
    console.log('enhanceFormattingPreservation: Начинаем дополнительную обработку форматирования')

    let enhancedHtml = html

    // 1. Улучшаем обработку размеров шрифтов
    enhancedHtml = enhancedHtml.replace(
        /font-size:\s*(\d+(?:\.\d+)?)pt/gi,
        (match, size) => {
            const numericSize = parseFloat(size)
            if (numericSize > 0) {
                return `font-size: ${formatPt(numericSize)}`
            }
            return match
        }
    )

    // 2. Улучшаем обработку отступов
    enhancedHtml = enhancedHtml.replace(
        /margin-left:\s*(\d+(?:\.\d+)?)pt/gi,
        (match, size) => {
            const numericSize = parseFloat(size)
            if (numericSize > 0) {
                return `margin-left: ${formatPt(numericSize)}`
            }
            return match
        }
    )

    enhancedHtml = enhancedHtml.replace(
        /margin-right:\s*(\d+(?:\.\d+)?)pt/gi,
        (match, size) => {
            const numericSize = parseFloat(size)
            if (numericSize > 0) {
                return `margin-right: ${formatPt(numericSize)}`
            }
            return match
        }
    )

    // 3. Улучшаем обработку отступов первой строки
    enhancedHtml = enhancedHtml.replace(
        /text-indent:\s*(\d+(?:\.\d+)?)pt/gi,
        (match, size) => {
            const numericSize = parseFloat(size)
            if (numericSize !== 0) {
                return `text-indent: ${formatPt(numericSize)}`
            }
            return match
        }
    )

    // 4. Улучшаем обработку межстрочного интервала
    enhancedHtml = enhancedHtml.replace(
        /line-height:\s*(\d+(?:\.\d+)?)/gi,
        (match, size) => {
            const numericSize = parseFloat(size)
            if (numericSize > 0) {
                return `line-height: ${numericSize.toFixed(2)}`
            }
            return match
        }
    )

    // 5. Убираем пустые или некорректные стили
    enhancedHtml = enhancedHtml.replace(
        /style="[^"]*font-size:\s*0pt[^"]*"/gi,
        (match) => {
            // Убираем некорректные размеры шрифтов
            return match.replace(/font-size:\s*0pt[^;]*;?\s*/gi, '')
        }
    )

    // 6. Убираем пустые атрибуты style
    enhancedHtml = enhancedHtml.replace(/style="\s*"/gi, '')
    enhancedHtml = enhancedHtml.replace(/style="\s*;\s*"/gi, '')

    console.log('enhanceFormattingPreservation: Дополнительная обработка завершена')
    return enhancedHtml
}
