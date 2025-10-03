import { GoogleGenerativeAI, GoogleGenerativeAIFetchError } from '@google/generative-ai'
import { processDocumentAi } from './document-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')

const DEFAULT_MODEL_PRIORITY = ['gemini-2.5-flash', 'gemini-1.5-flash'] as const

const MODEL_ALIAS_MAP: Record<string, string> = {
    'gemini-pro': 'gemini-2.5-flash',
    'gemini-pro-latest': 'gemini-2.5-flash',
    'gemini-pro-vision': 'gemini-2.5-flash',
    'gemini-pro-vision-latest': 'gemini-2.5-flash',
    'gemini-1.0-pro': 'gemini-2.5-flash',
    'gemini-1.0-pro-latest': 'gemini-2.5-flash'
}

const deprecatedModelWarnings = new Set<string>()
const invalidModelCache = new Set<string>()
const invalidModelWarnings = new Set<string>()

function normalizeModelName(rawModel: string): string | null {
    const trimmed = rawModel.trim()
    if (!trimmed) {
        return null
    }

    const withoutPrefix = trimmed.replace(/^models\//i, '')
    const canonical = withoutPrefix.toLowerCase()

    const aliasTarget = MODEL_ALIAS_MAP[canonical]
    if (aliasTarget) {
        if (!deprecatedModelWarnings.has(canonical)) {
            console.warn(`Модель Gemini ${canonical} устарела, используем ${aliasTarget}.`)
            deprecatedModelWarnings.add(canonical)
        }
        return aliasTarget
    }

    return canonical
}

function resolveModelPriority(candidateOrder: readonly string[]): readonly string[] {
    const resolved: string[] = []
    const seen = new Set<string>()

    for (const candidate of candidateOrder) {
        const normalized = typeof candidate === 'string' ? normalizeModelName(candidate) : null
        if (!normalized || seen.has(normalized)) {
            continue
        }

        resolved.push(normalized)
        seen.add(normalized)
    }

    if (resolved.length === 0) {
        if (candidateOrder === DEFAULT_MODEL_PRIORITY) {
            return [...DEFAULT_MODEL_PRIORITY]
        }
        return resolveModelPriority(DEFAULT_MODEL_PRIORITY)
    }

    return resolved
}

const ENV_MODEL_PRIORITY = process.env.GEMINI_MODEL_PRIORITY
    ?.split(',')
    .map(model => model.trim())
    .filter(Boolean)

const MODEL_PRIORITY = Object.freeze(
    resolveModelPriority(
        ENV_MODEL_PRIORITY && ENV_MODEL_PRIORITY.length > 0
            ? ENV_MODEL_PRIORITY
            : DEFAULT_MODEL_PRIORITY
    )
) as readonly string[]
const JSON_MIME_TYPE = 'application/json'

function isModelNotFoundError(error: unknown): boolean {
    if (error instanceof GoogleGenerativeAIFetchError) {
        return error.status === 404
    }

    if (error instanceof Error) {
        return /not\s+found/i.test(error.message) || /404/.test(error.message)
    }

    return false
}

type DocumentInfo = { id: string; title: string; html: string; type: string }

type GeminiPatchChange = {
    selector: string
    style: Record<string, string>
    summary: string
}

type GeminiPatch = {
    type: 'html_overwrite'
    documentId: string
    updatedHtml: string
    changes: GeminiPatchChange[]
}

async function generateModelResponse(prompt: string, modelOrder = MODEL_PRIORITY): Promise<string> {
    let lastError: unknown
    let encounteredNotFoundError = false

    const modelCandidates = modelOrder === MODEL_PRIORITY
        ? modelOrder
        : resolveModelPriority(modelOrder)

    for (const modelName of modelCandidates) {
        if (invalidModelCache.has(modelName)) {
            if (!invalidModelWarnings.has(modelName)) {
                console.warn(`Пропускаем модель Gemini ${modelName} — ранее помечена как недоступная.`)
                invalidModelWarnings.add(modelName)
            }
            continue
        }

        try {
            console.log(`Пробуем вызвать модель Gemini: ${modelName}`)
            const model = genAI.getGenerativeModel({
                model: modelName,
                generationConfig: { responseMimeType: JSON_MIME_TYPE }
            })

            const result = await model.generateContent(prompt)
            const responseText = result.response.text()

            if (!responseText || !responseText.trim()) {
                throw new Error('Пустой ответ от модели')
            }

            return responseText.trim()
        } catch (error) {
            console.error(`Ошибка при вызове модели ${modelName}:`, error)

            if (isModelNotFoundError(error)) {
                encounteredNotFoundError = true

                if (!invalidModelCache.has(modelName)) {
                    console.warn(`Модель Gemini ${modelName} недоступна (404). Убираем из очереди.`)
                    invalidModelCache.add(modelName)
                }
                continue
            }

            lastError = error
        }
    }

    if (lastError instanceof Error) {
        throw lastError
    }

    if (encounteredNotFoundError) {
        throw new Error('Ни одна из указанных моделей Gemini не поддерживает generateContent. Обновите список моделей и используйте gemini-2.5-flash.')
    }

    throw new Error('Не удалось получить ответ от моделей Gemini')
}

function tryLocalFallback(message: string, document: DocumentInfo): GeminiResponse | null {
    try {
        const localResult = processDocumentAi({
            document: {
                id: document.id,
                title: document.title,
                html: document.html,
                type: document.type as any
            },
            message
        })

        if (localResult) {
            return localResult
        }
    } catch (fallbackError) {
        console.error('Ошибка локального fallback обработчика:', fallbackError)
    }

    return null
}

function sanitizeJsonPayload(raw: string): string {
    return raw
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .trim()
}

function escapeControlCharactersInStrings(json: string): string {
    let result = ''
    let inString = false
    let isEscaped = false

    for (let i = 0; i < json.length; i += 1) {
        const char = json[i]

        if (!inString) {
            if (char === '"') {
                inString = true
            }
            result += char
            continue
        }

        if (isEscaped) {
            result += char
            isEscaped = false
            continue
        }

        if (char === '\\') {
            isEscaped = true
            result += char
            continue
        }

        if (char === '"') {
            inString = false
            result += char
            continue
        }

        if (char === '\n') {
            result += '\\n'
            continue
        }

        if (char === '\t') {
            result += '\\t'
            continue
        }

        if (char === '\f') {
            result += '\\f'
            continue
        }

        if (char === '\b') {
            result += '\\b'
            continue
        }

        const code = char.charCodeAt(0)
        if (code <= 0x1f) {
            result += `\\u${code.toString(16).padStart(4, '0')}`
            continue
        }

        result += char
    }

    return result
}

function attemptJsonRepairs(raw: string): string[] {
    const attempts: string[] = [raw]

    // Remove trailing commas before closing braces/brackets
    attempts.push(raw.replace(/,(\s*[}\]])/g, '$1'))

    return attempts
}

