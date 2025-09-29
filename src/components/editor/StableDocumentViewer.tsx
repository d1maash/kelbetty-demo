'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, FileText, Save, Edit3, ArrowUp } from 'lucide-react'
import { toast } from 'sonner'

interface StableDocumentViewerProps {
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

export default function StableDocumentViewer({ document, onSave }: StableDocumentViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        console.log('StableDocumentViewer: Загружаем документ:', document.title)
        console.log('StableDocumentViewer: HTML длина:', document.html.length)

        if (editorRef.current && document.html && typeof window !== 'undefined') {
            setIsLoading(true)

            // Блокируем все возможные причины скролла
            const originalScrollBehavior = document.documentElement?.style?.scrollBehavior || ''
            const originalOverflow = document.body?.style?.overflow || ''

            if (document.documentElement?.style) {
                document.documentElement.style.scrollBehavior = 'auto'
            }
            if (document.body?.style) {
                document.body.style.overflow = 'hidden'
            }

            // Сохраняем позицию скролла
            const scrollTop = window.pageYOffset || (document.documentElement?.scrollTop ?? 0)

            try {
                console.log('StableDocumentViewer: Устанавливаем HTML без скролла')

                // Устанавливаем HTML без применения стилей
                editorRef.current.innerHTML = document.html

                // Применяем стили только после установки HTML
                requestAnimationFrame(() => {
                    if (editorRef.current) {
                        // Применяем стили к существующим элементам
                        const elements = editorRef.current.querySelectorAll('*[style]')
                        elements.forEach((element: any) => {
                            const style = element.getAttribute('style')
                            if (style) {
                                const styles = style.split(';').filter(s => s.trim())
                                styles.forEach(styleRule => {
                                    if (styleRule.trim()) {
                                        const [property, value] = styleRule.split(':').map(s => s.trim())
                                        if (property && value) {
                                            element.style.setProperty(property, value, 'important')
                                        }
                                    }
                                })
                            }
                        })

                        // Применяем стили для заголовков
                        const headings = editorRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6')
                        headings.forEach((heading: any) => {
                            if (!heading.getAttribute('style')) {
                                const level = parseInt(heading.tagName.charAt(1))
                                const fontSize = 24 - (level - 1) * 2
                                heading.style.setProperty('font-size', `${fontSize}pt`, 'important')
                                heading.style.setProperty('font-weight', 'bold', 'important')
                                heading.style.setProperty('margin', `${16 - level * 2}pt 0 ${8 - level}pt 0`, 'important')
                            }
                        })

                        // Применяем стили для параграфов
                        const paragraphs = editorRef.current.querySelectorAll('p')
                        paragraphs.forEach((p: any) => {
                            if (!p.getAttribute('style')) {
                                p.style.setProperty('margin', '0 0 6pt 0', 'important')
                                p.style.setProperty('line-height', '1.15', 'important')
                            }
                        })
                    }

                    // Восстанавливаем скролл
                    setTimeout(() => {
                        if (document.documentElement?.style) {
                            document.documentElement.style.scrollBehavior = originalScrollBehavior
                        }
                        if (document.body?.style) {
                            document.body.style.overflow = originalOverflow
                        }
                        window.scrollTo(0, scrollTop)
                        setIsLoading(false)
                        console.log('StableDocumentViewer: Загрузка завершена без скролла')
                    }, 50)
                })

            } catch (error) {
                console.error('Ошибка загрузки документа:', error)
                if (document.documentElement?.style) {
                    document.documentElement.style.scrollBehavior = originalScrollBehavior
                }
                if (document.body?.style) {
                    document.body.style.overflow = originalOverflow
                }
                setIsLoading(false)
            }
        }
    }, [document.html, document.title])

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
                            (стабильный просмотр)
                        </span>
                        {isLoading && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                Загрузка...
                            </span>
                        )}
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            disabled={isLoading}
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
                            disabled={isLoading}
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
            <div className="flex-1 overflow-auto bg-white">
                <div className="max-w-4xl mx-auto p-8">
                    <div
                        ref={editorRef}
                        className={`document-viewer min-h-full bg-white shadow-sm border border-slate-200 rounded-lg p-8 ${isEditing ? 'outline-none' : ''
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
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            scrollBehavior: 'auto'
                        }}
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>
                        💡 {isEditing ? 'Режим редактирования' : 'Режим просмотра'} • Стабильный просмотр
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
