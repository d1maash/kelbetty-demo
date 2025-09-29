'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Upload, FileText, AlertCircle } from 'lucide-react'

type Loaded =
    | { mode: 'onlyoffice'; urlForDs: string; fileKey: string; fileType: 'docx' | 'pptx' | 'xlsx' | 'pdf'; title: string }
    | { mode: 'fallback'; kind: 'docx' | 'pdf'; buf: ArrayBuffer; title: string }

export default function ImportDropzone({ onLoaded }: { onLoaded: (l: Loaded) => void }) {
    const [status, setStatus] = useState<'idle' | 'uploading' | 'ready' | 'error'>('idle')
    const [dragOver, setDragOver] = useState(false)

    async function handleFiles(files: FileList | null) {
        if (!files?.[0]) return
        const file = files[0]
        console.log('Загружаем файл:', file.name, file.size, file.type)

        const ext = (file.name.split('.').pop() || '').toLowerCase()
        const type = (['docx', 'pptx', 'xlsx', 'pdf'] as const).includes(ext as any) ? (ext as any) : null
        if (!type) {
            toast.error('Поддерживаются .docx, .pptx, .xlsx, .pdf')
            return
        }

        try {
            setStatus('uploading')
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
                onLoaded({
                    mode: 'onlyoffice',
                    urlForDs: json.urlForDs,
                    fileKey: json.key,
                    fileType: type,
                    title: file.name
                })
            } else {
                // fallback: локально прочитаем для docx/pdf
                console.log('Используем fallback режим для типа:', type)
                const buf = await file.arrayBuffer()
                if (type === 'docx' || type === 'pdf') {
                    console.log('Загружаем fallback компонент для:', type)

                    // Сохраняем документ в БД
                    try {
                        const dbResponse = await fetch('/api/test-documents', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                title: file.name,
                                type: type,
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

                    onLoaded({ mode: 'fallback', kind: type, buf, title: file.name })
                } else {
                    toast.error('Для pptx/xlsx нужен OnlyOffice (включи Docker документ-сервер)')
                    setStatus('error')
                    return
                }
            }

            setStatus('ready')
            toast.success(`Документ "${file.name}" успешно импортирован`)
        } catch (e: any) {
            console.error('Ошибка импорта:', e)
            setStatus('error')
            toast.error(e?.message ?? 'Импорт не удался')
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

    return (
        <div className="p-4">
            <div
                className={`rounded-xl border-2 border-dashed p-8 text-center transition-colors ${dragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-slate-300 hover:border-slate-400'
                    }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
            >
                <Upload className="w-12 h-12 mx-auto mb-4 text-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900 mb-2">Импорт документа</h3>
                <p className="text-sm text-slate-600 mb-4">
                    Перетащите файл сюда или нажмите для выбора
                </p>

                <input
                    type="file"
                    accept=".docx,.pptx,.xlsx,.pdf"
                    onChange={(e) => handleFiles(e.target.files)}
                    className="hidden"
                    id="file-input"
                />

                <label
                    htmlFor="file-input"
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer"
                >
                    <FileText className="w-4 h-4 mr-2" />
                    Выбрать файл
                </label>

                {status !== 'idle' && (
                    <div className="mt-4 p-3 rounded-lg bg-slate-50">
                        <div className="flex items-center space-x-2">
                            {status === 'uploading' && (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                    <p className="text-sm text-slate-600">Загрузка файла...</p>
                                </>
                            )}
                            {status === 'ready' && (
                                <>
                                    <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                    <p className="text-sm text-green-600">Готово!</p>
                                </>
                            )}
                            {status === 'error' && (
                                <>
                                    <AlertCircle className="w-4 h-4 text-red-500" />
                                    <p className="text-sm text-red-600">Ошибка загрузки</p>
                                </>
                            )}
                        </div>
                    </div>
                )}

                <div className="mt-4 text-xs text-slate-500">
                    <p>Поддерживаемые форматы: DOCX, PPTX, XLSX, PDF</p>
                    <p>Максимальный размер: 50 МБ</p>
                </div>
            </div>
        </div>
    )
}
