'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, FileText, Save, Edit3, ArrowUp, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface SimpleDiagnosticViewerProps {
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

export default function SimpleDiagnosticViewer({ document, onSave }: SimpleDiagnosticViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [scrollPosition, setScrollPosition] = useState(0)
    const [isLoading, setIsLoading] = useState(false)

    // Простое отслеживание скролла
    useEffect(() => {
        if (typeof window === 'undefined') return

        const handleScroll = () => {
            const currentScroll = window.pageYOffset || 0
            setScrollPosition(currentScroll)
        }

        window.addEventListener('scroll', handleScroll)
        return () => window.removeEventListener('scroll', handleScroll)
    }, [])

    // Простая загрузка без сложных манипуляций
    useEffect(() => {
        console.log('🔍 SimpleDiagnostic: Загружаем документ:', document.title)

        if (editorRef.current && document.html && typeof window !== 'undefined') {
            setIsLoading(true)

            // Просто устанавливаем HTML без сложных манипуляций
            editorRef.current.innerHTML = document.html

            // Принудительно возвращаемся в начало
            setTimeout(() => {
                window.scrollTo(0, 0)
                setIsLoading(false)
                console.log('🔍 SimpleDiagnostic: Загрузка завершена')
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

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Простой диагностический toolbar */}
            <div className="sticky top-0 z-20 border-b border-slate-200 p-4 bg-red-50 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        <span className="font-medium text-red-900">Простая диагностика</span>
                        {isLoading && (
                            <span className="text-sm text-red-600">⏳ Загрузка...</span>
                        )}
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <div className="text-xs text-gray-600">
                            Скролл: {scrollPosition}px
                        </div>
                        <button
                            onClick={forceScrollToTop}
                            className="flex items-center px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                        >
                            🔝 Наверх
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
                            overflowWrap: 'break-word'
                        }}
                    />
                </div>
            </div>

            {/* Footer Info */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>
                        🔍 Простая диагностика • Позиция скролла: {scrollPosition}px
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
