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
    paragraphAlignments: Map<number, string> // индекс параграфа -> выравнивание
}

export async function convertDocxToHtmlWithStyles(
    input: ArrayBuffer | Uint8Array | Buffer,
    options: ConvertOptions = {}
): Promise<ConvertResult> {
    console.log('[convertDocxToHtmlWithStyles] НАЧАЛО функции')

    // Добавляем таймаут для предотвращения зависания
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
            console.error('[convertDocxToHtmlWithStyles] ТАЙМАУТ! Превышено 90 секунд')
            reject(new Error('Таймаут конвертации DOCX (90 сек)'))
        }, 90000) // 90 секунд
    })

    const convertPromise = convertDocxToHtmlWithStylesInternal(input, options)

    try {
        const result = await Promise.race([convertPromise, timeoutPromise])
        console.log('[convertDocxToHtmlWithStyles] УСПЕХ, HTML длина:', result.html.length)
        return result
    } catch (error) {
        console.error('[convertDocxToHtmlWithStyles] ОШИБКА:', error)
        throw error
    }
}

async function convertDocxToHtmlWithStylesInternal(
    input: ArrayBuffer | Uint8Array | Buffer,
    options: ConvertOptions = {}
): Promise<ConvertResult> {
    console.log('[convertDocxInternal] Шаг 1: Начало конвертации')
    const buffer = toBuffer(input)
    console.log('[convertDocxInternal] Шаг 2: Буфер создан, размер:', buffer.length, 'байт')

    console.log('[convertDocxInternal] Шаг 3: Начинаем buildFormattingContext...')
    const formattingContext = await buildFormattingContext(buffer)
    console.log('[convertDocxInternal] Шаг 4: buildFormattingContext завершен')

    // Используем Map для связи ID параграфа со стилем
    const paragraphStylesMap = new Map<string, string>()
    let paragraphIndex = 0

    const runMarkers: RunStyleMarker[] = []

    const transformParagraphs = (mammoth as any).transforms.paragraph((paragraph: any) => {
        const currentParagraphIndex = paragraphIndex++
        const resolvedStyle = resolveParagraphStyle(formattingContext, paragraph.styleId)

        // ВАЖНО: Берём выравнивание из document.xml (самый надёжный источник)
        let alignment = formattingContext.paragraphAlignments.get(currentParagraphIndex)

        // Fallback: если нет в document.xml, берём из mammoth или resolvedStyle
        if (!alignment) {
            alignment = paragraph.alignment || resolvedStyle.alignment
        }

        if (currentParagraphIndex < 5 && alignment) {
            console.log(`[transform] Параграф #${currentParagraphIndex}: используем alignment = "${alignment}"`)
        }

        const effectiveParagraph = {
            ...paragraph,
            alignment: alignment || undefined
        }

        const style = buildParagraphStyle(effectiveParagraph, resolvedStyle)

        // Создаём уникальный маркер для этого параграфа
        const paragraphId = `__KELBETTY_P_${currentParagraphIndex}__`
        paragraphStylesMap.set(paragraphId, style)

        if (currentParagraphIndex < 10) {
            console.log(`[transform] Параграф #${currentParagraphIndex}: ID="${paragraphId}", стиль="${style || '(пусто)'}"`)
        }

        // Обрабатываем текстовые фрагменты (runs) внутри параграфа
        const transformedChildren = wrapRunsWithMarkers(
            paragraph.children,
            resolvedStyle,
            formattingContext,
            runMarkers
        )

        // Добавляем маркер в начало параграфа как текст
        const markerRun = documents.run([documents.text(paragraphId)])

        return {
            ...paragraph,
            children: [markerRun, ...transformedChildren]
        }
    })

    const transformDocument = (document: any) => transformParagraphs(document)

    console.log('[convertDocxInternal] Шаг 5: Запускаем mammoth.convertToHtml...')
    const mammothOptions: any = {
        includeDefaultStyleMap: true,
        convertImage: options.convertImage,
        transformDocument
    }

    if (options.styleMap) {
        mammothOptions.styleMap = options.styleMap
    }

    const result = await mammoth.convertToHtml({ buffer }, mammothOptions)
    console.log('[convertDocxInternal] Шаг 6: mammoth.convertToHtml завершен, HTML длина:', result.value.length)

    let html = result.value

    console.log('[convertDocxInternal] Шаг 7: Применяем стили параграфов через маркеры...')
    console.log('[convertDocxInternal] Сохранено стилей для параграфов:', paragraphStylesMap.size)
    const first10Entries = Array.from(paragraphStylesMap.entries()).slice(0, 10)
    console.log('[convertDocxInternal] Первые 10 стилей:', first10Entries.map(([id, style]) => ({ id, style: style || '(пусто)' })))

    // Применяем стили по маркерам
    html = applyParagraphStylesByMarkers(html, paragraphStylesMap)

    // Показываем первые 1500 символов HTML после применения стилей параграфов
    console.log('[convertDocxInternal] HTML после стилей параграфов (первые 1500 символов):', html.substring(0, 1500))

    console.log('[convertDocxInternal] Шаг 8: Применяем стили текстовых фрагментов...')
    console.log('[convertDocxInternal] Всего маркеров текста:', runMarkers.length)
    if (runMarkers.length > 0) {
        console.log('[convertDocxInternal] Первые 3 маркера текста:', runMarkers.slice(0, 3).map(m => ({
            start: m.startMarker.substring(0, 30),
            end: m.endMarker.substring(0, 30),
            style: m.style
        })))
    }
    html = applyRunStyles(html, runMarkers)
    console.log('[convertDocxInternal] Шаг 9: Удаляем маркеры...')
    html = removeResidualMarkers(html)

    // Дополнительная обработка для улучшения сохранения форматирования
    console.log('[convertDocxInternal] Шаг 10: Улучшаем форматирование...')
    html = enhanceFormattingPreservation(html)

    console.log('[convertDocxInternal] Шаг 11: Проверяем section margins...')
    if (formattingContext.sectionMargins) {
        html = wrapHtmlWithSectionMargins(html, formattingContext.sectionMargins)
    }

    console.log('[convertDocxInternal] Шаг 12: Применяем базовые стили к элементам БЕЗ inline стилей...')

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

    console.log('[convertDocxInternal] Шаг 13: ГОТОВО! Финальный размер HTML:', html.length, 'символов')
    console.log('[convertDocxInternal] Количество предупреждений:', result.messages.length)

    return {
        html,
        warnings: result.messages
    }
}