type ParseContext = {
    documentId?: string
}

function extractSuggestionCandidate(parsed: Record<string, unknown>): unknown {
    const potentialKeys = ['suggestion', 'Suggestion', 'proposal', 'result'] as const

    for (const key of potentialKeys) {
        const candidate = parsed[key]
        if (candidate) {
            if (typeof candidate === 'object' && candidate !== null && 'suggestion' in (candidate as Record<string, unknown>)) {
                const nested = (candidate as Record<string, unknown>).suggestion
                if (nested) {
                    return nested
                }
            }
            return candidate
        }
    }

    return undefined
}

function normalizeChanges(changes: unknown): GeminiPatchChange[] {
    if (!Array.isArray(changes)) {
        return []
    }

    return changes
        .map(change => {
            if (!change || typeof change !== 'object') {
                return null
            }

            const candidate = change as Record<string, unknown>
            const selector = typeof candidate.selector === 'string' ? candidate.selector : undefined
            const summary = typeof candidate.summary === 'string' ? candidate.summary : undefined
            const styleEntries = candidate.style && typeof candidate.style === 'object'
                ? Object.entries(candidate.style as Record<string, unknown>)
                : []

            if (!selector) {
                return null
            }

            const style: Record<string, string> = {}
            for (const [key, value] of styleEntries) {
                if (typeof value === 'string') {
                    style[key] = value
                }
            }

            return {
                selector,
                style,
                summary: summary || `Обновление элементов по селектору ${selector}`
            }
        })
        .filter((change): change is GeminiPatchChange => change !== null)
}

