'use client'

import { useState, useCallback } from 'react'
import { Upload, FileText, Download, Settings, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import DocumentViewer from '@/components/DocumentViewer'
import { useDocumentAssets } from '@/hooks/useDocumentAssets'

interface ConvertResult {
    html: string
    assets: string[]
    fonts: string[]
    method: 'libreoffice' | 'mammoth'
}

interface ConvertOptions {
    useLibreOffice: boolean
    fallbackToMammoth: boolean
}

export default function ImportPage() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [isConverting, setIsConverting] = useState(false)
    const [convertResult, setConvertResult] = useState<ConvertResult | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [options, setOptions] = useState<ConvertOptions>({
        useLibreOffice: true,
        fallbackToMammoth: true
    })

    // Хук для обработки ресурсов документа
    const { assets, fonts, isLoading: assetsLoading, error: assetsError } = useDocumentAssets({
        assets: convertResult?.assets || [],
        fonts: convertResult?.fonts || []
    })

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        // Проверяем тип файла
        const extension = file.name.split('.').pop()?.toLowerCase()
        if (!['docx', 'rtf'].includes(extension || '')) {
            toast.error('Поддерживаются только DOCX и RTF файлы')
            return
        }

        // Проверяем размер файла (максимум 50MB)
        if (file.size > 50 * 1024 * 1024) {
            toast.error('Размер файла не должен превышать 50MB')
            return
        }

        setSelectedFile(file)
        setConvertResult(null)
        setError(null)
        toast.success(`Файл ${file.name} выбран для конвертации`)
    }, [])

    const handleConvert = useCallback(async () => {
        if (!selectedFile) return

        setIsConverting(true)
        setError(null)

        try {
            const formData = new FormData()
            formData.append('file', selectedFile)
            formData.append('useLibreOffice', options.useLibreOffice.toString())
            formData.append('fallbackToMammoth', options.fallbackToMammoth.toString())

            const response = await fetch('/api/convert', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Ошибка конвертации')
            }

            const result = await response.json()
            setConvertResult(result)

            toast.success(`Документ успешно конвертирован через ${result.method}`)
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Неизвестная ошибка'
            setError(errorMsg)
            toast.error(`Ошибка конвертации: ${errorMsg}`)
        } finally {
            setIsConverting(false)
        }
    }, [selectedFile, options])

    const handleDownload = useCallback(() => {
        if (!convertResult?.html) return

        const blob = new Blob([convertResult.html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${selectedFile?.name?.split('.')[0] || 'document'}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)

        toast.success('HTML файл скачан')
    }, [convertResult, selectedFile])

    const handleReset = useCallback(() => {
        setSelectedFile(null)
        setConvertResult(null)
        setError(null)
    }, [])

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                    {/* Header */}
                    <div className="border-b border-gray-200 p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">
                                    Импорт документов
                                </h1>
                                <p className="text-gray-600 mt-1">
                                    Конвертация DOCX/RTF в HTML с максимальным сохранением форматирования
                                </p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Settings className="w-5 h-5 text-gray-400" />
                                <span className="text-sm text-gray-500">Настройки</span>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                        {/* Левая панель - Загрузка и настройки */}
                        <div className="space-y-6">
                            {/* Выбор файла */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Выберите документ
                                </h2>

                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                                    <input
                                        type="file"
                                        accept=".docx,.rtf"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                        id="file-input"
                                    />
                                    <label
                                        htmlFor="file-input"
                                        className="cursor-pointer flex flex-col items-center space-y-2"
                                    >
                                        <Upload className="w-8 h-8 text-gray-400" />
                                        <span className="text-sm font-medium text-gray-900">
                                            Нажмите для выбора файла
                                        </span>
                                        <span className="text-xs text-gray-500">
                                            DOCX, RTF (максимум 50MB)
                                        </span>
                                    </label>
                                </div>

                                {selectedFile && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="flex items-center space-x-2">
                                            <FileText className="w-5 h-5 text-blue-600" />
                                            <div className="flex-1">
                                                <p className="text-sm font-medium text-blue-900">
                                                    {selectedFile.name}
                                                </p>
                                                <p className="text-xs text-blue-700">
                                                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                                                </p>
                                            </div>
                                            <button
                                                onClick={handleReset}
                                                className="text-blue-600 hover:text-blue-800"
                                            >
                                                <AlertCircle className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Настройки конвертации */}
                            <div className="space-y-4">
                                <h2 className="text-lg font-semibold text-gray-900">
                                    Настройки конвертации
                                </h2>

                                <div className="space-y-3">
                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.useLibreOffice}
                                            onChange={(e) => setOptions(prev => ({
                                                ...prev,
                                                useLibreOffice: e.target.checked
                                            }))}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-gray-900">
                                                Использовать LibreOffice
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                Максимальная точность форматирования
                                            </p>
                                        </div>
                                    </label>

                                    <label className="flex items-center space-x-3">
                                        <input
                                            type="checkbox"
                                            checked={options.fallbackToMammoth}
                                            onChange={(e) => setOptions(prev => ({
                                                ...prev,
                                                fallbackToMammoth: e.target.checked
                                            }))}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <div>
                                            <span className="text-sm font-medium text-gray-900">
                                                Fallback на Mammoth
                                            </span>
                                            <p className="text-xs text-gray-500">
                                                Для DOCX файлов, если LibreOffice недоступен
                                            </p>
                                        </div>
                                    </label>
                                </div>
                            </div>

                            {/* Кнопки действий */}
                            <div className="space-y-3">
                                <button
                                    onClick={handleConvert}
                                    disabled={!selectedFile || isConverting}
                                    className="w-full flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                >
                                    {isConverting ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Конвертация...
                                        </>
                                    ) : (
                                        <>
                                            <FileText className="w-4 h-4 mr-2" />
                                            Конвертировать документ
                                        </>
                                    )}
                                </button>

                                {convertResult && (
                                    <button
                                        onClick={handleDownload}
                                        className="w-full flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                                    >
                                        <Download className="w-4 h-4 mr-2" />
                                        Скачать HTML
                                    </button>
                                )}
                            </div>

                            {/* Статус */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <div className="flex items-center space-x-2">
                                        <AlertCircle className="w-5 h-5 text-red-600" />
                                        <span className="text-sm font-medium text-red-900">
                                            Ошибка конвертации
                                        </span>
                                    </div>
                                    <p className="text-sm text-red-700 mt-1">{error}</p>
                                </div>
                            )}

                            {convertResult && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                    <div className="flex items-center space-x-2">
                                        <CheckCircle className="w-5 h-5 text-green-600" />
                                        <span className="text-sm font-medium text-green-900">
                                            Конвертация завершена
                                        </span>
                                    </div>
                                    <p className="text-sm text-green-700 mt-1">
                                        Метод: {convertResult.method} •
                                        Ресурсы: {convertResult.assets.length} •
                                        Шрифты: {convertResult.fonts.length}
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Правая панель - Предварительный просмотр */}
                        <div className="space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900">
                                Предварительный просмотр
                            </h2>

                            {convertResult ? (
                                <div className="border border-gray-200 rounded-lg overflow-hidden">
                                    <DocumentViewer
                                        html={convertResult.html}
                                        assets={convertResult.assets}
                                        fonts={convertResult.fonts}
                                        title={selectedFile?.name || 'Документ'}
                                        className="h-[600px]"
                                    />
                                </div>
                            ) : (
                                <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                                    <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                                    <p className="text-gray-500">
                                        Выберите файл и нажмите "Конвертировать" для предварительного просмотра
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="border-t border-gray-200 p-6 bg-gray-50">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                            <div>
                                <p className="font-medium">Особенности конвертации:</p>
                                <ul className="mt-1 space-y-1">
                                    <li>• Максимальное сохранение форматирования</li>
                                    <li>• Изоляция от Tailwind CSS через iframe</li>
                                    <li>• Поддержка шрифтов и изображений</li>
                                    <li>• Безопасная обработка через DOMPurify</li>
                                </ul>
                            </div>
                            <div className="text-right">
                                <p>Статус ресурсов:</p>
                                <p className="text-xs">
                                    {assetsLoading ? 'Загрузка...' : `Готово: ${assets.length} ресурсов`}
                                </p>
                                {assetsError && (
                                    <p className="text-red-600 text-xs">{assetsError}</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
