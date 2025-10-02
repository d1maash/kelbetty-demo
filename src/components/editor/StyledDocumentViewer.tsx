'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, FileText, Save, Edit3, ArrowUp, X } from 'lucide-react'
import { toast } from 'sonner'
import '@/styles/fast-import.css'

interface StyledDocumentViewerProps {
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
    onAcceptChanges?: (suggestion: any) => void
    onRejectChanges?: () => void
    isAiProcessing?: boolean
    isPreview?: boolean
}

export default function StyledDocumentViewer({
    document,
    onSave,
    onAcceptChanges,
    onRejectChanges,
    isAiProcessing = false,
    isPreview = false
}: StyledDocumentViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    useEffect(() => {
        console.log('StyledDocumentViewer: Загружаем документ:', document.title)
        console.log('StyledDocumentViewer: HTML длина:', document.html.length)

        if (editorRef.current && document.html && typeof window !== 'undefined') {
            // Блокируем скролл во время загрузки
            if (window.document.body && window.document.body.style) {
                window.document.body.style.overflow = 'hidden'
            }

            // Сохраняем текущую позицию скролла
            const currentScrollTop = window.scrollY

            console.log('StyledDocumentViewer: Устанавливаем HTML с правильными стилями')

            // Создаем временный контейнер для обработки
            const tempDiv = window.document.createElement('div')
            tempDiv.innerHTML = document.html

            // Сохраняем все inline стили без переопределения
            const elements = tempDiv.querySelectorAll('*[style]')
            elements.forEach((element: any) => {
                const style = element.getAttribute('style')
                if (style) {
                    // Просто сохраняем оригинальные стили без изменений
                    element.style.cssText = style
                }
            })

            // Применяем базовые стили только для элементов без inline стилей
            const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')
            headings.forEach((heading: any) => {
                if (!heading.getAttribute('style')) {
                    const level = parseInt(heading.tagName.charAt(1))
                    const fontSize = 24 - (level - 1) * 2
                    heading.style.fontSize = `${fontSize}pt`
                    heading.style.fontWeight = 'bold'
                    heading.style.margin = `${16 - level * 2}pt 0 ${8 - level}pt 0`
                }
            })

            const paragraphs = tempDiv.querySelectorAll('p')
            paragraphs.forEach((p: any) => {
                if (!p.getAttribute('style')) {
                    p.style.margin = '0 0 6pt 0'
                    p.style.lineHeight = '1.15'
                }
            })

            // Устанавливаем обработанный HTML
            editorRef.current.innerHTML = tempDiv.innerHTML

            // Восстанавливаем скролл и позицию
            setTimeout(() => {
                if (window.document.body && window.document.body.style) {
                    window.document.body.style.overflow = ''
                }
                window.scrollTo(0, currentScrollTop)
                console.log('StyledDocumentViewer: Стили применены принудительно')
            }, 100)
        }
    }, [document.html, document.title])

    const handleSave = useCallback(async () => {
        if (!onSave || !hasChanges || !editorRef.current) return

        try {
            const html = editorRef.current.innerHTML
            console.log('Сохранение документа:', document.id, 'HTML длина:', html.length)
            await onSave(document.id, html)
            setHasChanges(false)
            toast.success('Документ сохранен')
        } catch (error) {
            console.error('Ошибка сохранения:', error)
            toast.error('Ошибка сохранения документа')
        }
    }, [onSave, hasChanges, document.id])

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault()
                if (hasChanges) {
                    handleSave()
                }
            }
        }

        if (isEditing && typeof window !== 'undefined') {
            window.addEventListener('keydown', handleKeyDown)
            return () => window.removeEventListener('keydown', handleKeyDown)
        }
    }, [isEditing, hasChanges, handleSave])

    const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
        const newContent = e.currentTarget.innerHTML
        setHasChanges(newContent !== document.html)
    }

    const handleBlur = async () => {
        if (hasChanges && onSave && editorRef.current) {
            try {
                const html = editorRef.current.innerHTML
                console.log('Автосохранение при потере фокуса:', document.id)
                await onSave(document.id, html)
                setHasChanges(false)
                toast.success('Документ автосохранен')
            } catch (error) {
                console.error('Ошибка автосохранения:', error)
                toast.error('Ошибка автосохранения')
            }
        }
    }


    const handleExport = async () => {
        try {
            if (!editorRef.current) return

            const html = editorRef.current.innerHTML
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
          ${html}
        </body>
        </html>
      `

            const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' })
            const url = URL.createObjectURL(blob)
            if (typeof window !== 'undefined') {
                const a = document.createElement('a')
                a.href = url
                a.download = `${document.title}_exported.html`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
            }
            URL.revokeObjectURL(url)

            toast.success('Документ экспортирован в HTML')
        } catch (error) {
            console.error('Ошибка экспорта:', error)
            toast.error('Ошибка экспорта документа')
        }
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar - фиксированный */}
            <div className="sticky top-0 z-10 border-b border-slate-200 p-4 bg-slate-50 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-slate-900">{document.title}</span>
                        <span className="text-sm text-slate-500">
                            (с правильными стилями)
                        </span>
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                        {isAiProcessing && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded flex items-center gap-1">
                                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                ИИ обрабатывает запрос...
                            </span>
                        )}
                        {isPreview && (
                            <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded flex items-center gap-1">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                Предварительный просмотр
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        {isPreview && (
                            <button
                                onClick={() => onRejectChanges?.()}
                                className="flex items-center px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 transition-colors"
                            >
                                <X className="w-4 h-4 mr-1" />
                                Выйти из предварительного просмотра
                            </button>
                        )}
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            {isEditing ? 'Просмотр' : 'Редактировать'}
                        </button>

                        {hasChanges && isEditing && (
                            <button
                                onClick={handleSave}
                                className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Save className="w-4 h-4 mr-2" />
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

                        <button
                            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                            title="Наверх"
                        >
                            <ArrowUp className="w-4 h-4 mr-2" />
                            Наверх
                        </button>
                    </div>
                </div>
            </div>


            {/* Document Content with Proper Styles */}
            <div className="flex-1 overflow-auto bg-white relative">
                {/* Оверлей загрузки ИИ */}
                {isAiProcessing && (
                    <div className="fixed inset-0 bg-white bg-opacity-30 flex items-center justify-center z-50 pointer-events-none">
                        <div className="bg-white rounded-lg shadow-lg p-6 flex flex-col items-center gap-4 pointer-events-auto">
                            <div className="flex items-center gap-2">
                                <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-lg font-medium text-gray-900">ИИ обрабатывает ваш запрос...</span>
                            </div>
                            <p className="text-sm text-gray-600 text-center">
                                Пожалуйста, подождите. ИИ анализирует документ и готовит изменения.
                            </p>
                        </div>
                    </div>
                )}

                <div className="max-w-4xl mx-auto p-8">
                    <div
                        ref={editorRef}
                        className={`fast-import-document min-h-full bg-white shadow-sm border border-slate-200 rounded-lg p-8 ${isEditing ? 'outline-none' : ''
                            }`}
                        contentEditable={isEditing}
                        suppressContentEditableWarning={true}
                        onInput={handleContentChange}
                        onBlur={handleBlur}
                        style={{
                            minHeight: '800px',
                            lineHeight: '1.6',
                            fontSize: '14px',
                            fontFamily: 'Times New Roman, serif',
                            outline: isEditing ? 'none' : 'none',
                            // Дополнительные стили для правильного отображения
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            // Предотвращаем нежелательный скролл
                            scrollBehavior: 'smooth'
                        }}
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>
                        💡 {isEditing ? 'Режим редактирования' : 'Режим просмотра'} • Стили сохранены
                    </p>
                    <p>
                        Создан: {new Date(document.createdAt).toLocaleDateString('ru-RU')}
                        {document.metadata?.fileSize && (
                            <span> • {Math.round(document.metadata.fileSize / 1024)} КБ</span>
                        )}
                    </p>
                </div>
            </div>

            {/* Встроенные стили для правильного отображения */}
            <style jsx global>{`
        .document-viewer {
          /* Сброс стилей для правильного отображения */
          * {
            box-sizing: border-box;
          }
          
          /* Заголовки */
          h1, h2, h3, h4, h5, h6 {
            color: #1e293b;
            margin-top: 24px;
            margin-bottom: 12px;
            font-weight: bold;
            line-height: 1.3;
          }
          
          h1 { font-size: 28px; }
          h2 { font-size: 24px; }
          h3 { font-size: 20px; }
          h4 { font-size: 18px; }
          h5 { font-size: 16px; }
          h6 { font-size: 14px; }
          
          /* Параграфы */
          p {
            margin-bottom: 16px;
            line-height: 1.6;
            text-align: justify;
          }
          
          /* Таблицы */
          table {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            border: 1px solid #e2e8f0;
          }
          
          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
          }
          
          th {
            background-color: #f8fafc;
            font-weight: bold;
          }
          
          /* Списки */
          ul, ol {
            margin: 16px 0;
            padding-left: 24px;
          }
          
          li {
            margin-bottom: 8px;
            line-height: 1.6;
          }
          
          /* Форматирование текста */
          strong, b {
            font-weight: bold;
          }
          
          em, i {
            font-style: italic;
          }
          
          u {
            text-decoration: underline;
          }
          
          del, s {
            text-decoration: line-through;
          }
          
          /* Изображения */
          img {
            max-width: 100%;
            height: auto;
            margin: 16px 0;
            display: block;
          }
          
          /* Цитаты */
          blockquote {
            margin: 20px 0;
            padding-left: 20px;
            border-left: 4px solid #e2e8f0;
            font-style: italic;
            color: #64748b;
          }
          
          /* Код */
          code {
            background-color: #f1f5f9;
            padding: 2px 4px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
          }
          
          pre {
            background-color: #f1f5f9;
            padding: 16px;
            border-radius: 6px;
            overflow-x: auto;
            margin: 16px 0;
          }
          
          pre code {
            background: none;
            padding: 0;
          }
          
          /* Отступы и выравнивание */
          .text-left { text-align: left; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-justify { text-align: justify; }
          
          /* Размеры шрифтов */
          .text-xs { font-size: 12px; }
          .text-sm { font-size: 14px; }
          .text-base { font-size: 16px; }
          .text-lg { font-size: 18px; }
          .text-xl { font-size: 20px; }
          .text-2xl { font-size: 24px; }
          .text-3xl { font-size: 28px; }
          
          /* Цвета текста */
          .text-red-600 { color: #dc2626; }
          .text-blue-600 { color: #2563eb; }
          .text-green-600 { color: #16a34a; }
          .text-yellow-600 { color: #ca8a04; }
          .text-purple-600 { color: #9333ea; }
          
          /* Отступы */
          .ml-4 { margin-left: 16px; }
          .ml-8 { margin-left: 32px; }
          .ml-12 { margin-left: 48px; }
          .ml-16 { margin-left: 64px; }
          
          .mr-4 { margin-right: 16px; }
          .mr-8 { margin-right: 32px; }
          .mr-12 { margin-right: 48px; }
          .mr-16 { margin-right: 64px; }
          
          .mt-4 { margin-top: 16px; }
          .mt-8 { margin-top: 32px; }
          .mt-12 { margin-top: 48px; }
          .mt-16 { margin-top: 64px; }
          
          .mb-4 { margin-bottom: 16px; }
          .mb-8 { margin-bottom: 32px; }
          .mb-12 { margin-bottom: 48px; }
          .mb-16 { margin-bottom: 64px; }
          
          /* Внутренние отступы */
          .p-4 { padding: 16px; }
          .p-8 { padding: 32px; }
          .p-12 { padding: 48px; }
          .p-16 { padding: 64px; }
          
          /* Специальные стили для Word документов */
          .MsoNormal {
            margin: 0;
            line-height: 1.6;
          }
          
          .MsoListParagraph {
            margin: 0;
            text-indent: 0;
          }
          
          /* Стили для таблиц Word */
          .MsoTableGrid {
            border-collapse: collapse;
            width: 100%;
          }
          
          .MsoTableGrid td,
          .MsoTableGrid th {
            border: 1px solid #000;
            padding: 4px 8px;
          }
        `}</style>
        </div>
    )
}