function normalizeSuggestion(
    suggestion: unknown,
    context?: ParseContext
): GeminiResponse['suggestion'] | undefined {
    if (!suggestion || typeof suggestion !== 'object') {
        return undefined
    }

    const suggestionObject = suggestion as Record<string, unknown>
    const patchCandidate = suggestionObject.patch

    if (!patchCandidate || typeof patchCandidate !== 'object') {
        return undefined
    }

    const patchObject = patchCandidate as Record<string, unknown>
    const updatedHtmlRaw = patchObject.updatedHtml ?? patchObject.html ?? patchObject.content

    if (typeof updatedHtmlRaw !== 'string' || !updatedHtmlRaw.trim()) {
        console.warn('Получен патч без корректного поля updatedHtml, игнорируем предложение.')
        return undefined
    }

    const description = typeof suggestionObject.description === 'string'
        ? suggestionObject.description
        : 'Изменения подготовлены'

    const preview = typeof suggestionObject.preview === 'string'
        ? suggestionObject.preview
        : 'Предпросмотр изменений недоступен'

    let documentId = typeof patchObject.documentId === 'string' && patchObject.documentId.trim().length > 0
        ? patchObject.documentId
        : context?.documentId

    if (!documentId) {
        console.warn('В предложении отсутствует documentId, используем заглушку.')
        documentId = 'unknown-document'
    }

    const changes = normalizeChanges(patchObject.changes)

    return {
        description,
        preview,
        patch: {
            type: 'html_overwrite',
            documentId,
            updatedHtml: updatedHtmlRaw,
            changes
        }
    }
}

function parseGeminiJson(rawText: string, context?: ParseContext): GeminiResponse {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
        console.warn('JSON не найден в ответе Gemini, возвращаем текст ответа')
        return {
            response: rawText
        }
    }

    const sanitized = sanitizeJsonPayload(jsonMatch[0])
    const escapedSanitized = escapeControlCharactersInStrings(sanitized)
    const attempts = attemptJsonRepairs(escapedSanitized)

    for (const candidate of attempts) {
        try {
            const parsed = JSON.parse(candidate) as Record<string, unknown>
            const responseText = typeof parsed.response === 'string'
                ? parsed.response
                : 'Изменения применены'

            const rawSuggestion = extractSuggestionCandidate(parsed)
            const suggestion = normalizeSuggestion(rawSuggestion, context)

            return {
                response: responseText,
                suggestion
            }
        } catch (error) {
            console.error('Ошибка парсинга JSON, пробуем следующий вариант:', error)
        }
    }

    const responseMatch = sanitized.match(/"response"\s*:\s*"([^"]*?)"/)
    if (responseMatch) {
        console.log('Извлечено поле response из поврежденного JSON')
        return {
            response: responseMatch[1] || 'Изменения применены'
        }
    }

    console.warn('Не удалось извлечь JSON, возвращаем оригинальный текст')
    return {
        response: sanitized || 'Изменения применены'
    }
}

