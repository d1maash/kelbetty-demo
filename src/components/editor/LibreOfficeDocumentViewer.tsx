'use client'

import { useEffect, useRef, useState } from 'react'
import { FileText, Download, Loader2, AlertCircle, Settings } from 'lucide-react'

interface LibreOfficeDocumentViewerProps {
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

export default function LibreOfficeDocumentViewer({
    document,
    onSave,
    onAcceptChanges,
    onRejectChanges,
    isAiProcessing = false,
    isPreview = false
}: LibreOfficeDocumentViewerProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [isReady, setIsReady] = useState(false)

    // Создаем полный HTML документ для iframe с максимальным сохранением форматирования
    const createIframeContent = (html: string) => {
        return `
<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${document.title}</title>
    
    <!-- Базовые стили для точного отображения -->
    <style>
        * {
            box-sizing: border-box;
        }
        
        body {
            margin: 0;
            padding: 20px;
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #333;
            background: white;
        }
        
        /* КРИТИЧНО: Inline стили имеют максимальный приоритет */
        *[style] {
            /* Inline стили не должны переопределяться */
        }
        
        /* Базовые стили только для элементов БЕЗ inline стилей */
        p:not([style]) {
            margin: 0 0 16px 0;
            line-height: 1.6;
        }
        
        h1:not([style]) {
            font-size: 28px;
            font-weight: bold;
            margin: 24px 0 12px 0;
            color: #1e293b;
        }
        
        h2:not([style]) {
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            color: #1e293b;
        }
        
        h3:not([style]) {
            font-size: 20px;
            font-weight: bold;
            margin: 16px 0 8px 0;
            color: #1e293b;
        }
        
        h4:not([style]) {
            font-size: 18px;
            font-weight: bold;
            margin: 14px 0 6px 0;
            color: #1e293b;
        }
        
        h5:not([style]) {
            font-size: 16px;
            font-weight: bold;
            margin: 12px 0 4px 0;
            color: #1e293b;
        }
        
        h6:not([style]) {
            font-size: 14px;
            font-weight: bold;
            margin: 10px 0 4px 0;
            color: #1e293b;
        }
        
        ul:not([style]), ol:not([style]) {
            margin: 16px 0;
            padding-left: 24px;
        }
        
        li:not([style]) {
            margin-bottom: 8px;
            line-height: 1.6;
        }
        
        table:not([style]) {
            border-collapse: collapse;
            width: 100%;
            margin: 20px 0;
            border: 1px solid #e2e8f0;
        }
        
        th:not([style]), td:not([style]) {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
            vertical-align: top;
        }
        
        th:not([style]) {
            background-color: #f8fafc;
            font-weight: bold;
        }
        
        img {
            max-width: 100%;
            height: auto;
            margin: 16px 0;
            display: block;
        }
        
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
        
        blockquote {
            margin: 20px 0;
            padding-left: 20px;
            border-left: 4px solid #e2e8f0;
            font-style: italic;
            color: #64748b;
        }
        
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
        
        /* Специальные стили для Word документов */
        .MsoNormal {
            margin: 0;
            line-height: 1.6;
        }
        
        .MsoListParagraph {
            margin: 0;
            text-indent: 0;
        }
        
        .MsoTableGrid {
            border-collapse: collapse;
            width: 100%;
        }
        
        .MsoTableGrid td,
        .MsoTableGrid th {
            border: 1px solid #000;
            padding: 4px 8px;
        }
        
        /* Стили для заголовков Word */
        .MsoHeading1 {
            font-size: 28px;
            font-weight: bold;
            margin: 24px 0 12px 0;
            color: #1e293b;
        }
        
        .MsoHeading2 {
            font-size: 24px;
            font-weight: bold;
            margin: 20px 0 10px 0;
            color: #1e293b;
        }
        
        .MsoHeading3 {
            font-size: 20px;
            font-weight: bold;
            margin: 16px 0 8px 0;
            color: #1e293b;
        }
        
        /* Стили для списков Word */
        .MsoListBullet {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        .MsoListNumber {
            margin: 8px 0;
            padding-left: 20px;
        }
        
        /* Стили для отступов Word */
        .MsoIndent1 { margin-left: 24px; }
        .MsoIndent2 { margin-left: 48px; }
        .MsoIndent3 { margin-left: 72px; }
        .MsoIndent4 { margin-left: 96px; }
        
        /* Стили для выравнивания Word */
        .MsoAlignLeft { text-align: left; }
        .MsoAlignCenter { text-align: center; }
        .MsoAlignRight { text-align: right; }
        .MsoAlignJustify { text-align: justify; }
        
        /* Стили для размеров шрифтов Word */
        .MsoFontSize8 { font-size: 8px; }
        .MsoFontSize9 { font-size: 9px; }
        .MsoFontSize10 { font-size: 10px; }
        .MsoFontSize11 { font-size: 11px; }
        .MsoFontSize12 { font-size: 12px; }
        .MsoFontSize14 { font-size: 14px; }
        .MsoFontSize16 { font-size: 16px; }
        .MsoFontSize18 { font-size: 18px; }
        .MsoFontSize20 { font-size: 20px; }
        .MsoFontSize22 { font-size: 22px; }
        .MsoFontSize24 { font-size: 24px; }
        .MsoFontSize26 { font-size: 26px; }
        .MsoFontSize28 { font-size: 28px; }
        .MsoFontSize30 { font-size: 30px; }
        .MsoFontSize32 { font-size: 32px; }
        .MsoFontSize34 { font-size: 34px; }
        .MsoFontSize36 { font-size: 36px; }
        
        /* Стили для цветов Word */
        .MsoColorRed { color: #dc2626; }
        .MsoColorBlue { color: #2563eb; }
        .MsoColorGreen { color: #16a34a; }
        .MsoColorYellow { color: #ca8a04; }
        .MsoColorPurple { color: #9333ea; }
        .MsoColorOrange { color: #ea580c; }
        .MsoColorPink { color: #ec4899; }
        .MsoColorGray { color: #6b7280; }
        .MsoColorBlack { color: #000000; }
        
        /* Стили для форматирования Word */
        .MsoBold { font-weight: bold; }
        .MsoItalic { font-style: italic; }
        .MsoUnderline { text-decoration: underline; }
        .MsoStrike { text-decoration: line-through; }
        
        /* Стили для отступов абзацев Word */
        .MsoParaSpacing0 { margin-bottom: 0; }
        .MsoParaSpacing6 { margin-bottom: 6px; }
        .MsoParaSpacing12 { margin-bottom: 12px; }
        .MsoParaSpacing18 { margin-bottom: 18px; }
        .MsoParaSpacing24 { margin-bottom: 24px; }
        
        /* Стили для межстрочного интервала Word */
        .MsoLineHeight100 { line-height: 1.0; }
        .MsoLineHeight115 { line-height: 1.15; }
        .MsoLineHeight150 { line-height: 1.5; }
        .MsoLineHeight200 { line-height: 2.0; }
    </style>
</head>
<body>
    ${html}
</body>
</html>
        `
    }

    useEffect(() => {
        if (!document.html) return

        setIsLoading(true)
        setError(null)

        try {
            const iframe = iframeRef.current
            if (!iframe) return

            const content = createIframeContent(document.html)

            // Устанавливаем содержимое iframe
            iframe.srcdoc = content

            // Обработчики событий
            const handleLoad = () => {
                setIsLoading(false)
                setIsReady(true)
            }

            const handleError = () => {
                const errorMsg = 'Ошибка загрузки документа в iframe'
                setError(errorMsg)
                setIsLoading(false)
            }

            iframe.addEventListener('load', handleLoad)
            iframe.addEventListener('error', handleError)

            return () => {
                iframe.removeEventListener('load', handleLoad)
                iframe.removeEventListener('error', handleError)
            }
        } catch (err) {
            const errorMsg = `Ошибка создания iframe: ${err instanceof Error ? err.message : 'Неизвестная ошибка'}`
            setError(errorMsg)
            setIsLoading(false)
        }
    }, [document.html, document.title])

    const handleDownload = () => {
        if (!document.html) return

        const blob = new Blob([document.html], { type: 'text/html' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${document.title}.html`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
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
                            (LibreOffice + iframe изоляция)
                        </span>
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
                        <button
                            onClick={handleDownload}
                            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            Скачать HTML
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 relative">
                {error && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-4">
                            <div className="flex items-center gap-2 text-red-800 mb-2">
                                <AlertCircle className="w-5 h-5" />
                                <span className="font-medium">Ошибка загрузки</span>
                            </div>
                            <p className="text-red-700 text-sm">{error}</p>
                        </div>
                    </div>
                )}

                {isLoading && (
                    <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-md mx-4">
                            <div className="flex items-center gap-2 text-blue-800 mb-2">
                                <Loader2 className="w-5 h-5 animate-spin" />
                                <span className="font-medium">Загрузка документа...</span>
                            </div>
                            <p className="text-blue-700 text-sm">
                                Обрабатываем документ для максимально точного отображения
                            </p>
                        </div>
                    </div>
                )}

                <iframe
                    ref={iframeRef}
                    className="w-full h-full border-0"
                    title={document.title}
                    sandbox="allow-same-origin"
                />
            </div>

            {/* Footer */}
            <div className="border-t border-slate-200 p-3 bg-slate-50">
                <div className="flex items-center justify-between text-xs text-slate-500">
                    <p>
                        💡 Документ отображается в изолированном iframe для максимальной точности
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
