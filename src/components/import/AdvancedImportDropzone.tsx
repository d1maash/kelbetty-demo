'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react'

interface ImportResult {
    success: boolean
    document?: {
        id: string
        title: string
        type: string
        html: string
        createdAt: string
        updatedAt: string
    }
    warnings?: any[]
    error?: string
}

export default function AdvancedImportDropzone({
    onImportSuccess
}: {
    onImportSuccess?: (result: ImportResult) => void
}) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle')
    const [dragOver, setDragOver] = useState(false)
    const [progress, setProgress] = useState(0)
    const [importResult, setImportResult] = useState<ImportResult | null>(null)

    async function handleFiles(files: FileList | null) {
        if (!files?.[0]) return
        const file = files[0]

        console.log('Импортируем файл:', file.name, file.size, file.type)

        const ext = (file.name.split('.').pop() || '').toLowerCase()
        if (ext !== 'docx') {
            toast.error('Для импорта с сохранением стилей поддерживаются только DOCX файлы')
            return
        }

        try {
            setStatus('uploading')
            setProgress(10)

            // Создаем FormData для отправки файла
            const formData = new FormData()
            formData.append('file', file)

            setProgress(30)
            setStatus('processing')

            console.log('Отправляем файл на сервер...')

            // Отправляем файл на сервер для обработки с таймаутом
            const controller = new AbortController()
            const timeoutId = setTimeout(() => controller.abort(), 60000) // 60 секунд таймаут

            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData,
                signal: controller.signal
            })

            clearTimeout(timeoutId)
            setProgress(70)

            console.log('Ответ получен:', response.status)

            const result = await response.json()
            console.log('Результат:', result)

            if (!response.ok) {
                throw new Error(result.error || 'Ошибка импорта')
            }

            setProgress(100)
            setStatus('ready')
            setImportResult(result)

            toast.success(`Документ "${file.name}" успешно импортирован с сохранением стилей!`)

            if (onImportSuccess) {
                onImportSuccess(result)
            }

        } catch (error: any) {
            console.error('Ошибка импорта:', error)
            setStatus('error')
            if (error.name === 'AbortError') {
                toast.error('Таймаут загрузки. Файл слишком большой или сервер не отвечает.')
            } else {
                toast.error(error.message || 'Ошибка при импорте документа')
            }
        }
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        handleFiles(e.dataTransfer.files)
    }

    const resetImport = () => {
        setStatus('idle')
        setProgress(0)
        setImportResult(null)
    }

    return (
        <div className="p-4">
            <div
                className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : status === 'ready'
                        ? 'border-green-400 bg-green-50'
                        : 'border-slate-300 hover:border-slate-400'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                {status === 'idle' && (
                    <>
                        <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">
                            Импорт с сохранением стилей
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Перетащите DOCX файл сюда для импорта с полным сохранением форматирования
                        </p>
                    </>
                )}

                {status === 'uploading' && (
                    <>
                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Загрузка файла</h3>
                        <p className="text-sm text-slate-600 mb-4">Отправляем файл на сервер...</p>
                    </>
                )}

                {status === 'processing' && (
                    <>
                        <Loader2 className="w-12 h-12 mx-auto mb-4 text-blue-600 animate-spin" />
                        <h3 className="text-lg font-semibold text-slate-900 mb-2">Обработка документа</h3>
                        <p className="text-sm text-slate-600 mb-4">
                            Извлекаем стили и форматирование...
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </>
                )}

                {status === 'ready' && importResult && (
                    <>
                        <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                        <h3 className="text-lg font-semibold text-green-900 mb-2">
                            Импорт завершен!
                        </h3>
                        <p className="text-sm text-green-700 mb-4">
                            Документ &quot;{importResult.document?.title}&quot; успешно импортирован
                        </p>
                        {importResult.warnings && importResult.warnings.length > 0 && (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                                <p className="text-xs text-yellow-800">
                                    Предупреждения: {importResult.warnings.length} элементов требуют внимания
                                </p>
                            </div>
                        )}
                        <button
                            onClick={resetImport}
                            className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            Импортировать еще
                        </button>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
                        <h3 className="text-lg font-semibold text-red-900 mb-2">Ошибка импорта</h3>
                        <p className="text-sm text-red-700 mb-4">
                            Не удалось импортировать документ
                        </p>
                        <button
                            onClick={resetImport}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Попробовать снова
                        </button>
                    </>
                )}

                {status === 'idle' && (
                    <>
                        <input
                            type="file"
                            accept=".docx"
                            onChange={(e) => handleFiles(e.target.files)}
                            className="hidden"
                            id="advanced-file-input"
                        />
                        <label
                            htmlFor="advanced-file-input"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            <FileText className="w-5 h-5 mr-2" />
                            Выбрать DOCX файл
                        </label>
                    </>
                )}

                <div className="mt-6 text-xs text-slate-500">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Что сохраняется:</h4>
                            <ul className="space-y-1 text-slate-600">
                                <li>• Заголовки и стили</li>
                                <li>• Шрифты и размеры</li>
                                <li>• Цвета и форматирование</li>
                                <li>• Таблицы и списки</li>
                                <li>• Изображения</li>
                            </ul>
                        </div>
                        <div>
                            <h4 className="font-semibold text-slate-700 mb-2">Ограничения:</h4>
                            <ul className="space-y-1 text-slate-600">
                                <li>• Только DOCX формат</li>
                                <li>• Максимум 50 МБ</li>
                                <li>• Сложные макросы не поддерживаются</li>
                                <li>• Некоторые стили могут отличаться</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