// Функция для обработки больших документов
async function processLargeDocument(message: string, document: DocumentInfo): Promise<GeminiResponse> {
    console.log('Обработка большого документа по частям...')

    const chunkSize = 30000
    const htmlChunks: string[] = []

    for (let offset = 0; offset < document.html.length;) {
        let end = Math.min(offset + chunkSize, document.html.length)

        if (end < document.html.length) {
            const safeBreak = document.html.lastIndexOf('>', end)
            if (safeBreak > offset + Math.floor(chunkSize * 0.3)) {
                end = safeBreak + 1
            }
        }

        htmlChunks.push(document.html.slice(offset, end))
        offset = end
    }

    console.log(`Документ разбит на ${htmlChunks.length} частей`)

    const updatedChunks: string[] = []
    const chunkResponses: string[] = []
    const aggregatedChanges: GeminiPatchChange[] = []
    let encounteredError = false
    let firstChunkError: unknown

    for (let index = 0; index < htmlChunks.length; index += 1) {
        const chunk = htmlChunks[index]
        const chunkPrompt = `Ты - ИИ помощник для редактирования HTML документов.

ЗАДАЧА: Пользователь хочет изменить документ "${document.title}".

ЗАПРОС: "${message}"

ЧАСТЬ ${index + 1} из ${htmlChunks.length} HTML документа (обработай только эту часть):
${chunk}

ТВОЯ ЦЕЛЬ: верни обработанную версию этой части HTML.

Верни ТОЛЬКО валидный JSON в одну строку:

{"response": "Краткое описание изменений", "suggestion": {"description": "Краткое описание", "preview": "Предпросмотр", "patch": {"type": "html_overwrite", "documentId": "${document.id}", "updatedHtml": "Обновленный HTML этой части", "changes": [{"selector": "CSS селектор", "style": {"свойство": "значение"}, "summary": "Описание"}]}}}

КРИТИЧЕСКИ ВАЖНО:
- Сохраняй структуру HTML, обрабатывай только переданный фрагмент.
- НЕ добавляй текст до или после фрагмента, просто трансформируй его.
- Отвечай ТОЛЬКО JSON в одну строку без переносов.
- Экранируй кавычки в HTML как \\".`

        try {
            const response = await generateModelResponse(chunkPrompt)
            console.log(`Ответ от Gemini для части ${index + 1}:`, response)

            const parsed = parseGeminiJson(response, { documentId: document.id })

            if (parsed.response) {
                chunkResponses.push(`Часть ${index + 1}: ${parsed.response}`)
            }

            const chunkSuggestion = parsed.suggestion
            const updatedChunk = chunkSuggestion?.patch?.updatedHtml
            if (typeof updatedChunk === 'string' && updatedChunk.trim().length > 0) {
                updatedChunks.push(updatedChunk)
            } else {
                console.warn(`Получен пустой результат для части ${index + 1}, используем оригинальный фрагмент.`)
                updatedChunks.push(chunk)
            }

            if (chunkSuggestion?.patch?.changes?.length) {
                aggregatedChanges.push(
                    ...chunkSuggestion.patch.changes.map(change => ({
                        ...change,
                        summary: `${change.summary} (часть ${index + 1})`
                    }))
                )
            }
        } catch (chunkError) {
            console.error(`Ошибка обработки части ${index + 1}:`, chunkError)
            encounteredError = true
            if (!firstChunkError) {
                firstChunkError = chunkError
            }

            updatedChunks.push(chunk)

            if (index + 1 < htmlChunks.length) {
                console.warn('Прерываем обработку оставшихся частей из-за ошибки Gemini, возвращаем оригинальные фрагменты.')
                for (let restIndex = index + 1; restIndex < htmlChunks.length; restIndex += 1) {
                    updatedChunks.push(htmlChunks[restIndex])
                }
            }

            break
        }
    }

    const combinedHtml = updatedChunks.join('')

    if (!combinedHtml.trim()) {
        console.warn('Комбинированный HTML пустой, возвращаем оригинальный документ.')
        const fallback = tryLocalFallback(message, document)
        if (fallback) {
            return fallback
        }

        return {
            response: 'Не удалось обработать документ. Попробуйте повторить запрос позже.'
        }
    }

    if (encounteredError && chunkResponses.length === 0) {
        console.warn('Не удалось обработать документ через Gemini, пробуем локальный fallback.')
        const fallback = tryLocalFallback(message, document)
        if (fallback) {
            return fallback
        }

        let errorResponse = 'Не удалось обработать документ через Gemini. Повторите попытку позже.'
        if (firstChunkError instanceof Error && firstChunkError.message) {
            errorResponse = `Gemini недоступен: ${firstChunkError.message}`
        }

        return {
            response: errorResponse
        }
    }

    const summary = chunkResponses.length > 0
        ? `Обработаны ${chunkResponses.length} частей. ${chunkResponses.join(' ')}`
        : encounteredError
            ? 'Документ частично обработан. Оставшиеся части возвращены без изменений из-за ошибки Gemini.'
            : 'Документ обработан по частям.'

    return {
        response: summary,
        suggestion: {
            description: 'Обновление большого документа',
            preview: `Документ разделен на ${htmlChunks.length} частей и обработан полностью`,
            patch: {
                type: 'html_overwrite',
                documentId: document.id,
                updatedHtml: combinedHtml,
                changes: aggregatedChanges.length > 0
                    ? aggregatedChanges
                    : [
                        {
                            selector: 'body',
                            style: {},
                            summary: 'Обновление содержимого документа'
                        }
                    ]
            }
        }
    }
}