// Счетчик для логирования (вне функции)
let buildParagraphStyleCallCount = 0

function buildParagraphStyle(paragraph: any, resolvedStyle: ResolvedParagraphStyle): string {
    const styles: string[] = []

    // Логирование для отладки (параграфы с 1 по 10)
    buildParagraphStyleCallCount++

    if (buildParagraphStyleCallCount <= 10) {
        console.log(`[buildParagraphStyle #${buildParagraphStyleCallCount}]`, {
            'paragraph.alignment': paragraph.alignment,
            'paragraph.styleId': paragraph.styleId,
            'resolvedStyle.alignment': resolvedStyle.alignment,
            'paragraph keys': Object.keys(paragraph),
            'indent': paragraph.indent,
            'spacing': resolvedStyle.spacing
        })
    }

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

    // Выравнивание текста (горизонтальное)
    const alignment = paragraph.alignment || resolvedStyle.alignment
    if (alignment) {
        const cssAlignment = mapAlignment(alignment)
        if (cssAlignment) {
            styles.push(`text-align: ${cssAlignment}`)

            // Логирование для отладки
            if (buildParagraphStyleCallCount <= 10) {
                console.log(`[buildParagraphStyle #${buildParagraphStyleCallCount}] ✅ Добавлено выравнивание: text-align: ${cssAlignment}`)
            }
        }
    } else {
        // Если выравнивание не найдено, логируем это
        if (buildParagraphStyleCallCount <= 10) {
            console.log(`[buildParagraphStyle #${buildParagraphStyleCallCount}] ❌ Выравнивание НЕ найдено!`)
        }
    }

    // Направление текста (RTL/LTR)
    if (paragraph.textDirection) {
        const direction = paragraph.textDirection.toLowerCase()
        if (direction === 'rtl' || direction === 'righttoleft') {
            styles.push('direction: rtl')
        } else if (direction === 'ltr' || direction === 'lefttoright') {
            styles.push('direction: ltr')
        }
    }

    const finalStyle = styles.join('; ')

    // Логируем финальный стиль для первых 10 параграфов
    if (buildParagraphStyleCallCount <= 10) {
        console.log(`[buildParagraphStyle #${buildParagraphStyleCallCount}] 📋 Финальный стиль:`, finalStyle || '(пусто)')
    }

    return finalStyle
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

    // Жирный шрифт
    if (run.isBold === true) {
        styles.push('font-weight: bold')
    } else if (run.isBold === false) {
        styles.push('font-weight: normal')
    }

    // Курсив
    if (run.isItalic === true) {
        styles.push('font-style: italic')
    } else if (run.isItalic === false) {
        styles.push('font-style: normal')
    }

    // Подчеркивание
    if (run.isUnderline === true || run.underline) {
        const decorations: string[] = ['underline']

        // Зачеркивание
        if (run.isStrikethrough === true || run.strikethrough) {
            decorations.push('line-through')
        }

        styles.push(`text-decoration: ${decorations.join(' ')}`)
    } else if (run.isStrikethrough === true || run.strikethrough) {
        // Только зачеркивание
        styles.push('text-decoration: line-through')
    }

    // Цвет текста
    if (run.color) {
        const color = normalizeColor(run.color)
        if (color) {
            styles.push(`color: ${color}`)
        }
    }

    // Цвет фона (highlight)
    if (run.highlight || run.highlightColor) {
        const bgColor = normalizeColor(run.highlight || run.highlightColor)
        if (bgColor) {
            styles.push(`background-color: ${bgColor}`)
        }
    }

    // Верхний/нижний индекс
    if (run.verticalAlignment === 'superscript' || run.isSuperscript) {
        styles.push('vertical-align: super')
        styles.push('font-size: 0.8em')
    } else if (run.verticalAlignment === 'subscript' || run.isSubscript) {
        styles.push('vertical-align: sub')
        styles.push('font-size: 0.8em')
    }

    // Капитель (small caps)
    if (run.isSmallCaps === true) {
        styles.push('font-variant: small-caps')
    }

    // Все заглавные
    if (run.isAllCaps === true) {
        styles.push('text-transform: uppercase')
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

function applyParagraphStylesByMarkers(html: string, stylesMap: Map<string, string>): string {
    if (stylesMap.size === 0) {
        return html
    }

    console.log(`[applyParagraphStylesByMarkers] Применяем стили к ${stylesMap.size} параграфам по маркерам`)
    let processedCount = 0

    // Для каждого маркера находим его в HTML и применяем стиль к родительскому параграфу
    const entries = Array.from(stylesMap.entries())
    for (let i = 0; i < entries.length; i++) {
        const [markerId, style] = entries[i]
        if (!style) continue // Пропускаем пустые стили

        const markerIndex = html.indexOf(markerId)
        if (markerIndex === -1) {
            if (processedCount < 5) {
                console.log(`[applyParagraphStylesByMarkers] ⚠️ Маркер "${markerId}" не найден в HTML`)
            }
            continue
        }

        // Ищем открывающий тег параграфа ПЕРЕД маркером
        const beforeMarker = html.substring(0, markerIndex)
        const tagMatch = beforeMarker.match(/<(p|h[1-6])([^>]*)>$/i)

        if (!tagMatch) {
            if (processedCount < 5) {
                console.log(`[applyParagraphStylesByMarkers] ⚠️ Тег параграфа перед маркером "${markerId}" не найден`)
            }
            continue
        }

        const tagStart = beforeMarker.lastIndexOf(tagMatch[0])
        const [fullTag, tagName, attrs] = tagMatch

        // Создаём новый тег со стилями
        let newTag: string
        if (/style\s*=\s*"([^"]*)"/i.test(attrs)) {
            newTag = fullTag.replace(/style\s*=\s*"([^"]*)"/i, (m, existing) => {
                const merged = existing.trim() ? `${existing.trim()}; ${style}` : style
                return `style="${merged}"`
            })
        } else {
            newTag = `<${tagName}${attrs} style="${style}">`
        }

        // Заменяем тег и удаляем маркер
        html = html.substring(0, tagStart) + newTag + html.substring(tagStart + fullTag.length, markerIndex) + html.substring(markerIndex + markerId.length)

        processedCount++
        if (processedCount <= 5) {
            console.log(`[applyParagraphStylesByMarkers] ✅ #${processedCount}: маркер "${markerId}" → стиль "${style}"`)
        }
    }

    console.log(`[applyParagraphStylesByMarkers] Обработано ${processedCount} параграфов из ${stylesMap.size}`)
    return html
}

