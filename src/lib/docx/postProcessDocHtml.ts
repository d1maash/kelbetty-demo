import { JSDOM } from 'jsdom'

export interface PostProcessOptions {
    fixLineHeight?: boolean
    fixHeadersFooters?: boolean
    fixFontFallbacks?: boolean
    preservePtUnits?: boolean
}

/**
 * Пост-обработка HTML документа для точечных фиксов
 */
export function postProcessDocHtml(
    html: string,
    options: PostProcessOptions = {}
): string {
    const {
        fixLineHeight = true,
        fixHeadersFooters = true,
        fixFontFallbacks = true,
        preservePtUnits = true
    } = options

    console.log('Начинаем пост-обработку HTML документа...')

    const dom = new JSDOM(html)
    const document = dom.window.document

    let processedHtml = html

    // 1. Фиксы line-height
    if (fixLineHeight) {
        processedHtml = fixLineHeightIssues(processedHtml)
    }

    // 2. Фиксы headers/footers
    if (fixHeadersFooters) {
        processedHtml = fixHeadersFootersIssues(processedHtml)
    }

    // 3. Фиксы шрифтов
    if (fixFontFallbacks) {
        processedHtml = fixFontFallbacks(processedHtml)
    }

    // 4. Сохранение pt единиц
    if (preservePtUnits) {
        processedHtml = preservePtUnits(processedHtml)
    }

    console.log('Пост-обработка HTML завершена')
    return processedHtml
}

/**
 * Фиксы проблем с line-height
 */
function fixLineHeightIssues(html: string): string {
    console.log('Применяем фиксы line-height...')

    // Находим элементы с проблемным line-height
    const dom = new JSDOM(html)
    const document = dom.window.document

    // Ищем элементы с очень маленьким или очень большим line-height
    const elements = document.querySelectorAll('*[style*="line-height"]')

    elements.forEach(element => {
        const style = element.getAttribute('style') || ''
        const lineHeightMatch = style.match(/line-height\s*:\s*([^;]+)/i)

        if (lineHeightMatch) {
            const lineHeightValue = lineHeightMatch[1].trim()
            const numericValue = parseFloat(lineHeightValue)

            // Если line-height слишком маленький (< 1.0) или слишком большой (> 3.0)
            if (numericValue < 1.0 || numericValue > 3.0) {
                const newLineHeight = Math.max(1.0, Math.min(2.0, numericValue))
                const newStyle = style.replace(
                    /line-height\s*:\s*[^;]+/i,
                    `line-height: ${newLineHeight}`
                )
                element.setAttribute('style', newStyle)
            }
        }
    })

    return dom.serialize()
}

/**
 * Фиксы headers/footers
 */
function fixHeadersFootersIssues(html: string): string {
    console.log('Применяем фиксы headers/footers...')

    const dom = new JSDOM(html)
    const document = dom.window.document

    // Ищем элементы, которые могут быть headers/footers
    const headerElements = document.querySelectorAll('div[class*="header"], div[class*="Header"]')
    const footerElements = document.querySelectorAll('div[class*="footer"], div[class*="Footer"]')

    // Добавляем отступы для компенсации headers/footers
    const mainContent = document.querySelector('body > div:first-child, body > p:first-child')

    if (mainContent && (headerElements.length > 0 || footerElements.length > 0)) {
        const currentStyle = mainContent.getAttribute('style') || ''
        const marginTop = headerElements.length > 0 ? 'margin-top: 40px;' : ''
        const marginBottom = footerElements.length > 0 ? 'margin-bottom: 40px;' : ''

        const newStyle = currentStyle + marginTop + marginBottom
        mainContent.setAttribute('style', newStyle)
    }

    return dom.serialize()
}

/**
 * Фиксы fallback шрифтов
 */