export interface GeminiResponse {
    response: string
    suggestion?: {
        description: string
        preview: string
        patch: GeminiPatch
    }
}

export async function processWithGemini(message: string, document: DocumentInfo): Promise<GeminiResponse> {
    try {
        if (!process.env.GEMINI_API_KEY) {
            throw new Error('GEMINI_API_KEY не настроен')
        }

        // Проверяем размер документа
        console.log('Размер HTML документа:', document.html.length, 'символов')
        const isLargeDocument = document.html.length > 50000

        if (isLargeDocument) {
            console.warn('ВНИМАНИЕ: Большой документ, используем стратегию обработки по частям')
            return await processLargeDocument(message, document)
        }

        // Для документов среднего размера используем полный промпт
        const prompt = `Ты - ИИ помощник для редактирования HTML документов.

ЗАДАЧА: Пользователь хочет изменить документ "${document.title}".

ЗАПРОС: "${message}"

HTML ДОКУМЕНТ:
${document.html}

ВАЖНО: Обработай ВЕСЬ документ, не урезай его!

Верни ТОЛЬКО валидный JSON в одну строку без переносов:

{"response": "Описание изменений", "suggestion": {"description": "Краткое описание", "preview": "Предпросмотр", "patch": {"type": "html_overwrite", "documentId": "${document.id}", "updatedHtml": "ПОЛНЫЙ обновленный HTML код", "changes": [{"selector": "CSS селектор", "style": {"свойство": "значение"}, "summary": "Описание"}]}}}

КРИТИЧЕСКИ ВАЖНО:
- Обработай ВЕСЬ документ целиком
- Верни ПОЛНЫЙ обновленный HTML в поле updatedHtml
- Отвечай ТОЛЬКО JSON в одну строку
- НЕ используй переносы строк в JSON
- Экранируй кавычки в HTML как \\"
- Если не можешь выполнить - верни {"response": "объяснение"}
- Сохраняй структуру HTML документа`
        const rawResponse = await generateModelResponse(prompt)
        console.log('Ответ от Gemini:', rawResponse)

        const parsedResponse = parseGeminiJson(rawResponse, { documentId: document.id })

        // Проверяем, что Gemini обработал весь документ
        if (parsedResponse.suggestion?.patch?.updatedHtml) {
            const originalLength = document.html.length
            const updatedLength = parsedResponse.suggestion.patch.updatedHtml.length
            console.log('Размеры: оригинал =', originalLength, ', обновленный =', updatedLength)

            if (updatedLength < originalLength * 0.5) {
                console.warn('ВНИМАНИЕ: Обновленный HTML значительно короче оригинала. Возможно, документ был урезан.')
            }
        }

        return {
            response: parsedResponse.response || 'Изменения применены',
            suggestion: parsedResponse.suggestion
        }

    } catch (error) {
        console.error('Ошибка при обращении к Gemini API:', error)

        const fallback = tryLocalFallback(message, document)
        if (fallback) {
            return fallback
        }

        let errorMessage = 'Извините, произошла ошибка при обработке вашего запроса.'

        if (error instanceof Error) {
            if (error.message.includes('GEMINI_API_KEY не настроен')) {
                errorMessage = 'ИИ чат не настроен. Пожалуйста, настройте GEMINI_API_KEY в переменных окружения.'
            } else if (error.message.includes('API key')) {
                errorMessage = 'Неверный API ключ Gemini. Проверьте настройки.'
            } else if (error.message.includes('quota')) {
                errorMessage = 'Превышена квота API. Попробуйте позже.'
            } else if (error.message.includes('404') || error.message.includes('Not Found')) {
                errorMessage = 'Модель Gemini недоступна. Проверьте настройки API.'
            } else if (error.message.includes('models')) {
                errorMessage = 'Проблема с доступом к моделям Gemini. Проверьте API ключ.'
            } else {
                errorMessage = `Ошибка: ${error.message}`
            }
        }

        return {
            response: errorMessage
        }
    }
}
