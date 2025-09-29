// Утилиты для работы с изменениями документов и патчами

export interface DocumentPatch {
    type: 'style_update' | 'content_update' | 'formatting_update' | 'image_update'
    changes: Change[]
    description: string
    timestamp: Date
}

export interface Change {
    selector: string
    operation: 'replace' | 'add' | 'remove' | 'modify'
    style?: Record<string, string>
    content?: string
    attributes?: Record<string, string>
}

export interface DiffResult {
    hasChanges: boolean
    added: string[]
    removed: string[]
    modified: string[]
    preview: string
}

export function applyPatch(content: string, patch: DocumentPatch): string {
    // В реальном приложении здесь была бы сложная логика применения патчей
    // Для демо возвращаем модифицированный контент

    let modifiedContent = content

    patch.changes.forEach(change => {
        switch (change.operation) {
            case 'replace':
                if (change.style) {
                    modifiedContent = applyStyleChanges(modifiedContent, change.selector, change.style)
                }
                break
            case 'add':
                if (change.content) {
                    modifiedContent = addContent(modifiedContent, change.selector, change.content)
                }
                break
            case 'remove':
                modifiedContent = removeContent(modifiedContent, change.selector)
                break
            case 'modify':
                if (change.style) {
                    modifiedContent = modifyStyles(modifiedContent, change.selector, change.style)
                }
                break
        }
    })

    return modifiedContent
}

function applyStyleChanges(content: string, selector: string, styles: Record<string, string>): string {
    // Простая реализация для демо
    // В реальном приложении здесь был бы парсер DOM/HTML

    const styleString = Object.entries(styles)
        .map(([key, value]) => `${camelToKebab(key)}: ${value}`)
        .join('; ')

    // Ищем элементы по селектору и добавляем стили
    const regex = new RegExp(`<(${selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})([^>]*)>`, 'gi')

    return content.replace(regex, (match, tag, attributes) => {
        const existingStyle = attributes.match(/style="([^"]*)"/)
        const existingStyles = existingStyle ? existingStyle[1] : ''
        const newStyle = existingStyles ? `${existingStyles}; ${styleString}` : styleString

        if (existingStyle) {
            return match.replace(/style="[^"]*"/, `style="${newStyle}"`)
        } else {
            return `<${tag}${attributes} style="${styleString}">`
        }
    })
}

function addContent(content: string, selector: string, newContent: string): string {
    // Добавляем контент после найденного элемента
    const regex = new RegExp(`(</${selector}>)`, 'gi')
    return content.replace(regex, `${newContent}$1`)
}

function removeContent(content: string, selector: string): string {
    // Удаляем элементы по селектору
    const regex = new RegExp(`<${selector}[^>]*>.*?</${selector}>`, 'gis')
    return content.replace(regex, '')
}

function modifyStyles(content: string, selector: string, styles: Record<string, string>): string {
    // Модифицируем существующие стили
    return applyStyleChanges(content, selector, styles)
}

function camelToKebab(str: string): string {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
}

export function generateDiff(oldContent: string, newContent: string): DiffResult {
    // Простая реализация diff для демо
    // В реальном приложении здесь был бы более сложный алгоритм

    const hasChanges = oldContent !== newContent

    if (!hasChanges) {
        return {
            hasChanges: false,
            added: [],
            removed: [],
            modified: [],
            preview: 'Изменений нет'
        }
    }

    // Для демо возвращаем упрощенный результат
    return {
        hasChanges: true,
        added: ['Новые стили применены'],
        removed: [],
        modified: ['Существующие элементы обновлены'],
        preview: 'Документ будет обновлен с новыми стилями и форматированием'
    }
}

export function createPatch(description: string, changes: Change[]): DocumentPatch {
    return {
        type: 'style_update',
        changes,
        description,
        timestamp: new Date()
    }
}

export function validatePatch(patch: DocumentPatch): boolean {
    if (!patch.changes || patch.changes.length === 0) {
        return false
    }

    return patch.changes.every(change =>
        change.selector &&
        change.operation &&
        ['replace', 'add', 'remove', 'modify'].includes(change.operation)
    )
}
