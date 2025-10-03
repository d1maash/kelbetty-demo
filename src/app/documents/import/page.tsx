'use client'

import { useState, useRef } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, Settings, Download, Loader2, AlertCircle, CheckCircle, Font } from 'lucide-react'
import DocumentIframeViewer from '@/components/DocumentIframeViewer'
import { importDocx, ImportMode, getImportModeInfo, checkLibreOfficeAvailability } from '@/lib/docx/import'
import { postProcessDocHtml, generateQualityReport } from '@/lib/docx/postProcessDocHtml'

interface DocumentData {
    id: string
    title: string
    html: string
    css?: string
    type: string
    createdAt: string
    updatedAt: string
    metadata?: {
        fileSize?: number
        storageKey?: string
    }
}

export default function DocumentImportPage() {
    const [document, setDocument] = useState<DocumentData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [importMode, setImportMode] = useState<ImportMode>('libreoffice')
    const [fidelity, setFidelity] = useState<number>(0)
    const [qualityReport, setQualityReport] = useState<string>('')
    const [fontWarnings, setFontWarnings] = useState<string[]>([])
    const [libreOfficeAvailable, setLibreOfficeAvailable] = useState<boolean | null>(null)

    const fileInputRef = useRef<HTMLInputElement>(null)
    const importModeInfo = getImportModeInfo()

    // Проверяем доступность LibreOffice при загрузке
    useState(() => {
        checkLibreOfficeAvailability().then(setLibreOfficeAvailable)
    })

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        setIsLoading(true)
        setError(null)
        setDocument(null)
        setFidelity(0)
        setQualityReport('')

        try {
            console.log(`Импорт файла ${file.name} в режиме ${importMode}`)

            // Импортируем документ
            const result = await importDocx(file, {
                mode: importMode,
                fallbackOnError: true,
                minFidelityScore: 60
            })

            console.log('Результат импорта:', result)

            // Пост-обработка HTML
            const processedHtml = postProcessDocHtml(result.html, {
                fixLineHeight: true,
                fixHeadersFooters: true,
                fixFontFallbacks: true,
                preservePtUnits: true
            })

            // Генерируем отчет о качестве
            const report = generateQualityReport(processedHtml)
            setQualityReport(report)

            // Анализируем шрифты
            const fontAnalysis = analyzeFonts(processedHtml)
            setFontWarnings(fontAnalysis.warnings)

            // Создаем документ
            const documentData: DocumentData = {
                id: `import-${Date.now()}`,
                title: file.name.replace(/\.[^/.]+$/, ''),
                html: processedHtml,
                css: result.css,
                type: 'docx',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                metadata: {
                    fileSize: file.size,
                    storageKey: `imported/${Date.now()}-${file.name}`
                }
            }

            setDocument(documentData)
            setFidelity(result.fidelity)

            toast.success(`Документ импортирован через ${result.method} (качество: ${result.fidelity}%)`)

        } catch (err: any) {
            console.error('Ошибка при импорте:', err)
            setError(err.message || 'Неизвестная ошибка при импорте.')
            toast.error(`Ошибка импорта: ${err.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    const analyzeFonts = (html: string): { warnings: string[] } => {
        const warnings: string[] = []

        // Извлекаем все font-family из inline стилей
        const fontFamilyRegex = /font-family\s*:\s*([^;]+)/gi
        const fontFamilies = new Set<string>()

        let match
        while ((match = fontFamilyRegex.exec(html)) !== null) {
            const fontFamily = match[1].trim().replace(/['"]/g, '')
            fontFamilies.add(fontFamily)
        }

        // Проверяем доступность шрифтов
        for (const fontFamily of fontFamilies) {
            if (!fontFamily.toLowerCase().includes('calibri') &&
                !fontFamily.toLowerCase().includes('times') &&
                !fontFamily.toLowerCase().includes('arial')) {
                warnings.push(`Шрифт "${fontFamily}" может быть недоступен`)
            }
        }

        return { warnings }
    }

    const handleModeChange = (mode: ImportMode) => {
        setImportMode(mode)
        setDocument(null)
        setError(null)
        setFidelity(0)
        setQualityReport('')
    }

    const handleDownload = () => {
        if (!document) return

        const blob = new Blob([document.html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${document.title}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <header className="bg-white shadow-sm p-4 border-b border-gray-200">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold text-gray-900">Импорт DOCX с максимальной точностью</h1>

                        {/* Переключатель режимов */}
                        <div className="flex items-center space-x-2">
                            <Settings className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Режим:</span>
                            <div className="flex bg-gray-100 rounded-lg p-1">
                                {Object.entries(importModeInfo).map(([mode, info]) => (
                                    <button
                                        key={mode}
                                        onClick={() => handleModeChange(mode as ImportMode)}
                                        className={`px-3 py-1 text-sm rounded-md transition-colors ${importMode === mode
                                                ? 'bg-white text-gray-900 shadow-sm'
                                                : 'text-gray-600 hover:text-gray-900'
                                            }`}
                                        title={info.description}
                                    >
                                        {info.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4">
                        {/* Статус LibreOffice */}
                        {libreOfficeAvailable !== null && (
                            <div className={`flex items-center space-x-2 text-sm ${libreOfficeAvailable ? 'text-green-600' : 'text-red-600'
                                }`}>
                                <div className={`w-2 h-2 rounded-full ${libreOfficeAvailable ? 'bg-green-500' : 'bg-red-500'
                                    }`}></div>
                                <span>LibreOffice {libreOfficeAvailable ? 'доступен' : 'недоступен'}</span>
                            </div>
                        )}

                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".docx"
                            onChange={handleFileChange}
                            className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-semibold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100 cursor-pointer"
                            disabled={isLoading}
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-4">
                <div className="max-w-7xl mx-auto h-full bg-white rounded-lg shadow-md overflow-hidden">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full flex-col gap-4 text-gray-600">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                            <p className="text-lg">Импорт документа...</p>
                            <p className="text-sm text-gray-500">
                                Режим: {importModeInfo[importMode].name}
                            </p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center h-full flex-col gap-4 text-red-600">
                            <AlertCircle className="w-10 h-10" />
                            <p className="text-lg font-medium">Ошибка:</p>
                            <p className="text-center max-w-md">{error}</p>
                            <button
                                onClick={() => {
                                    setError(null)
                                    setDocument(null)
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Попробовать снова
                            </button>
                        </div>
                    )}

                    {document && !isLoading && !error && (
                        <div className="h-full flex flex-col">
                            {/* Информация о качестве */}
                            <div className="border-b border-gray-200 p-4 bg-gray-50">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4">
                                        <div className="flex items-center space-x-2">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                            <span className="font-medium text-gray-900">
                                                Качество: {fidelity}%
                                            </span>
                                        </div>

                                        {fontWarnings.length > 0 && (
                                            <div className="flex items-center space-x-2 text-yellow-600">
                                                <Font className="w-4 h-4" />
                                                <span className="text-sm">
                                                    {fontWarnings.length} предупреждений о шрифтах
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <button
                                        onClick={handleDownload}
                                        className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Скачать HTML
                                    </button>
                                </div>
                            </div>

                            {/* Просмотр документа */}
                            <div className="flex-1">
                                <DocumentIframeViewer
                                    document={document}
                                    isPreview={false}
                                />
                            </div>
                        </div>
                    )}

                    {!document && !isLoading && !error && (
                        <div className="flex items-center justify-center h-full flex-col gap-4 text-gray-500">
                            <FileText className="w-10 h-10" />
                            <p className="text-lg">Загрузите DOCX файл для импорта</p>
                            <div className="text-sm text-center max-w-md">
                                <p className="mb-2">Поддерживаемые режимы:</p>
                                <ul className="space-y-1 text-left">
                                    <li>• <strong>LibreOffice</strong> - максимальная точность</li>
                                    <li>• <strong>jsDocxToHtml</strong> - клиентская конвертация</li>
                                    <li>• <strong>Legacy</strong> - базовая конвертация</li>
                                </ul>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* Отчет о качестве (если есть) */}
            {qualityReport && (
                <div className="bg-gray-50 border-t border-gray-200 p-4">
                    <details className="text-sm">
                        <summary className="cursor-pointer font-medium text-gray-700">
                            Отчет о качестве конвертации
                        </summary>
                        <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap">
                            {qualityReport}
                        </pre>
                    </details>
                </div>
            )}
        </div>
    )
}