function applyParagraphStylesDirectly(html: string, styles: string[]): string {
    if (styles.length === 0) {
        return html
    }

    console.log(`[applyParagraphStylesDirectly] Применяем стили к ${styles.length} параграфам`)

    // Ищем все теги параграфов (<p>, <h1>-<h6>) в порядке появления
    const paragraphTags = /<(p|h[1-6])([^>]*)>/gi
    let styleIndex = 0
    let processedCount = 0

    const result = html.replace(paragraphTags, (match, tagName, attrs) => {
        if (styleIndex >= styles.length) {
            return match
        }

        const style = styles[styleIndex++]
        processedCount++

        if (processedCount % 10 === 0 || processedCount <= 5) {
            console.log(`[applyParagraphStylesDirectly] Параграф #${processedCount - 1}: применяем стиль "${style || '(пусто)'}"`)
        }

        if (!style) {
            return match // Стиль пустой, оставляем тег как есть
        }

        // Если уже есть style атрибут, добавляем к нему
        if (/style\s*=\s*"([^"]*)"/i.test(attrs)) {
            return match.replace(/style\s*=\s*"([^"]*)"/i, (m, existing) => {
                const merged = existing.trim() ? `${existing.trim()}; ${style}` : style
                return `style="${merged}"`
            })
        }

        // Иначе добавляем новый style атрибут
        return `<${tagName}${attrs} style="${style}">`
    })

    console.log(`[applyParagraphStylesDirectly] Обработано ${processedCount} параграфов из ${styles.length}`)
    return result
}

