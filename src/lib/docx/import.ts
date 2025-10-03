import { convertDocxToHtmlWithStyles } from '../docx'
import * as mammoth from 'mammoth'

export type ImportMode = 'libreoffice' | 'jsDocxToHtml' | 'legacy'

export interface ImportResult {
    html: string
    css?: string
    method: string
    fidelity: number
    warnings: any[]
}

export interface ImportOptions {
    mode?: ImportMode
    fallbackOnError?: boolean
    minFidelityScore?: number
}

/**
 * Главный адаптер для импорта DOCX с фича-флагом и fallback
 */
export async function importDocx(
    file: File,
    options: ImportOptions = {}
): Promise<ImportResult> {
    const {
        mode = getDefaultImportMode(),
        fallbackOnError = true,
        minFidelityScore = 60
    } = options

    console.log(`Импорт DOCX в режиме: ${mode}`)

    try {
        let result: ImportResult

        switch (mode) {
            case 'libreoffice':
                result = await importWithLibreOffice(file)
                break
            case 'jsDocxToHtml':
                result = await importWithJsDocxToHtml(file)
                break
            case 'legacy':
                result = await importWithLegacy(file)
                break
            default:
                throw new Error(`Неподдерживаемый режим импорта: ${mode}`)
        }

        // Проверяем качество конвертации
        if (result.fidelity < minFidelityScore && fallbackOnError && mode !== 'legacy') {
            console.warn(`Низкое качество конвертации (${result.fidelity}), переключаемся на fallback`)
            return await importWithJsDocxToHtml(file)
        }

        return result

    } catch (error) {
        console.error('Ошибка импорта:', error)

        if (fallbackOnError && mode !== 'legacy') {
            console.log('Переключаемся на fallback режим')
            return await importWithJsDocxToHtml(file)
        }

        throw error
    }
}

/**
 * Импорт через LibreOffice API
 */
async function importWithLibreOffice(file: File): Promise<ImportResult> {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/convert', {
        method: 'POST',
        body: formData,
    })

    if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Ошибка LibreOffice конвертации')
    }

    const result = await response.json()

    return {
        html: result.html,
        css: result.css,
        method: result.method,
        fidelity: result.fidelity,
        warnings: result.warnings || []
    }
}

/**
 * Импорт через jsDocxToHtml (клиентский)
 */
async function importWithJsDocxToHtml(file: File): Promise<ImportResult> {
    const arrayBuffer = await file.arrayBuffer()

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

    const fidelity = scoreFidelity(result.html)

    return {
        html: result.html,
        method: 'jsDocxToHtml',
        fidelity,
        warnings: result.warnings || []
    }
}

/**
 * Legacy импорт (текущее поведение)
 */
async function importWithLegacy(file: File): Promise<ImportResult> {
    const arrayBuffer = await file.arrayBuffer()

    // Простая конвертация через mammoth
    const result = await mammoth.convertToHtml({ arrayBuffer })

    const fidelity = scoreFidelity(result.value)

    return {
        html: result.value,
        method: 'legacy',
        fidelity,
        warnings: result.messages || []
    }
}

/**
 * Оценка качества конвертации
 */
export function scoreFidelity(html: string): number {
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
    const hasPtUnits = /font-size\s*:\s*[0-9.]+pt/i.test(html)
    const hasMsoClasses = /class\s*=\s*["'][^"']*Mso/i.test(html)

    // Подсчитываем очки
    if (hasTextIndent) score += 15
    if (hasMarginLeft) score += 15
    if (hasMarginRight) score += 10
    if (hasFontSize) score += 20
    if (hasLineHeight) score += 10
    if (hasInlineStyles) score += 15
    if (hasPtUnits) score += 10  // Бонус за сохранение pt единиц
    if (hasMsoClasses) score += 5   // Бонус за Word классы

    console.log(`Оценка качества конвертации: ${score}/${maxScore}`)

    return Math.min(score, maxScore)
}

/**
 * Получение режима импорта по умолчанию
 */
function getDefaultImportMode(): ImportMode {
    const mode = process.env.NEXT_PUBLIC_DOCX_IMPORT_MODE as ImportMode
    return mode || 'libreoffice'
}

/**
 * Проверка доступности LibreOffice
 */
export async function checkLibreOfficeAvailability(): Promise<boolean> {
    try {
        const response = await fetch('/api/convert', {
            method: 'POST',
            body: new FormData() // Пустой запрос для проверки
        })
        return response.status !== 500
    } catch {
        return false
    }
}

/**
 * Получение информации о режимах импорта
 */
export function getImportModeInfo(): Record<ImportMode, { name: string; description: string; fidelity: number }> {
    return {
        libreoffice: {
            name: 'LibreOffice',
            description: 'Максимальная точность через LibreOffice headless',
            fidelity: 95
        },
        jsDocxToHtml: {
            name: 'jsDocxToHtml',
            description: 'Клиентская конвертация с улучшенным парсингом',
            fidelity: 85
        },
        legacy: {
            name: 'Legacy',
            description: 'Базовая конвертация через mammoth',
            fidelity: 60
        }
    }
}
