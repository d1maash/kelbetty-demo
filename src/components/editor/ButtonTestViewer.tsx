'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, FileText, Save, Edit3, ArrowUp, AlertTriangle, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'

interface ButtonTestViewerProps {
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

export default function ButtonTestViewer({ document, onSave }: ButtonTestViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [showButtons, setShowButtons] = useState(true)
    const [buttonPosition, setButtonPosition] = useState({ top: 0, left: 0, visible: true })

    // Отслеживаем позицию кнопок
    useEffect(() => {
        const checkButtonPosition = () => {
            if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
                const buttons = document.querySelectorAll('button')
                if (buttons.length > 0) {
                    const firstButton = buttons[0]
                    const rect = firstButton.getBoundingClientRect()
                    setButtonPosition({
                        top: rect.top,
                        left: rect.left,
                        visible: rect.top >= 0 && rect.top <= (typeof window !== 'undefined' ? window.innerHeight : 0)
                    })
                }
            }
        }

        if (typeof window !== 'undefined') {
            checkButtonPosition()
            window.addEventListener('scroll', checkButtonPosition)
            window.addEventListener('resize', checkButtonPosition)

            return () => {
                window.removeEventListener('scroll', checkButtonPosition)
                window.removeEventListener('resize', checkButtonPosition)
            }
        }
    }, [])

    useEffect(() => {
        console.log('🔘 ButtonTestViewer: Загружаем документ:', document.title)

        if (editorRef.current && document.html) {
            editorRef.current.innerHTML = document.html
            console.log('🔘 ButtonTestViewer: Документ загружен')
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
            console.log('🔘 Принудительный скролл в начало')
        }
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Тестовый toolbar с ВЫСОКИМ z-index */}
            <div className="sticky top-0 z-50 border-b border-slate-200 p-4 bg-blue-100 shadow-lg">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-blue-600" />
                        <span className="font-medium text-blue-900">ТЕСТ КНОПОК</span>
                        <span className="text-xs bg-blue-200 text-blue-800 px-2 py-1 rounded">
                            Позиция: {buttonPosition.top}px, {buttonPosition.left}px
                        </span>
                        <span className={`text-xs px-2 py-1 rounded ${buttonPosition.visible
                            ? 'bg-green-200 text-green-800'
                            : 'bg-red-200 text-red-800'
                            }`}>
                            {buttonPosition.visible ? 'ВИДИМЫ' : 'СКРЫТЫ'}
                        </span>
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setShowButtons(!showButtons)}
                            className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                            {showButtons ? <EyeOff className="w-4 h-4 mr-1" /> : <Eye className="w-4 h-4 mr-1" />}
                            {showButtons ? 'Скрыть' : 'Показать'}
                        </button>
                        <button
                            onClick={forceScrollToTop}
                            className="flex items-center px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
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

                {/* Информация о кнопках */}
                <div className="mt-2 text-xs text-blue-700">
                    <div>Z-index: 50 | Sticky: top-0 | Позиция кнопок: {buttonPosition.top}px от верха</div>
                    <div>Видимость: {buttonPosition.visible ? 'ДА' : 'НЕТ'} | Размер окна: {typeof window !== 'undefined' ? window.innerHeight : 0}px</div>
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
                        🔘 ТЕСТ КНОПОК • Z-index: 50 • Sticky: top-0 • Позиция: {buttonPosition.top}px
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
