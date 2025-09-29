'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Loader2, AlertCircle, Save, Edit3 } from 'lucide-react'
import { toast } from 'sonner'

interface ImportedDocumentViewerProps {
    document: {
        id: string
        title: string
        html: string
        type: string
        createdAt: string
        updatedAt: string
        metadata?: {
            fileSize?: number
            storageKey?: string
        }
    }
    onSave?: (documentId: string, html: string) => Promise<void>
}

type ViewerState = 'loading' | 'ready' | 'editing' | 'saving' | 'error'

export default function ImportedDocumentViewer({ document, onSave }: ImportedDocumentViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [state, setState] = useState<ViewerState>('loading')
    const [error, setError] = useState<string | null>(null)
    const [htmlContent, setHtmlContent] = useState<string>(document.html)
    const [hasChanges, setHasChanges] = useState(false)
    const [isEditing, setIsEditing] = useState(false)

    useEffect(() => {
        console.log('ImportedDocumentViewer: Получен документ:', document)
        console.log('ImportedDocumentViewer: HTML длина:', document.html?.length)

        // Простая проверка и загрузка
        if (document.html) {
            console.log('ImportedDocumentViewer: HTML найден, загружаем...')
            setHtmlContent(document.html)
            setState('ready')
            console.log('ImportedDocumentViewer: Состояние изменено на ready')
        } else {
            console.log('ImportedDocumentViewer: Нет HTML контента')
            setError('Документ не содержит HTML контента для отображения')
            setState('error')
        }
    }, [document.html])

    // Отдельный useEffect для загрузки HTML в DOM
    useEffect(() => {
        if (state === 'ready' && htmlContent && editorRef.current) {
            console.log('ImportedDocumentViewer: Загружаем HTML в DOM')
            editorRef.current.innerHTML = htmlContent
        }
    }, [state, htmlContent])

    const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
        const newContent = e.currentTarget.innerHTML
        setHtmlContent(newContent)
        setHasChanges(true)
    }

    const handleSave = async () => {
        if (!onSave || !hasChanges) return

        try {
            setState('saving')
            await onSave(document.id, htmlContent)
            setHasChanges(false)
            toast.success('Документ сохранен')
        } catch (error) {
            console.error('Ошибка сохранения:', error)
            toast.error('Ошибка сохранения документа')
            setState('ready')
        }
    }

    const handleEdit = () => {
        setIsEditing(true)
        setState('editing')
    }

    const handleView = () => {
        setIsEditing(false)
        setState('ready')
    }

    const handleExport = async () => {
        try {
            // Создаем HTML файл с полными стилями
            const fullHtml = `
        <!DOCTYPE html>
        <html lang="ru">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${document.title}</title>
          <style>
            body {
              font-family: 'Times New Roman', serif;
              line-height: 1.6;
              color: #333;
              max-width: 800px;
              margin: 0 auto;
              padding: 40px 20px;
              background: white;
            }
            h1, h2, h3, h4, h5, h6 {
              color: #1e293b;
              margin-top: 24px;
              margin-bottom: 12px;
            }
            h1 { font-size: 28px; }
            h2 { font-size: 24px; }
            h3 { font-size: 20px; }
            p { margin-bottom: 16px; }
            table {
              border-collapse: collapse;
              width: 100%;
              margin: 20px 0;
            }
            th, td {
              border: 1px solid #e2e8f0;
              padding: 8px 12px;
              text-align: left;
            }
            th {
              background-color: #f8fafc;
              font-weight: bold;
            }
            ul, ol {
              margin: 16px 0;
              padding-left: 24px;
            }
            li {
              margin-bottom: 8px;
            }
            strong { font-weight: bold; }
            em { font-style: italic; }
            u { text-decoration: underline; }
            del { text-decoration: line-through; }
            img {
              max-width: 100%;
              height: auto;
              margin: 16px 0;
            }
          </style>
        </head>
        <body>
          ${htmlContent}
        </body>
        </html>
      `

            // Создаем blob и скачиваем
            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            const a = window.document.createElement('a')
            a.href = url
            a.download = `${document.title}_exported.html`
            window.document.body.appendChild(a)
            a.click()
            window.document.body.removeChild(a)
            URL.revokeObjectURL(url)

            toast.success('Документ экспортирован в HTML')
        } catch (error) {
            console.error('Ошибка экспорта:', error)
            toast.error('Ошибка экспорта документа')
        }
    }

    if (state === 'loading') {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600 mb-2">Загружаем документ...</p>
                    <p className="text-sm text-slate-500">Восстанавливаем стили и форматирование</p>
                </div>
            </div>
        )
    }

    if (state === 'error') {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="text-center max-w-md">
                    <AlertCircle className="w-16 h-16 text-red-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Ошибка загрузки</h3>
                    <p className="text-slate-600 mb-4">{error}</p>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar */}
            <div className="border-b border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-slate-900">{document.title}</span>
                        <span className="text-sm text-slate-500">
                            (импортирован с сохранением стилей)
                        </span>
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {!isEditing ? (
                            <button
                                onClick={handleEdit}
                                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                <Edit3 className="w-4 h-4 mr-2" />
                                Редактировать
                            </button>
                        ) : (
                            <button
                                onClick={handleView}
                                className="flex items-center px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 transition-colors"
                            >
                                <FileText className="w-4 h-4 mr-2" />
                                Просмотр
                            </button>
                        )}

                        {hasChanges && isEditing && (
                            <button
                                onClick={handleSave}
                                disabled={state === 'saving'}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                            >
                                {state === 'saving' ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Save className="w-4 h-4 mr-2" />
                                )}
                                Сохранить
                            </button>
                        )}

                        <button
                            onClick={handleExport}
                            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Экспорт HTML
                        </button>
                    </div>
                </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-auto bg-white">
                <div className="max-w-4xl mx-auto p-8">
                    <div
                        ref={editorRef}
                        className={`document-viewer min-h-full bg-white shadow-sm border border-slate-200 rounded-lg p-8 ${isEditing ? 'outline-none' : ''
                            }`}
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        onInput={handleContentChange}
                        style={{
                            minHeight: '800px',
                            lineHeight: '1.6',
                            fontSize: '14px',
                            fontFamily: 'Times New Roman, serif',
                            outline: isEditing ? 'none' : 'none'
                        }}
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>
                        💡 {isEditing ? 'Режим редактирования' : 'Режим просмотра'} • Все стили сохранены
                    </p>
                    <p>
                        Создан: {new Date(document.createdAt).toLocaleDateString('ru-RU')}
                        {document.metadata?.fileSize && (
                            <span> • {Math.round(document.metadata.fileSize / 1024)} КБ</span>
                        )}
                    </p>
                </div>
            </div>
        </div>
    )
}
