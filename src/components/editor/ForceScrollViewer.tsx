'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, FileText, Save, Edit3, ArrowUp, AlertTriangle, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface ForceScrollViewerProps {
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

export default function ForceScrollViewer({ document, onSave }: ForceScrollViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [isLocked, setIsLocked] = useState(false)
    const [scrollPosition, setScrollPosition] = useState(0)

    // ПРИНУДИТЕЛЬНО блокируем скролл
    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleScroll = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()

            // Принудительно возвращаемся в начало
            window.scrollTo(0, 0)
            setScrollPosition(0)
        }

        const handleWheel = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
        }

        const handleTouchMove = (e: Event) => {
            e.preventDefault()
            e.stopPropagation()
        }

        // Блокируем ВСЕ возможные события скролла
        window.addEventListener('scroll', handleScroll, { passive: false })
        window.addEventListener('wheel', handleWheel, { passive: false })
        window.addEventListener('touchmove', handleTouchMove, { passive: false })

        // Используем глобальный document
        if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
            document.addEventListener('scroll', handleScroll, { passive: false })
            document.addEventListener('wheel', handleWheel, { passive: false })
            document.addEventListener('touchmove', handleTouchMove, { passive: false })
        }

        return () => {
            window.removeEventListener('scroll', handleScroll)
            window.removeEventListener('wheel', handleWheel)
            window.removeEventListener('touchmove', handleTouchMove)

            if (typeof document !== 'undefined' && typeof document.removeEventListener === 'function') {
                document.removeEventListener('scroll', handleScroll)
                document.removeEventListener('wheel', handleWheel)
                document.removeEventListener('touchmove', handleTouchMove)
            }
        }
    }, [])

    // ПРИНУДИТЕЛЬНО загружаем документ без скролла
    useEffect(() => {
        console.log('🔒 ForceScrollViewer: ПРИНУДИТЕЛЬНАЯ загрузка документа')

        if (editorRef.current && document.html && typeof window !== 'undefined') {
            setIsLocked(true)

            // ПРИНУДИТЕЛЬНО блокируем скролл
            if (typeof document !== 'undefined' && document.body && document.documentElement) {
                document.body.style.overflow = 'hidden'
                document.documentElement.style.overflow = 'hidden'
                document.body.style.position = 'fixed'
                document.body.style.top = '0'
                document.body.style.left = '0'
                document.body.style.width = '100%'
                document.body.style.height = '100%'
            }

            // ПРИНУДИТЕЛЬНО возвращаемся в начало
            window.scrollTo(0, 0)

            // Устанавливаем HTML
            editorRef.current.innerHTML = document.html

            // ПРИНУДИТЕЛЬНО возвращаемся в начало после загрузки
            setTimeout(() => {
                window.scrollTo(0, 0)
                setScrollPosition(0)
                setIsLocked(false)
                console.log('🔒 ForceScrollViewer: Загрузка завершена, скролл заблокирован')
            }, 200)
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
            setScrollPosition(0)
            console.log('🔒 ПРИНУДИТЕЛЬНЫЙ скролл в начало')
        }
    }

    const unlockScroll = () => {
        if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.body && document.documentElement) {
            document.body.style.overflow = ''
            document.documentElement.style.overflow = ''
            document.body.style.position = ''
            document.body.style.top = ''
            document.body.style.left = ''
            document.body.style.width = ''
            document.body.style.height = ''
            console.log('🔓 Скролл разблокирован')
        }
    }

    const lockScroll = () => {
        if (typeof window !== 'undefined' && typeof document !== 'undefined' && document.body && document.documentElement) {
            document.body.style.overflow = 'hidden'
            document.documentElement.style.overflow = 'hidden'
            document.body.style.position = 'fixed'
            document.body.style.top = '0'
            document.body.style.left = '0'
            document.body.style.width = '100%'
            document.body.style.height = '100%'
            window.scrollTo(0, 0)
            setScrollPosition(0)
            console.log('🔒 Скролл заблокирован')
        }
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* ПРИНУДИТЕЛЬНЫЙ toolbar */}
            <div className="sticky top-0 z-30 border-b border-slate-200 p-4 bg-red-100 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <Lock className="w-5 h-5 text-red-600" />
                        <span className="font-bold text-red-900">ПРИНУДИТЕЛЬНЫЙ КОНТРОЛЬ СКРОЛЛА</span>
                        {isLocked && (
                            <span className="text-sm text-red-600 font-bold">🔒 ЗАБЛОКИРОВАНО</span>
                        )}
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-600">
                            Позиция: {scrollPosition}px
                        </div>
                        <button
                            onClick={forceScrollToTop}
                            className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 font-bold"
                        >
                            🔝 ПРИНУДИТЕЛЬНО НАВЕРХ
                        </button>
                        <button
                            onClick={lockScroll}
                            className="flex items-center px-3 py-1 bg-red-800 text-white rounded text-sm hover:bg-red-900"
                        >
                            🔒 Заблокировать
                        </button>
                        <button
                            onClick={unlockScroll}
                            className="flex items-center px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                        >
                            🔓 Разблокировать
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
                            // ПРИНУДИТЕЛЬНО отключаем скролл
                            overflow: 'visible',
                            scrollBehavior: 'auto'
                        }}
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>
                        🔒 ПРИНУДИТЕЛЬНЫЙ КОНТРОЛЬ • Позиция: {scrollPosition}px • Скролл заблокирован
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