function applyParagraphStyles(html: string, markers: ParagraphStyleMarker[]): string {
    if (markers.length === 0) {
        return html
    }

    console.log(`[applyParagraphStyles] Обработка ${markers.length} маркеров параграфов...`)

    // Один проход: заменяем все маркеры и применяем стили
    let output = html
    let processedCount = 0

    for (let i = 0; i < markers.length; i++) {
        const { marker, style } = markers[i]
        processedCount++
        if (processedCount % 50 === 0) {
            console.log(`[applyParagraphStyles] Обработано ${processedCount}/${markers.length} маркеров`)
        }

        // Простая замена: находим маркер, ищем его родительский тег и добавляем стиль
        let searchStart = 0
        while (true) {
            const markerIndex = output.indexOf(marker, searchStart)
            if (markerIndex === -1) break

            // Ищем начало тега перед маркером
            const beforeMarker = output.substring(0, markerIndex)
            const tagStart = beforeMarker.lastIndexOf('<')

            if (tagStart === -1) {
                // Маркер не внутри тега, просто удаляем
                output = output.substring(0, markerIndex) + output.substring(markerIndex + marker.length)
                searchStart = markerIndex
                continue
            }

            const tagEnd = output.indexOf('>', tagStart)
            if (tagEnd === -1 || tagEnd < markerIndex) {
                // Некорректная структура, удаляем маркер
                output = output.substring(0, markerIndex) + output.substring(markerIndex + marker.length)
                searchStart = markerIndex
                continue
            }

            // Извлекаем тег и обновляем стили
            const tag = output.substring(tagStart, tagEnd + 1)
            const updatedTag = style ? addStyleToTag(tag, style) : tag

            // Собираем результат: до тега + обновленный тег + после тега (без маркера)
            output = output.substring(0, tagStart) + updatedTag + output.substring(tagEnd + 1, markerIndex) + output.substring(markerIndex + marker.length)

            // Продолжаем поиск со следующей позиции
            searchStart = tagStart + updatedTag.length
        }
    }

    console.log(`[applyParagraphStyles] Все ${markers.length} маркеров обработаны`)
    return output
}

function applyRunStyles(html: string, markers: RunStyleMarker[]): string {
    if (markers.length === 0) {
        return html
    }

    console.log(`[applyRunStyles] Обработка ${markers.length} маркеров текстовых фрагментов...`)
    let output = html
    let processedCount = 0

    for (const { startMarker, endMarker, style } of markers) {
        processedCount++
        if (processedCount % 100 === 0) {
            console.log(`[applyRunStyles] Обработано ${processedCount}/${markers.length} маркеров`)
        }

        if (!style) {
            // Просто удаляем маркеры без стилей
            output = output.split(startMarker).join('').split(endMarker).join('')
            continue
        }

        const regex = new RegExp(`${escapeForRegex(startMarker)}([\\s\\S]*?)${escapeForRegex(endMarker)}`, 'g')
        output = output.replace(regex, (_match, content) => {
            return `<span style="${style}">${content}</span>`
        })
    }

    console.log(`[applyRunStyles] Все ${markers.length} маркеров обработаны`)
    return output
}

