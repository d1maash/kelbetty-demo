'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, AlertCircle, CheckCircle, Loader2, Settings } from 'lucide-react'

type Loaded =
    | { mode: 'onlyoffice'; urlForDs: string; fileKey: string; fileType: 'docx' | 'pptx' | 'xlsx' | 'pdf'; title: string }
    | { mode: 'fallback'; kind: 'docx' | 'pdf'; buf: ArrayBuffer; title: string }
    | { mode: 'advanced'; document: any; warnings?: any[] }

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

export default function ImportDropzone({
    onLoaded,
    onImportSuccess
}: {
    onLoaded?: (l: Loaded) => void
    onImportSuccess?: (result: ImportResult) => void
}) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'ready' | 'error'>('idle')
    const [dragOver, setDragOver] = useState(false)
    const [progress, setProgress] = useState(0)
    const [importMode, setImportMode] = useState<'standard' | 'advanced'>('standard')
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const [abortController, setAbortController] = useState<AbortController | null>(null)

    async function handleFiles(files: FileList | null) {
        if (!files?.[0]) return
        const file = files[0]
        console.log('Загружаем файл:', file.name, file.size, file.type)

        const ext = (file.name.split('.').pop() || '').toLowerCase()

        // Проверяем размер файла
        const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
        if (file.size > MAX_FILE_SIZE) {
            toast.error(`Файл слишком большой (${Math.round(file.size / 1024 / 1024)}MB). Максимальный размер: 50MB`)
            return
        }

        // Предупреждение для больших файлов
        if (file.size > 10 * 1024 * 1024) { // 10MB
            toast.info(`Большой файл (${Math.round(file.size / 1024 / 1024)}MB). Обработка может занять до 30 секунд.`)
        }

        // Проверяем поддерживаемые форматы в зависимости от режима
        if (importMode === 'advanced') {
            if (!['docx', 'rtf'].includes(ext)) {
                toast.error('Для импорта с сохранением стилей поддерживаются только DOCX и RTF файлы')
                return
            }
        } else {
            const type = (['docx', 'pptx', 'xlsx', 'pdf', 'rtf'] as const).includes(ext as any) ? (ext as any) : null
            if (!type) {
                toast.error('Поддерживаются .docx, .pptx, .xlsx, .pdf, .rtf')
                return
            }
        }

        try {
            setStatus('uploading')
            setProgress(10)

            if (importMode === 'advanced') {
                // Продвинутый импорт с сохранением стилей
                console.log('Используем продвинутый импорт с сохранением стилей...')

                const formData = new FormData()
                formData.append('file', file)

                setProgress(30)
                setStatus('processing')

                const controller = new AbortController()
                setAbortController(controller)

                // Добавляем промежуточные обновления прогресса
                const progressInterval = setInterval(() => {
                    setProgress(prev => {
                        if (prev < 90) {
                            return prev + 3 // Быстрее для простого импорта
                        }
                        return prev
                    })
                }, 1000) // Обновляем каждую секунду

                const timeoutId = setTimeout(() => {
                    console.log('Таймаут запроса, прерываем...')
                    clearInterval(progressInterval)
                    controller.abort()
                }, 120000) // Увеличиваем таймаут до 2 минут для сложных документов

                try {
                    console.log('Отправляем запрос на /api/import-simple...')

                    // Добавляем заголовки для лучшей совместимости
                    const response = await fetch('/api/import-simple', {
                        method: 'POST',
                        body: formData,
                        signal: controller.signal,
                        headers: {
                            'Accept': 'application/json',
                        }
                    })

                    clearTimeout(timeoutId)
                    clearInterval(progressInterval)
                    setProgress(70)

                    console.log('Получен ответ:', response.status, response.statusText)

                    if (!response.ok) {
                        const errorText = await response.text()
                        console.error('Ошибка ответа:', errorText)
                        throw new Error(`HTTP ${response.status}: ${errorText}`)
                    }

                    const result = await response.json()
                    console.log('Результат импорта:', result)

                    setProgress(100)
                    setStatus('ready')
                    setImportResult(result)

                    toast.success(`Документ "${file.name}" успешно импортирован с сохранением стилей!`)

                    if (onImportSuccess) {
                        onImportSuccess(result)
                    }

                    if (onLoaded) {
                        onLoaded({ mode: 'advanced', document: result.document, warnings: result.warnings })
                    }
                } catch (fetchError) {
                    clearTimeout(timeoutId)
                    clearInterval(progressInterval)
                    setAbortController(null)
                    console.error('Ошибка fetch:', fetchError)
                    throw fetchError
                }
            } else {
                // Стандартный импорт
                console.log('Отправляем файл на сервер...')

                const fd = new FormData()
                fd.append('file', file)
                const res = await fetch('/api/storage/upload', { method: 'POST', body: fd })
                const json = await res.json()
                console.log('Ответ сервера:', json)

                if (!res.ok || !json?.ok) {
                    throw new Error(json?.error ?? 'UPLOAD_FAILED')
                }

                // Проверяем, доступен ли OnlyOffice
                const onlyOfficeEnabled = process.env.NEXT_PUBLIC_ONLYOFFICE_ENABLED === 'true'

                if (onlyOfficeEnabled) {
                    if (onLoaded) {
                        onLoaded({
                            mode: 'onlyoffice',
                            urlForDs: json.urlForDs,
                            fileKey: json.key,
                            fileType: ext as any,
                            title: file.name
                        })
                    }
                } else {
                    // fallback: локально прочитаем для docx/pdf
                    console.log('Используем fallback режим для типа:', ext)
                    const buf = await file.arrayBuffer()
                    if (ext === 'docx' || ext === 'pdf') {
                        console.log('Загружаем fallback компонент для:', ext)

                        // Сохраняем документ в БД
                        try {
                            const dbResponse = await fetch('/api/test-documents', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    title: file.name,
                                    type: ext,
                                    content: '', // Пока пустой
                                    metadata: {
                                        fileName: file.name,
                                        fileSize: file.size,
                                        fileType: file.type,
                                        lastModified: file.lastModified
                                    }
                                })
                            })

                            if (dbResponse.ok) {
                                console.log('Документ сохранен в БД')
                            } else {
                                console.error('Ошибка сохранения в БД:', await dbResponse.text())
                            }
                        } catch (dbError) {
                            console.error('Ошибка сохранения в БД:', dbError)
                        }

                        if (onLoaded) {
                            onLoaded({ mode: 'fallback', kind: ext as any, buf, title: file.name })
                        }
                    } else {
                        toast.error('Для pptx/xlsx нужен OnlyOffice (включи Docker документ-сервер)')
                        setStatus('error')
                        return
                    }
                }

                setStatus('ready')
                toast.success(`Документ "${file.name}" успешно импортирован`)
            }
        } catch (e: any) {
            console.error('Ошибка импорта:', e)
            setStatus('error')
            setProgress(0)
            setAbortController(null)

            if (e.name === 'AbortError') {
                toast.error('Импорт отменен пользователем.')
            } else if (e.message?.includes('HTTP 500')) {
                toast.error('Ошибка сервера при обработке файла. Попробуйте другой файл.')
            } else if (e.message?.includes('HTTP 400')) {
                toast.error('Неподдерживаемый формат файла или файл поврежден.')
            } else {
                toast.error(e?.message ?? 'Импорт не удался')
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
        setAbortController(null)
    }

    const cancelImport = () => {
        if (abortController) {
            abortController.abort()
            setAbortController(null)
        }
        setStatus('idle')
        setProgress(0)
        toast.info('Импорт отменен')
    }

    return (
        <div className="p-4">
            {/* Режим импорта */}
            <div className="mb-4 flex items-center justify-center space-x-4">
                <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4 text-slate-500" />
                    <span className="text-sm text-slate-600">Режим импорта:</span>
                </div>
                <div className="flex bg-slate-100 rounded-lg p-1">
                    <button
                        onClick={() => setImportMode('standard')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${importMode === 'standard'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        Стандартный
                    </button>
                    <button
                        onClick={() => setImportMode('advanced')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${importMode === 'advanced'
                            ? 'bg-white text-slate-900 shadow-sm'
                            : 'text-slate-600 hover:text-slate-900'
                            }`}
                    >
                        С сохранением стилей
                    </button>
                </div>
            </div>

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
                            {importMode === 'advanced' ? 'Импорт с сохранением стилей' : 'Импорт документа'}
                        </h3>
                        <p className="text-sm text-slate-600 mb-4">
                            {importMode === 'advanced'
                                ? 'Перетащите DOCX или RTF файл сюда для импорта с полным сохранением форматирования'
                                : 'Перетащите файл сюда или нажмите для выбора'
                            }
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
                            {progress < 20 ? 'Подготавливаем файл к отправке...' :
                                progress < 40 ? 'Загружаем файл на сервер...' :
                                    progress < 60 ? 'Извлекаем стили и форматирование...' :
                                        progress < 80 ? 'Обрабатываем содержимое документа...' :
                                            'Сохраняем документ в базе данных...'}
                        </p>
                        <div className="w-full bg-slate-200 rounded-full h-2 mb-4">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                            Прогресс: {progress}% • Обычно занимает 5-15 секунд
                        </p>
                        <button
                            onClick={cancelImport}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                        >
                            Отменить импорт
                        </button>
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

                {status === 'ready' && !importResult && (
                    <>
                        <div className="w-4 h-4 bg-green-500 rounded-full mx-auto mb-4"></div>
                        <p className="text-sm text-green-600">Готово!</p>
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
                            accept={importMode === 'advanced' ? '.docx,.rtf' : '.docx,.pptx,.xlsx,.pdf,.rtf'}
                            onChange={(e) => handleFiles(e.target.files)}
                            className="hidden"
                            id="file-input"
                        />
                        <label
                            htmlFor="file-input"
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                        >
                            <FileText className="w-5 h-5 mr-2" />
                            {importMode === 'advanced' ? 'Выбрать DOCX/RTF файл' : 'Выбрать файл'}
                        </label>
                    </>
                )}

                <div className="mt-6 text-xs text-slate-500">
                    {importMode === 'advanced' ? (
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
                                    <li>• DOCX и RTF форматы</li>
                                    <li>• Максимум 50 МБ</li>
                                    <li>• LibreOffice + Mammoth fallback</li>
                                    <li>• Максимальное сохранение стилей</li>
                                </ul>
                            </div>
                        </div>
                    ) : (
                        <>
                            <p>Поддерживаемые форматы: DOCX, PPTX, XLSX, PDF, RTF</p>
                            <p>Максимальный размер: 50 МБ</p>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
