'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, MessageSquare, Plus } from 'lucide-react'

interface Annotation {
    id: string
    page: number
    x: number
    y: number
    width: number
    height: number
    text: string
    color: string
}

interface PdfViewerProps {
    file: File
}

export default function PdfViewer({ file }: PdfViewerProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [numPages, setNumPages] = useState(0)
    const [currentPage, setCurrentPage] = useState(1)
    const [scale, setScale] = useState(1.5)
    const [annotations, setAnnotations] = useState<Annotation[]>([])
    const [isAddingAnnotation, setIsAddingAnnotation] = useState(false)
    const [newAnnotationText, setNewAnnotationText] = useState('')

    useEffect(() => {
        if (!file) return

        const loadPdf = async () => {
            setIsLoading(true)
            setError(null)

            try {
                // Для демо создаем фиктивный PDF просмотрщик
                // В реальном приложении здесь был бы рендеринг через pdf.js

                // Симуляция загрузки PDF
                await new Promise(resolve => setTimeout(resolve, 1500))

                // Фиктивные данные
                setNumPages(3)
                setCurrentPage(1)

                // Рисуем демо-страницу
                if (canvasRef.current) {
                    const canvas = canvasRef.current
                    const ctx = canvas.getContext('2d')
                    if (ctx) {
                        canvas.width = 600 * scale
                        canvas.height = 800 * scale

                        // Фон страницы
                        ctx.fillStyle = '#ffffff'
                        ctx.fillRect(0, 0, canvas.width, canvas.height)

                        // Заголовок
                        ctx.fillStyle = '#1e293b'
                        ctx.font = `bold ${32 * scale}px Arial`
                        ctx.fillText('Демо PDF документ', 50 * scale, 100 * scale)

                        // Подзаголовок
                        ctx.font = `${20 * scale}px Arial`
                        ctx.fillStyle = '#64748b'
                        ctx.fillText('Kelbetty PDF Viewer', 50 * scale, 140 * scale)

                        // Основной текст
                        ctx.font = `${16 * scale}px Arial`
                        ctx.fillStyle = '#334155'
                        const lines = [
                            'Это демонстрация просмотра PDF файлов в Kelbetty.',
                            '',
                            'Возможности:',
                            '• Просмотр страниц',
                            '• Масштабирование',
                            '• Добавление аннотаций',
                            '• Экспорт с аннотациями',
                            '',
                            'В реальной версии используется pdf.js для',
                            'полноценного рендеринга PDF документов.',
                            '',
                            'Вы можете добавить аннотацию, кликнув на',
                            'кнопку "+" в панели инструментов.'
                        ]

                        lines.forEach((line, index) => {
                            ctx.fillText(line, 50 * scale, (200 + index * 25) * scale)
                        })

                        // Рамка
                        ctx.strokeStyle = '#e2e8f0'
                        ctx.lineWidth = 2
                        ctx.strokeRect(0, 0, canvas.width, canvas.height)
                    }
                }

                setIsLoading(false)
            } catch (err) {
                console.error('Ошибка при загрузке PDF:', err)
                setError('Не удалось загрузить PDF. Проверьте, что файл не поврежден.')
                setIsLoading(false)
            }
        }

        loadPdf()
    }, [file, scale, currentPage])

    const handleZoomIn = () => {
        setScale(prev => Math.min(prev + 0.25, 3))
    }

    const handleZoomOut = () => {
        setScale(prev => Math.max(prev - 0.25, 0.5))
    }

    const handlePrevPage = () => {
        setCurrentPage(prev => Math.max(prev - 1, 1))
    }

    const handleNextPage = () => {
        setCurrentPage(prev => Math.min(prev + 1, numPages))
    }

    const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
        if (!isAddingAnnotation || !canvasRef.current) return

        const canvas = canvasRef.current
        const rect = canvas.getBoundingClientRect()
        const x = (event.clientX - rect.left) / rect.width * canvas.width
        const y = (event.clientY - rect.top) / rect.height * canvas.height

        if (newAnnotationText.trim()) {
            const newAnnotation: Annotation = {
                id: Date.now().toString(),
                page: currentPage,
                x: x / scale,
                y: y / scale,
                width: 200,
                height: 50,
                text: newAnnotationText,
                color: '#fef3c7'
            }

            setAnnotations(prev => [...prev, newAnnotation])
            setNewAnnotationText('')
            setIsAddingAnnotation(false)
        }
    }

    const handleExport = async () => {
        try {
            // В реальном приложении здесь был бы экспорт через pdf-lib
            const demoContent = JSON.stringify({ annotations, metadata: { pages: numPages } }, null, 2)
            const blob = new Blob([demoContent], { type: 'application/json' })

            const url = URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = file.name.replace(/\.[^/.]+$/, '') + '_annotated.json'
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            URL.revokeObjectURL(url)

            alert('В реальной версии здесь будет создан PDF с аннотациями')
        } catch (error) {
            console.error('Ошибка при экспорте:', error)
            alert('Не удалось экспортировать PDF')
        }
    }

    const removeAnnotation = (id: string) => {
        setAnnotations(prev => prev.filter(ann => ann.id !== id))
    }

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
                    <p className="text-slate-600">Загружаем PDF...</p>
                    <p className="text-sm text-slate-500 mt-1">Подготавливаем страницы для просмотра</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="h-full flex items-center justify-center bg-white">
                <div className="text-center max-w-md">
                    <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-slate-900 mb-2">Ошибка загрузки</h3>
                    <p className="text-slate-600 mb-4">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Попробовать снова
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-white">
            {/* Toolbar */}
            <div className="border-b border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            <span className="font-medium text-slate-900">{file.name}</span>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handlePrevPage}
                                disabled={currentPage <= 1}
                                className="p-2 rounded hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft className="w-4 h-4" />
                            </button>

                            <span className="text-sm text-slate-600 px-2">
                                {currentPage} / {numPages}
                            </span>

                            <button
                                onClick={handleNextPage}
                                disabled={currentPage >= numPages}
                                className="p-2 rounded hover:bg-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={handleZoomOut}
                                className="p-2 rounded hover:bg-slate-200 transition-colors"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>

                            <span className="text-sm text-slate-600 px-2 min-w-16 text-center">
                                {Math.round(scale * 100)}%
                            </span>

                            <button
                                onClick={handleZoomIn}
                                className="p-2 rounded hover:bg-slate-200 transition-colors"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center space-x-2">
                        <button
                            onClick={() => setIsAddingAnnotation(!isAddingAnnotation)}
                            className={`flex items-center px-3 py-2 rounded-lg transition-colors ${isAddingAnnotation
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                }`}
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Аннотация
                        </button>

                        <button
                            onClick={handleExport}
                            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Скачать PDF
                        </button>
                    </div>
                </div>

                {isAddingAnnotation && (
                    <div className="mt-4 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div className="flex items-center space-x-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">Добавление аннотации</span>
                        </div>
                        <input
                            type="text"
                            value={newAnnotationText}
                            onChange={(e) => setNewAnnotationText(e.target.value)}
                            placeholder="Введите текст аннотации..."
                            className="w-full p-2 border border-yellow-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-yellow-500"
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && newAnnotationText.trim()) {
                                    // Добавляем аннотацию в центр страницы
                                    const newAnnotation: Annotation = {
                                        id: Date.now().toString(),
                                        page: currentPage,
                                        x: 300,
                                        y: 400,
                                        width: 200,
                                        height: 50,
                                        text: newAnnotationText,
                                        color: '#fef3c7'
                                    }
                                    setAnnotations(prev => [...prev, newAnnotation])
                                    setNewAnnotationText('')
                                    setIsAddingAnnotation(false)
                                }
                            }}
                        />
                        <p className="text-xs text-yellow-600 mt-1">
                            Введите текст и нажмите Enter, или кликните на документ
                        </p>
                    </div>
                )}
            </div>

            {/* PDF Content */}
            <div className="flex-1 overflow-auto bg-slate-100 p-8">
                <div className="max-w-4xl mx-auto">
                    <div
                        ref={containerRef}
                        className="relative bg-white shadow-lg rounded-lg overflow-hidden"
                        style={{ width: 'fit-content', margin: '0 auto' }}
                    >
                        <canvas
                            ref={canvasRef}
                            onClick={handleCanvasClick}
                            className={`block ${isAddingAnnotation ? 'cursor-crosshair' : 'cursor-default'}`}
                            style={{
                                width: `${600 * scale}px`,
                                height: `${800 * scale}px`,
                                maxWidth: '100%'
                            }}
                        />

                        {/* Аннотации */}
                        {annotations
                            .filter(ann => ann.page === currentPage)
                            .map(annotation => (
                                <div
                                    key={annotation.id}
                                    className="pdf-annotation group"
                                    style={{
                                        left: `${annotation.x * scale}px`,
                                        top: `${annotation.y * scale}px`,
                                        width: `${annotation.width * scale}px`,
                                        minHeight: `${annotation.height * scale}px`,
                                        backgroundColor: annotation.color,
                                    }}
                                >
                                    <div className="p-2 text-sm text-slate-800">
                                        {annotation.text}
                                    </div>
                                    <button
                                        onClick={() => removeAnnotation(annotation.id)}
                                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                    >
                                        ×
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            </div>

            {/* Annotations List */}
            {annotations.length > 0 && (
                <div className="border-t border-slate-200 p-4 bg-slate-50 max-h-32 overflow-y-auto">
                    <h4 className="text-sm font-medium text-slate-900 mb-2">
                        Аннотации ({annotations.length})
                    </h4>
                    <div className="space-y-1">
                        {annotations.map(annotation => (
                            <div key={annotation.id} className="flex items-center justify-between text-sm">
                                <span className="text-slate-600 truncate">
                                    Стр. {annotation.page}: {annotation.text}
                                </span>
                                <button
                                    onClick={() => removeAnnotation(annotation.id)}
                                    className="text-red-500 hover:text-red-700 ml-2"
                                >
                                    Удалить
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Footer Info */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <p className="text-xs text-slate-500 text-center">
                    💡 Это демо PDF просмотрщика. В реальной версии используется pdf.js для полной поддержки PDF.
                </p>
            </div>
        </div>
    )
}