function removeResidualMarkers(html: string): string {
    console.log('[removeResidualMarkers] Удаляем оставшиеся маркеры...')
    const result = html.replace(/__KELBETTY_[A-Z0-9_]+__/g, '')
    console.log('[removeResidualMarkers] Готово')
    return result
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

        // ВАЖНО: Парсим выравнивание напрямую из document.xml
        const paragraphAlignments = documentXml ? parseParagraphAlignmentsFromDocument(documentXml) : new Map<number, string>()
        console.log(`[buildFormattingContext] Найдено ${paragraphAlignments.size} параграфов с выравниванием в document.xml`)

        return {
            paragraphStyles: styles.paragraphStyles,
            characterStyles: styles.characterStyles,
            defaultParagraphStyleId: styles.defaultParagraphStyleId,
            defaultCharacterStyleId: styles.defaultCharacterStyleId,
            resolvedParagraphCache: new Map<string, ResolvedParagraphStyle>(),
            resolvedCharacterCache: new Map<string, RunFormatting>(),
            sectionMargins,
            paragraphAlignments
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
            sectionMargins: undefined,
            paragraphAlignments: new Map<number, string>()
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
        const alignmentValue = alignmentNode.getAttribute('w:val')
        properties.alignment = alignmentValue
        console.log(`[parseParagraphProperties] Найдено выравнивание в XML: "${alignmentValue}"`)
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

function parseParagraphAlignmentsFromDocument(xml: string): Map<number, string> {
    const alignments = new Map<number, string>()

    try {
        const parser = new DOMParser()
        const document = parser.parseFromString(xml, 'application/xml')
        const paragraphs = document.getElementsByTagName('w:p')

        console.log(`[parseParagraphAlignments] Найдено ${paragraphs.length} параграфов в document.xml`)

        for (let i = 0; i < paragraphs.length; i++) {
            const paragraph = paragraphs.item(i) as any
            if (!paragraph) continue

            // Ищем w:pPr -> w:jc в каждом параграфе
            const pPr = findChild(paragraph, 'w:pPr')
            if (pPr) {
                const jc = findChild(pPr, 'w:jc')
                if (jc) {
                    const alignmentValue = jc.getAttribute('w:val')
                    if (alignmentValue) {
                        alignments.set(i, alignmentValue)
                        if (i < 5) {
                            console.log(`[parseParagraphAlignments] Параграф #${i}: alignment = "${alignmentValue}"`)
                        }
                    }
                }
            }
        }

        return alignments
    } catch (error) {
        console.warn('[parseParagraphAlignments] Ошибка парсинга:', error)
        return alignments
    }
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

function normalizeColor(color: string): string | null {
    if (!color) {
        return null
    }

    const normalized = color.trim().toLowerCase()

    // Если уже в формате #RRGGBB или #RGB
    if (/^#[0-9a-f]{3,6}$/i.test(normalized)) {
        return normalized
    }

    // Если в формате RRGGBB (без #)
    if (/^[0-9a-f]{6}$/i.test(normalized)) {
        return `#${normalized}`
    }

    // Если в формате RGB (без #)
    if (/^[0-9a-f]{3}$/i.test(normalized)) {
        return `#${normalized}`
    }

    // Именованные цвета Word
    const wordColors: Record<string, string | null> = {
        'black': '#000000',
        'blue': '#0000FF',
        'cyan': '#00FFFF',
        'green': '#00FF00',
        'magenta': '#FF00FF',
        'red': '#FF0000',
        'yellow': '#FFFF00',
        'white': '#FFFFFF',
        'darkblue': '#00008B',
        'darkcyan': '#008B8B',
        'darkgreen': '#006400',
        'darkmagenta': '#8B008B',
        'darkred': '#8B0000',
        'darkyellow': '#808000',
        'darkgray': '#A9A9A9',
        'lightgray': '#D3D3D3',
        'auto': null // auto означает цвет по умолчанию
    }

    if (wordColors.hasOwnProperty(normalized)) {
        return wordColors[normalized]
    }

    // Если это CSS цвет, возвращаем как есть
    if (/^(rgb|rgba|hsl|hsla)\(/.test(normalized)) {
        return normalized
    }

    // Если неизвестный формат, возвращаем как есть (может быть стандартный CSS цвет)
    return color
}

function mapAlignment(alignment: string): string {
    if (!alignment) {
        return ''
    }

    const normalized = alignment.toLowerCase().trim()

    switch (normalized) {
        // Центрирование
        case 'center':
        case 'centered':
        case 'middle':
            return 'center'

        // Правое выравнивание
        case 'right':
        case 'end':
            return 'right'

        // Выравнивание по ширине
        case 'both':
        case 'justify':
        case 'distributed':
            return 'justify'

        // Левое выравнивание
        case 'left':
        case 'start':
            return 'left'

        default:
            // Если неизвестное выравнивание, логируем и возвращаем left
            console.warn(`[mapAlignment] Неизвестное выравнивание: "${alignment}", используем left`)
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
    console.log('[enhanceFormattingPreservation] Начинаем дополнительную обработку...')

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

    console.log('[enhanceFormattingPreservation] Дополнительная обработка завершена')
    return enhancedHtml
}