function fixFontFallbacks(html: string): string {
    console.log('Применяем фиксы fallback шрифтов...')

    // Заменяем проблемные шрифты на безопасные fallback
    let processedHtml = html

    // Список проблемных шрифтов и их безопасных замен
    const fontReplacements = [
        { from: /font-family:\s*['"]?Calibri['"]?/gi, to: "font-family: 'Calibri', 'Arial', sans-serif" },
        { from: /font-family:\s*['"]?Times New Roman['"]?/gi, to: "font-family: 'Times New Roman', 'Times', serif" },
        { from: /font-family:\s*['"]?Arial['"]?/gi, to: "font-family: 'Arial', sans-serif" },
        { from: /font-family:\s*['"]?Helvetica['"]?/gi, to: "font-family: 'Helvetica', 'Arial', sans-serif" },
        { from: /font-family:\s*['"]?Verdana['"]?/gi, to: "font-family: 'Verdana', sans-serif" }
    ]

    fontReplacements.forEach(({ from, to }) => {
        processedHtml = processedHtml.replace(from, to)
    })

    return processedHtml
}

/**
 * Сохранение pt единиц (не конвертация в rem/em)
 */
function preservePtUnits(html: string): string {
    console.log('Сохраняем pt единицы...')

    // Убеждаемся, что pt единицы не конвертируются
    let processedHtml = html

    // Заменяем любые конвертации pt на px (если они есть)
    processedHtml = processedHtml.replace(
        /font-size:\s*([0-9.]+)px/gi,
        (match, size) => {
            const numericSize = parseFloat(size)
            // Конвертируем px обратно в pt для лучшей точности
            const ptSize = numericSize * 0.75
            return `font-size: ${ptSize}pt`
        }
    )

    return processedHtml
}

/**
 * Анализ качества HTML документа
 */
export function analyzeDocumentQuality(html: string): {
    hasInlineStyles: boolean
    hasPtUnits: boolean
    hasMsoClasses: boolean
    hasTextIndent: boolean
    hasMargins: boolean
    fontCount: number
    styleCount: number
} {
    const dom = new JSDOM(html)
    const document = dom.window.document

    const hasInlineStyles = document.querySelectorAll('*[style]').length > 0
    const hasPtUnits = /font-size\s*:\s*[0-9.]+pt/i.test(html)
    const hasMsoClasses = /class\s*=\s*["'][^"']*Mso/i.test(html)
    const hasTextIndent = /text-indent\s*:\s*[^;]+/i.test(html)
    const hasMargins = /margin-(left|right|top|bottom)\s*:\s*[^;]+/i.test(html)

    // Подсчитываем уникальные шрифты
    const fontFamilies = new Set<string>()
    const styleElements = document.querySelectorAll('*[style*="font-family"]')
    styleElements.forEach(element => {
        const style = element.getAttribute('style') || ''
        const fontMatch = style.match(/font-family\s*:\s*([^;]+)/i)
        if (fontMatch) {
            fontFamilies.add(fontMatch[1].trim())
        }
    })

    return {
        hasInlineStyles,
        hasPtUnits,
        hasMsoClasses,
        hasTextIndent,
        hasMargins,
        fontCount: fontFamilies.size,
        styleCount: document.querySelectorAll('*[style]').length
    }
}

/**
 * Создание отчета о качестве конвертации
 */
export function generateQualityReport(html: string): string {
    const analysis = analyzeDocumentQuality(html)

    const report = [
        '=== ОТЧЕТ О КАЧЕСТВЕ КОНВЕРТАЦИИ ===',
        `Inline стили: ${analysis.hasInlineStyles ? '✅' : '❌'}`,
        `PT единицы: ${analysis.hasPtUnits ? '✅' : '❌'}`,
        `Word классы: ${analysis.hasMsoClasses ? '✅' : '❌'}`,
        `Отступы текста: ${analysis.hasTextIndent ? '✅' : '❌'}`,
        `Поля: ${analysis.hasMargins ? '✅' : '❌'}`,
        `Уникальных шрифтов: ${analysis.fontCount}`,
        `Элементов со стилями: ${analysis.styleCount}`,
        '====================================='
    ].join('\n')

    console.log(report)
    return report
}
