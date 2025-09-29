'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { Download, FileText, Save, Edit3, ArrowUp, AlertTriangle, Monitor, Tablet, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

interface ResponsiveDiagnosticViewerProps {
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

export default function ResponsiveDiagnosticViewer({ document, onSave }: ResponsiveDiagnosticViewerProps) {
    const editorRef = useRef<HTMLDivElement>(null)
    const [isEditing, setIsEditing] = useState(false)
    const [hasChanges, setHasChanges] = useState(false)
    const [screenInfo, setScreenInfo] = useState({
        width: 0,
        height: 0,
        deviceType: 'unknown',
        scrollTop: 0,
        documentHeight: 0
    })

    // Отслеживаем информацию об экране
    useEffect(() => {
        if (typeof window === 'undefined') return

        const updateScreenInfo = () => {
            const width = window.innerWidth
            const height = window.innerHeight
            const scrollTop = window.pageYOffset || 0

            let deviceType = 'desktop'
            if (width < 768) {
                deviceType = 'mobile'
            } else if (width < 1024) {
                deviceType = 'tablet'
            }

            setScreenInfo({
                width,
                height,
                deviceType,
                scrollTop,
                documentHeight: document.documentElement?.scrollHeight || 0
            })
        }

        updateScreenInfo()
        window.addEventListener('resize', updateScreenInfo)
        window.addEventListener('scroll', updateScreenInfo)

        return () => {
            window.removeEventListener('resize', updateScreenInfo)
            window.removeEventListener('scroll', updateScreenInfo)
        }
    }, [])

    useEffect(() => {
        console.log('📱 ResponsiveDiagnosticViewer: Загружаем документ:', document.title)
        console.log('📱 Устройство:', screenInfo.deviceType)
        console.log('📱 Размер экрана:', screenInfo.width, 'x', screenInfo.height)

        if (editorRef.current && document.html) {
            editorRef.current.innerHTML = document.html

            // Проверяем высоту документа после загрузки
            setTimeout(() => {
                const documentHeight = editorRef.current?.scrollHeight || 0
                console.log('📱 Высота документа:', documentHeight)
                console.log('📱 Высота экрана:', screenInfo.height)
                console.log('📱 Переполнение:', documentHeight > screenInfo.height ? 'ДА' : 'НЕТ')
            }, 100)
        }
    }, [document.html, document.title, screenInfo.height])

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
            console.log('📱 Принудительный скролл в начало')
        }
    }

    const getDeviceIcon = () => {
        switch (screenInfo.deviceType) {
            case 'mobile':
                return <Smartphone className="w-4 h-4" />
            case 'tablet':
                return <Tablet className="w-4 h-4" />
            default:
                return <Monitor className="w-4 h-4" />
        }
    }

    const getDeviceColor = () => {
        switch (screenInfo.deviceType) {
            case 'mobile':
                return 'bg-green-600'
            case 'tablet':
                return 'bg-blue-600'
            default:
                return 'bg-red-600'
        }
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Диагностический toolbar */}
            <div className="sticky top-0 z-20 border-b border-slate-200 p-4 bg-purple-50 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <AlertTriangle className="w-5 h-5 text-purple-600" />
                        <span className="font-medium text-purple-900">Диагностика адаптивности</span>
                        <div className={`flex items-center px-2 py-1 rounded text-white text-xs ${getDeviceColor()}`}>
                            {getDeviceIcon()}
                            <span className="ml-1">{screenInfo.deviceType.toUpperCase()}</span>
                        </div>
                        {hasChanges && (
                            <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                                Есть изменения
                            </span>
                        )}
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={forceScrollToTop}
                            className="flex items-center px-3 py-1 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
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

                {/* Информация об экране */}
                <div className="mt-2 text-xs text-purple-700">
                    <div>Экран: {screenInfo.width}x{screenInfo.height} | Скролл: {screenInfo.scrollTop}px | Высота документа: {screenInfo.documentHeight}px</div>
                    <div>Переполнение: {screenInfo.documentHeight > screenInfo.height ? 'ДА (проблема!)' : 'НЕТ'} | Устройство: {screenInfo.deviceType}</div>
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
                        📱 Диагностика адаптивности • {screenInfo.deviceType.toUpperCase()} • {screenInfo.width}x{screenInfo.height}
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
