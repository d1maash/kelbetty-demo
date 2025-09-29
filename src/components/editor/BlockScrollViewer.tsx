'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, FileText, Save, Edit3, ArrowUp, AlertTriangle, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface BlockScrollViewerProps {
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

export default function BlockScrollViewer({ document, onSave }: BlockScrollViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)

    // ПОЛНАЯ БЛОКИРОВКА СКРОЛЛА
    useEffect(() => {
        if (typeof window === 'undefined') return

        // Блокируем скролл через CSS
        const blockScroll = () => {
            if (typeof document !== 'undefined' && document.body && document.documentElement) {
                // ПРИНУДИТЕЛЬНО блокируем скролл
                document.body.style.overflow = 'hidden'
                document.body.style.position = 'fixed'
                document.body.style.top = '0'
                document.body.style.left = '0'
                document.body.style.width = '100%'
                document.body.style.height = '100%'
                document.documentElement.style.overflow = 'hidden'

                // ПРИНУДИТЕЛЬНО возвращаемся в начало
                window.scrollTo(0, 0)
            }
        }

        // Блокируем все события скролла
        const handleScroll = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
            window.scrollTo(0, 0)
        }

        const handleWheel = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
        }

        const handleTouchMove = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            // Блокируем все клавиши скролла
            if ([32, 33, 34, 35, 36, 37, 38, 39, 40, 8].includes(e.keyCode)) {
                e.preventDefault()
                e.stopPropagation()
                window.scrollTo(0, 0)
            }
        }

        // Применяем блокировку
        blockScroll()

        // Добавляем все возможные обработчики
        window.addEventListener('scroll', handleScroll, { passive: false, capture: true })
        window.addEventListener('wheel', handleWheel, { passive: false, capture: true })
        window.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
        window.addEventListener('keydown', handleKeyDown, { passive: false, capture: true })

        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('scroll', handleScroll, { passive: false, capture: true })
            document.addEventListener('wheel', handleWheel, { passive: false, capture: true })
            document.addEventListener('touchmove', handleTouchMove, { passive: false, capture: true })
            document.addEventListener('keydown', handleKeyDown, { passive: false, capture: true })
        }

        // ПРИНУДИТЕЛЬНО возвращаемся в начало каждые 100мс
        const forceScrollInterval = setInterval(() => {
            window.scrollTo(0, 0)
        }, 100)

        return () => {
            // Убираем все обработчики
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('wheel', handleWheel)
            window.removeEventListener('touchmove', handleTouchMove)
            window.removeEventListener('keydown', handleKeyDown)

            if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
                document.removeEventListener('scroll', handleScroll)
                document.removeEventListener('wheel', handleWheel)
                document.removeEventListener('touchmove', handleTouchMove)
                document.removeEventListener('keydown', handleKeyDown)
            }

            // Очищаем интервал
            clearInterval(forceScrollInterval)

            // Разблокируем скролл
            if (typeof document !== 'undefined' && document.body && document.documentElement) {
                document.body.style.overflow = ''
                document.body.style.position = ''
                document.body.style.top = ''
                document.body.style.left = ''
                document.body.style.width = ''
                document.body.style.height = ''
                document.documentElement.style.overflow = ''
            }
        }
    }, [])

    // Загружаем документ
    useEffect(() => {
        console.log('🚫 BlockScrollViewer: ПОЛНАЯ БЛОКИРОВКА СКРОЛЛА')

        if (editorRef.current && document.html && typeof window !== 'undefined') {
            // ПРИНУДИТЕЛЬНО возвращаемся в начало
            window.scrollTo(0, 0)

            // Устанавливаем HTML
            editorRef.current.innerHTML = document.html

            // ПРИНУДИТЕЛЬНО возвращаемся в начало после загрузки
            setTimeout(() => {
                window.scrollTo(0, 0)
                console.log('🚫 BlockScrollViewer: Загрузка завершена, скролл ПОЛНОСТЬЮ ЗАБЛОКИРОВАН')
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
            console.log('🚫 ПРИНУДИТЕЛЬНЫЙ скролл в начало')
        }
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* ПОЛНАЯ БЛОКИРОВКА toolbar */}
            <div className="sticky top-0 z-50 border-b border-slate-200 p-4 bg-red-300 shadow-xl">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Lock className="w-6 h-6 text-red-800" />
                        <span className="font-bold text-red-900 text-lg">ПОЛНАЯ БЛОКИРОВКА СКРОЛЛА</span>
                        <span className="text-sm text-red-800 font-bold bg-red-400 px-2 py-1 rounded">🚫 ЗАБЛОКИРОВАНО</span>
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={forceScrollToTop}
                            className="flex items-center px-4 py-2 bg-red-800 text-white rounded text-sm hover:bg-red-900 font-bold"
                        >
                            🚫 ПРИНУДИТЕЛЬНО НАВЕРХ
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
                            // ПОЛНОЕ отключение скролла
                            overflow: 'visible',
                            scrollBehavior: 'auto',
                            scrollMargin: '0',
                            scrollPadding: '0'
                        }}
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>
                        🚫 ПОЛНАЯ БЛОКИРОВКА • Скролл ЗАБЛОКИРОВАН • Все события блокированы • Принудительный возврат каждые 100мс
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
