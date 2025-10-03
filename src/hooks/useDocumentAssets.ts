import { useState, useEffect, useCallback } from 'react'

interface DocumentAsset {
    id: string
    type: 'image' | 'font'
    url: string
    name: string
    size?: number
    mimeType?: string
}

interface UseDocumentAssetsOptions {
    assets?: string[]
    fonts?: string[]
    baseUrl?: string
}

interface UseDocumentAssetsReturn {
    assets: DocumentAsset[]
    fonts: DocumentAsset[]
    isLoading: boolean
    error: string | null
    loadAsset: (assetId: string) => Promise<string>
    preloadAssets: () => Promise<void>
}

export function useDocumentAssets({
    assets = [],
    fonts = [],
    baseUrl = ''
}: UseDocumentAssetsOptions = {}): UseDocumentAssetsReturn {
    const [documentAssets, setDocumentAssets] = useState<DocumentAsset[]>([])
    const [documentFonts, setDocumentFonts] = useState<DocumentAsset[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Обработка изображений
    const processImages = useCallback(async (imageUrls: string[]): Promise<DocumentAsset[]> => {
        const processedImages: DocumentAsset[] = []

        for (const url of imageUrls) {
            try {
                const response = await fetch(url)
                if (!response.ok) continue

                const blob = await response.blob()
                const objectUrl = URL.createObjectURL(blob)

                processedImages.push({
                    id: `image-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'image',
                    url: objectUrl,
                    name: url.split('/').pop() || 'image',
                    size: blob.size,
                    mimeType: blob.type
                })
            } catch (err) {
                console.warn('Ошибка обработки изображения:', url, err)
            }
        }

        return processedImages
    }, [])

    // Обработка шрифтов
    const processFonts = useCallback(async (fontUrls: string[]): Promise<DocumentAsset[]> => {
        const processedFonts: DocumentAsset[] = []

        for (const url of fontUrls) {
            try {
                const response = await fetch(url)
                if (!response.ok) continue

                const blob = await response.blob()
                const objectUrl = URL.createObjectURL(blob)

                // Извлекаем имя шрифта из URL или заголовков
                const fontName = extractFontName(url, response.headers)

                processedFonts.push({
                    id: `font-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    type: 'font',
                    url: objectUrl,
                    name: fontName,
                    size: blob.size,
                    mimeType: blob.type
                })
            } catch (err) {
                console.warn('Ошибка обработки шрифта:', url, err)
            }
        }

        return processedFonts
    }, [])

    // Извлечение имени шрифта
    const extractFontName = (url: string, headers: Headers): string => {
        // Пробуем извлечь из заголовков
        const contentDisposition = headers.get('content-disposition')
        if (contentDisposition) {
            const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/)
            if (filenameMatch) {
                return filenameMatch[1].replace(/['"]/g, '')
            }
        }

        // Извлекаем из URL
        const urlParts = url.split('/')
        const filename = urlParts[urlParts.length - 1]

        if (filename && filename.includes('.')) {
            return filename.split('.')[0]
        }

        return `font-${Date.now()}`
    }

    // Загрузка ресурса по ID
    const loadAsset = useCallback(async (assetId: string): Promise<string> => {
        const asset = [...documentAssets, ...documentFonts].find(a => a.id === assetId)
        if (!asset) {
            throw new Error(`Ресурс с ID ${assetId} не найден`)
        }

        // Если ресурс уже загружен, возвращаем его URL
        if (asset.url) {
            return asset.url
        }

        // Загружаем ресурс
        try {
            const response = await fetch(asset.url)
            if (!response.ok) {
                throw new Error(`Ошибка загрузки ресурса: ${response.statusText}`)
            }

            const blob = await response.blob()
            const objectUrl = URL.createObjectURL(blob)

            return objectUrl
        } catch (err) {
            throw new Error(`Ошибка загрузки ресурса ${assetId}: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`)
        }
    }, [documentAssets, documentFonts])

    // Предзагрузка всех ресурсов
    const preloadAssets = useCallback(async (): Promise<void> => {
        setIsLoading(true)
        setError(null)

        try {
            const [images, fonts] = await Promise.all([
                processImages(assets),
                processFonts(fonts)
            ])

            setDocumentAssets(images)
            setDocumentFonts(fonts)
        } catch (err) {
            const errorMsg = `Ошибка предзагрузки ресурсов: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`
            setError(errorMsg)
            console.error(errorMsg, err)
        } finally {
            setIsLoading(false)
        }
    }, [assets, fonts, processImages, processFonts])

    // Автоматическая загрузка при изменении ресурсов
    useEffect(() => {
        if (assets.length > 0 || fonts.length > 0) {
            preloadAssets()
        }
    }, [assets, fonts, preloadAssets])

    // Очистка ресурсов при размонтировании
    useEffect(() => {
        return () => {
            // Освобождаем объекты URL
            [...documentAssets, ...documentFonts].forEach(asset => {
                if (asset.url.startsWith('blob:')) {
                    URL.revokeObjectURL(asset.url)
                }
            })
        }
    }, [documentAssets, documentFonts])

    return {
        assets: documentAssets,
        fonts: documentFonts,
        isLoading,
        error,
        loadAsset,
        preloadAssets
    }
}

// Дополнительные утилиты для работы с ресурсами
export const documentAssetUtils = {
    // Создание CSS для шрифтов
    createFontCSS: (fonts: DocumentAsset[]): string => {
        return fonts.map(font => `
            @font-face {
                font-family: '${font.name}';
                src: url('${font.url}');
                font-display: swap;
            }
        `).join('\n')
    },

    // Создание CSS для изображений (как фоновых)
    createImageCSS: (images: DocumentAsset[]): string => {
        return images.map(image => `
            .asset-${image.id} {
                background-image: url('${image.url}');
                background-size: contain;
                background-repeat: no-repeat;
                background-position: center;
            }
        `).join('\n')
    },

    // Встраивание изображений в HTML
    embedImages: (html: string, images: DocumentAsset[]): string => {
        let processedHtml = html

        images.forEach(image => {
            // Заменяем ссылки на изображения на встроенные
            const imageRegex = new RegExp(`src=["']([^"']*${image.name}[^"']*)["']`, 'gi')
            processedHtml = processedHtml.replace(imageRegex, `src="${image.url}"`)
        })

        return processedHtml
    },

    // Встраивание шрифтов в HTML
    embedFonts: (html: string, fonts: DocumentAsset[]): string => {
        const fontCSS = documentAssetUtils.createFontCSS(fonts)

        if (fontCSS) {
            return html.replace(
                '<head>',
                `<head>\n<style>\n${fontCSS}\n</style>`
            )
        }

        return html
    }
}
