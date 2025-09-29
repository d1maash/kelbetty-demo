import { Document } from '@prisma/client'

export interface DocumentAiInput {
    document: Pick<Document, 'id' | 'title' | 'html' | 'type'>
    message: string
}

export interface DocumentAiResult {
    response: string
    suggestion?: {
        description: string
        preview: string
        patch: {
            type: 'html_overwrite'
            documentId: string
            updatedHtml: string
            changes: Array<{
                selector: string
                style: Record<string, string>
                summary: string
            }>
        }
    }
}

interface TransformationResult {
    updatedHtml: string
    response: string
    description: string
    preview: string
    changes: Array<{
        selector: string
        style: Record<string, string>
        summary: string
    }>
}

export function processDocumentAi({ document, message }: DocumentAiInput): DocumentAiResult {
    const normalizedMessage = message.toLowerCase()

    const html = document.html ?? ''

    if (!html.trim()) {
        return {
            response: 'В выбранном документе нет HTML-контента. Загрузите DOCX документ через импорт, чтобы работать с форматированием.'
        }
    }

    const transformations: TransformationResult[] = []
    let currentHtml = html

    // Детекция различных типов изменений
    const headingColor = detectHeadingColorChange(normalizedMessage)
    if (headingColor) {
        const result = applyStyleTransformation(currentHtml, ['h1', 'h2', 'h3', 'h4'], headingColor.value, headingColor.description, headingColor.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const paragraphFontSize = detectParagraphFontSizeChange(normalizedMessage)
    if (paragraphFontSize) {
        const result = applyStyleTransformation(currentHtml, ['p'], paragraphFontSize.value, paragraphFontSize.description, paragraphFontSize.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const lineHeight = detectLineHeightChange(normalizedMessage)
    if (lineHeight) {
        const result = applyStyleTransformation(currentHtml, ['p'], lineHeight.value, lineHeight.description, lineHeight.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const centerAlignment = detectCenterAlignment(normalizedMessage)
    if (centerAlignment) {
        const result = applyStyleTransformation(currentHtml, centerAlignment.targets, centerAlignment.value, centerAlignment.description, centerAlignment.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    // Новые детекторы
    const boldText = detectBoldText(normalizedMessage)
    if (boldText) {
        const result = applyStyleTransformation(currentHtml, boldText.targets, boldText.value, boldText.description, boldText.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const italicText = detectItalicText(normalizedMessage)
    if (italicText) {
        const result = applyStyleTransformation(currentHtml, italicText.targets, italicText.value, italicText.description, italicText.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const underlineText = detectUnderlineText(normalizedMessage)
    if (underlineText) {
        const result = applyStyleTransformation(currentHtml, underlineText.targets, underlineText.value, underlineText.description, underlineText.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const textColor = detectTextColorChange(normalizedMessage)
    if (textColor) {
        const result = applyStyleTransformation(currentHtml, textColor.targets, textColor.value, textColor.description, textColor.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const backgroundColor = detectBackgroundColorChange(normalizedMessage)
    if (backgroundColor) {
        const result = applyStyleTransformation(currentHtml, backgroundColor.targets, backgroundColor.value, backgroundColor.description, backgroundColor.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const marginChanges = detectMarginChanges(normalizedMessage)
    if (marginChanges) {
        const result = applyStyleTransformation(currentHtml, marginChanges.targets, marginChanges.value, marginChanges.description, marginChanges.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    const paddingChanges = detectPaddingChanges(normalizedMessage)
    if (paddingChanges) {
        const result = applyStyleTransformation(currentHtml, paddingChanges.targets, paddingChanges.value, paddingChanges.description, paddingChanges.preview)
        transformations.push(result)
        currentHtml = result.updatedHtml
    }

    if (transformations.length === 0) {
        return {
            response: 'Я не распознал конкретное действие. Попробуйте один из этих примеров:\n\n• "Сделай заголовки синими"\n• "Увеличь размер шрифта до 18px"\n• "Сделай текст жирным"\n• "Выровняй текст по центру"\n• "Увеличь межстрочный интервал до 1.6"\n• "Сделай фон абзацев серым"\n• "Добавь отступы сверху и снизу"'
        }
    }

    const finalTransformation = transformations.at(-1) ?? transformations[0]

    const combinedPreview = transformations
        .map(item => `• ${item.preview}`)
        .join('\n')

    const combinedDescription = transformations
        .map(item => item.description)
        .join(' и ')

    const combinedResponse = `Готово! ${combinedDescription}.`

    const combinedChanges = transformations.flatMap(item => item.changes)

    return {
        response: combinedResponse,
        suggestion: {
            description: combinedDescription,
            preview: combinedPreview,
            patch: {
                type: 'html_overwrite',
                documentId: document.id,
                updatedHtml: finalTransformation.updatedHtml,
                changes: combinedChanges
            }
        }
    }
}

function detectHeadingColorChange(message: string) {
    if (!message.includes('заголов')) {
        return null
    }

    if (message.includes('син')) {
        return {
            value: { color: '#2563eb !important' },
            description: 'Сделаем заголовки синими',
            preview: 'Заголовки H1-H4 будут окрашены в синий оттенок (#2563eb)'
        }
    }

    const colorMatch = message.match(/(#[0-9a-f]{3,6}|rgb\([^\)]+\)|[a-zа-я]+)\s*(?:для|у\s+)?заголовк/)
    if (colorMatch) {
        const color = colorMatch[1]
        return {
            value: { color: `${color} !important` },
            description: `Изменим цвет заголовков на ${color}`,
            preview: `Заголовки H1-H4 будут окрашены в ${color}`
        }
    }

    return null
}

function detectParagraphFontSizeChange(message: string) {
    if (!(message.includes('шрифт') || message.includes('текст'))) {
        return null
    }

    if (!(message.includes('увелич') || message.includes('сделай') || message.includes('увеличь') || message.includes('больше'))) {
        return null
    }

    const sizeMatch = message.match(/(\d{1,2}(?:[\.,]\d{1,2})?)\s*(пт|pt|px|пикс|пикселей|кегль)?/)
    const numericValue = sizeMatch ? parseFloat(sizeMatch[1].replace(',', '.')) : 16
    const unitRaw = sizeMatch?.[2]?.toLowerCase()
    const unit = unitRaw && ['пт', 'pt'].includes(unitRaw) ? 'pt' : 'px'
    const withUnit = `${numericValue}${unit}`

    return {
        value: { 'font-size': `${withUnit} !important` },
        description: `Увеличим размер основного текста до ${withUnit}`,
        preview: `Абзацы будут отображаться с размером шрифта ${withUnit}`
    }
}

function detectLineHeightChange(message: string) {
    if (!(message.includes('межстроч') || message.includes('между строк'))) {
        return null
    }

    const lineHeightMatch = message.match(/(\d(?:[\.,]\d)?)\s*(?:межстроч|между строк|линии|line)/)
    const numericValue = lineHeightMatch ? parseFloat(lineHeightMatch[1].replace(',', '.')) : 1.5
    const value = numericValue < 1 ? 1.4 : numericValue

    return {
        value: { 'line-height': `${value} !important` },
        description: `Установим межстрочный интервал ${value}`,
        preview: `Абзацы получат межстрочный интервал ${value}`
    }
}

function detectCenterAlignment(message: string) {
    if (!(message.includes('центр') || message.includes('по центру'))) {
        return null
    }

    if (!(message.includes('выров') || message.includes('сделай') || message.includes('размести'))) {
        return null
    }

    return {
        targets: ['p', 'img'],
        value: { 'text-align': 'center !important', margin: '0 auto !important' },
        description: 'Выровняем текст и изображения по центру',
        preview: 'Текст и изображения будут расположены по центру страницы'
    }
}

function applyStyleTransformation(
    html: string,
    tags: string[],
    style: Record<string, string>,
    description: string,
    preview: string
): TransformationResult {
    let updatedHtml = html
    const changeEntries: Array<{ selector: string; style: Record<string, string>; summary: string }> = []

    for (const tag of tags) {
        updatedHtml = applyStyleToTag(updatedHtml, tag, style)
        changeEntries.push({ selector: tag, style, summary: description })
    }

    const response = `${description}.`

    return {
        updatedHtml,
        response,
        description,
        preview,
        changes: changeEntries
    }
}

function applyStyleToTag(html: string, tag: string, style: Record<string, string>) {
    const regex = new RegExp(`<${tag}([^>]*)>`, 'gi')
    return html.replace(regex, (match, attrs) => {
        const styleMatch = attrs.match(/style\s*=\s*"([^"]*)"/i)
        const parsedExisting = styleMatch ? parseStyleString(styleMatch[1]) : {}

        const merged = { ...parsedExisting, ...style }
        const styleString = buildStyleString(merged)

        if (styleMatch) {
            return match.replace(styleMatch[0], ` style="${styleString}"`)
        }

        return match.replace(`<${tag}`, `<${tag} style="${styleString}"`)
    })
}

function parseStyleString(style: string) {
    return style
        .split(';')
        .map(part => part.trim())
        .filter(Boolean)
        .reduce<Record<string, string>>((acc, item) => {
            const [prop, ...rest] = item.split(':')
            if (!prop || rest.length === 0) {
                return acc
            }
            acc[prop.trim()] = rest.join(':').trim()
            return acc
        }, {})
}

function buildStyleString(style: Record<string, string>) {
    const entries = Object.entries(style).map(([key, value]) => `${key}: ${value}`)
    if (entries.length === 0) {
        return ''
    }
    const joined = entries.join('; ')
    return joined.endsWith(';') ? joined : `${joined};`
}

// Новые функции детекции
function detectBoldText(message: string) {
    if (!(message.includes('жирн') || message.includes('bold') || message.includes('выдели'))) {
        return null
    }

    return {
        targets: ['p', 'span', 'div'],
        value: { 'font-weight': 'bold !important' },
        description: 'Сделаем текст жирным',
        preview: 'Текст будет отображаться жирным шрифтом'
    }
}

function detectItalicText(message: string) {
    if (!(message.includes('курсив') || message.includes('italic') || message.includes('наклонн'))) {
        return null
    }

    return {
        targets: ['p', 'span', 'div'],
        value: { 'font-style': 'italic !important' },
        description: 'Сделаем текст курсивом',
        preview: 'Текст будет отображаться курсивом'
    }
}

function detectUnderlineText(message: string) {
    if (!(message.includes('подчерк') || message.includes('underline') || message.includes('линией'))) {
        return null
    }

    return {
        targets: ['p', 'span', 'div'],
        value: { 'text-decoration': 'underline !important' },
        description: 'Подчеркнем текст',
        preview: 'Текст будет подчеркнут'
    }
}

function detectTextColorChange(message: string) {
    if (!(message.includes('цвет') || message.includes('color') || message.includes('окрась'))) {
        return null
    }

    // Детекция конкретных цветов
    if (message.includes('красн')) {
        return {
            targets: ['p', 'span', 'div'],
            value: { color: '#dc2626 !important' },
            description: 'Сделаем текст красным',
            preview: 'Текст будет окрашен в красный цвет'
        }
    }

    if (message.includes('зелен')) {
        return {
            targets: ['p', 'span', 'div'],
            value: { color: '#16a34a !important' },
            description: 'Сделаем текст зеленым',
            preview: 'Текст будет окрашен в зеленый цвет'
        }
    }

    if (message.includes('син')) {
        return {
            targets: ['p', 'span', 'div'],
            value: { color: '#2563eb !important' },
            description: 'Сделаем текст синим',
            preview: 'Текст будет окрашен в синий цвет'
        }
    }

    // Попытка найти hex цвет
    const colorMatch = message.match(/(#[0-9a-f]{3,6})/)
    if (colorMatch) {
        const color = colorMatch[1]
        return {
            targets: ['p', 'span', 'div'],
            value: { color: `${color} !important` },
            description: `Изменим цвет текста на ${color}`,
            preview: `Текст будет окрашен в ${color}`
        }
    }

    return null
}

function detectBackgroundColorChange(message: string) {
    if (!(message.includes('фон') || message.includes('background') || message.includes('заливк'))) {
        return null
    }

    if (message.includes('сер')) {
        return {
            targets: ['p', 'div'],
            value: { 'background-color': '#f3f4f6 !important', padding: '8px !important' },
            description: 'Сделаем фон серым',
            preview: 'Абзацы получат серый фон'
        }
    }

    if (message.includes('желт')) {
        return {
            targets: ['p', 'div'],
            value: { 'background-color': '#fef3c7 !important', padding: '8px !important' },
            description: 'Сделаем фон желтым',
            preview: 'Абзацы получат желтый фон'
        }
    }

    if (message.includes('голуб')) {
        return {
            targets: ['p', 'div'],
            value: { 'background-color': '#dbeafe !important', padding: '8px !important' },
            description: 'Сделаем фон голубым',
            preview: 'Абзацы получат голубой фон'
        }
    }

    return null
}

function detectMarginChanges(message: string) {
    if (!(message.includes('отступ') || message.includes('margin') || message.includes('промежуток'))) {
        return null
    }

    if (message.includes('сверху') || message.includes('снизу')) {
        const marginValue = message.includes('больш') ? '20px' : '10px'
        return {
            targets: ['p', 'div'],
            value: {
                'margin-top': `${marginValue} !important`,
                'margin-bottom': `${marginValue} !important`
            },
            description: `Добавим отступы сверху и снизу ${marginValue}`,
            preview: `Абзацы получат отступы ${marginValue} сверху и снизу`
        }
    }

    if (message.includes('слева') || message.includes('справа')) {
        const marginValue = message.includes('больш') ? '20px' : '10px'
        return {
            targets: ['p', 'div'],
            value: {
                'margin-left': `${marginValue} !important`,
                'margin-right': `${marginValue} !important`
            },
            description: `Добавим отступы слева и справа ${marginValue}`,
            preview: `Абзацы получат отступы ${marginValue} слева и справа`
        }
    }

    return null
}

function detectPaddingChanges(message: string) {
    if (!(message.includes('внутренн') || message.includes('padding') || message.includes('внутри'))) {
        return null
    }

    const paddingValue = message.includes('больш') ? '15px' : '8px'
    return {
        targets: ['p', 'div'],
        value: { padding: `${paddingValue} !important` },
        description: `Добавим внутренние отступы ${paddingValue}`,
        preview: `Элементы получат внутренние отступы ${paddingValue}`
    }
}
