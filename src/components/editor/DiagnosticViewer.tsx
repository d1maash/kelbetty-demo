'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, FileText, Save, Edit3, ArrowUp, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface DiagnosticViewerProps {
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

export default function DiagnosticViewer({ document, onSave }: DiagnosticViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [scrollEvents, setScrollEvents] = useState<string[]>([])
    const [isLocked, setIsLocked] = useState(false)

    // Отслеживаем все события скролла
    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleScroll = () => {
            const scrollTop = window.pageYOffset || (window.document.documentElement?.scrollTop ?? 0)
            setScrollEvents(prev => [...prev.slice(-9), `Скролл: ${scrollTop}px в ${new Date().toLocaleTimeString()}`])
        }

        const handleResize = () => {
            setScrollEvents(prev => [...prev.slice(-9), `Изменение размера в ${new Date().toLocaleTimeString()}`])
        }

        window.addEventListener('scroll', handleScroll)
        window.addEventListener('resize', handleResize)

        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('resize', handleResize)
        }
    }, [])

    useEffect(() => {
        console.log('🔍 DiagnosticViewer: Начинаем диагностику загрузки документа')
        console.log('🔍 HTML длина:', document.html.length)

        if (editorRef.current && document.html && typeof window !== 'undefined') {
            // Блокируем скролл полностью
            setIsLocked(true)
            const originalScrollTop = window.pageYOffset || (window.document.documentElement?.scrollTop ?? 0)

            console.log('🔍 Исходная позиция скролла:', originalScrollTop)

            // Принудительно фиксируем позицию
            window.scrollTo(0, 0)

            // Устанавливаем HTML
            editorRef.current.innerHTML = document.html

            console.log('🔍 HTML установлен, высота контейнера:', editorRef.current.scrollHeight)

            // Принудительно возвращаемся в начало
            setTimeout(() => {
                window.scrollTo(0, 0)
                console.log('🔍 Позиция после установки HTML:', window.pageYOffset)
                setIsLocked(false)
            }, 100)
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
            await onSave(document.id, html)
            setHasChanges(false)
            toast.success('Документ сохранен')
        } catch (error) {
            console.error('Ошибка сохранения:', error)
            toast.error('Ошибка сохранения документа')
        }
    }, [onSave, hasChanges, document.id])

    const forceScrollToTop = () => {
        if (typeof window !== 'undefined') {
            window.scrollTo(0, 0)
            console.log('🔍 Принудительный скролл в начало')
        }
    }

    const clearScrollEvents = () => {
        setScrollEvents([])
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Диагностический toolbar */}
            <div className="sticky top-0 z-20 border-b border-slate-200 p-4 bg-red-50 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-900">Диагностика скролла</span>
                        <span className="text-sm text-red-600">
                            {isLocked ? '🔒 Заблокировано' : '🔓 Разблокировано'}
                        </span>
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={forceScrollToTop}
                            className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            🔝 Наверх
                        </button>
                        <button
                            onClick={clearScrollEvents}
                            className="flex items-center px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        >
                            🗑️ Очистить
                        </button>
                        <button
                            onClick={() => setIsEditing(!isEditing)}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Edit3 className="w-4 h-4 mr-2" />
                            {isEditing ? 'Просмотр' : 'Редактировать'}
                        </button>
                    </div>
                </div>

                {/* События скролла */}
                <div className="mt-2 max-h-20 overflow-y-auto bg-white border rounded p-2">
                    <div className="text-xs text-gray-600 mb-1">События скролла:</div>
                    {scrollEvents.length === 0 ? (
                        <div className="text-xs text-gray-400">Нет событий</div>
                    ) : (
                        scrollEvents.map((event, i) => (
                            <div key={i} className="text-xs text-gray-700">{event}</div>
                        ))
                    )}
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
                        onBlur={handleBlur}
                        style={{
                            minHeight: '800px',
                            lineHeight: '1.6',
                            fontSize: '14px',
                            fontFamily: 'Times New Roman, serif',
                            outline: isEditing ? 'none' : 'none',
                            wordWrap: 'break-word',
                            overflowWrap: 'break-word',
                            // Принудительно отключаем все возможные причины скролла
                            scrollBehavior: 'auto',
                            overflowAnchor: 'none'
                        }}
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>
                        🔍 Диагностический режим • Отслеживание скролла
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
