'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import ImportDropzone from '@/components/import/ImportDropzone'
import Sidebar from '@/components/sidebar'
import ChatPanel from '@/components/chat/ChatPanel'
import { useDocumentImport } from '@/hooks/useDocumentImport'
import { FileText } from 'lucide-react'
import type { DocumentData } from '@/hooks/useDocumentImport'

// Динамические импорты для предотвращения SSR проблем
const OnlyOfficeEditor = dynamic(() => import('@/components/editor/OnlyOfficeEditor'), { ssr: false })
const FallbackDocx = dynamic(() => import('@/components/editor/FallbackDocx'), { ssr: false })
const FallbackPdf = dynamic(() => import('@/components/editor/FallbackPdf'), { ssr: false })
const ImportedDocumentViewer = dynamic(() => import('@/components/editor/ImportedDocumentViewer'), { ssr: false })
const StyledDocumentViewer = dynamic(() => import('@/components/editor/StyledDocumentViewer'), { ssr: false })

type DocState =
    | { kind: 'none' }
    | { kind: 'onlyoffice'; urlForDs: string; key: string; type: 'docx' | 'pptx' | 'xlsx' | 'pdf'; title: string }
    | { kind: 'fallback-docx'; buf: ArrayBuffer; title: string }
    | { kind: 'fallback-pdf'; buf: ArrayBuffer; title: string }

export default function AppPage() {
    const {
        state,
        currentDocument,
        documents,
        importDocument,
        resetImport,
        clearError,
        updateDocument,
        deleteDocument,
        selectDocument,
        syncDocument
    } = useDocumentImport()


    const [doc, setDoc] = useState<DocState>({ kind: 'none' })
    const [viewMode, setViewMode] = useState<'styled' | 'advanced'>('styled')
    const [isAiProcessing, setIsAiProcessing] = useState(false)
    const [previewHtml, setPreviewHtml] = useState<string | null>(null)

    // Отладочная информация
    console.log('Текущий previewHtml:', previewHtml)
    console.log('Текущий currentDocument.html:', currentDocument?.html)

    const handleDocumentLoaded = (loaded: any) => {
        console.log('Документ загружен:', loaded)

        // Сохраняем документ в БД через старый хук
        if (loaded.mode === 'fallback' && loaded.kind === 'docx') {
            // Создаем File объект для сохранения в БД
            const file = new File([loaded.buf], loaded.title, { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' })
            importDocument(file)
        } else if (loaded.mode === 'fallback' && loaded.kind === 'pdf') {
            const file = new File([loaded.buf], loaded.title, { type: 'application/pdf' })
            importDocument(file)
        }

        if (loaded.mode === 'onlyoffice') {
            console.log('Устанавливаем OnlyOffice редактор')
            setDoc({
                kind: 'onlyoffice',
                urlForDs: loaded.urlForDs,
                key: loaded.fileKey,
                type: loaded.fileType,
                title: loaded.title
            })
        } else if (loaded.mode === 'fallback' && loaded.kind === 'docx') {
            console.log('Устанавливаем fallback DOCX редактор')
            setDoc({ kind: 'fallback-docx', buf: loaded.buf, title: loaded.title })
        } else if (loaded.mode === 'fallback' && loaded.kind === 'pdf') {
            console.log('Устанавливаем fallback PDF редактор')
            setDoc({ kind: 'fallback-pdf', buf: loaded.buf, title: loaded.title })
        }
    }

    const handleFileUpload = async (file: File) => {
        await importDocument(file)
    }

    const handleDocumentSelect = (doc: any) => {
        selectDocument(doc)
    }

    const handleDocumentUpdated = (doc: DocumentData) => {
        syncDocument(doc)
    }


    const handleAcceptChanges = async (suggestion: any) => {
        if (!currentDocument || !suggestion?.suggestion?.patch?.updatedHtml) return

        try {
            await updateDocument(currentDocument.id, { html: suggestion.suggestion.patch.updatedHtml })
            setPreviewHtml(null) // Убираем предварительный просмотр
            console.log('Изменения приняты и сохранены')
        } catch (error) {
            console.error('Ошибка при сохранении изменений:', error)
        }
    }

    const handleRejectChanges = () => {
        setPreviewHtml(null) // Убираем предварительный просмотр
        console.log('Изменения отклонены')
    }

    const handleAiProcessingChange = (isProcessing: boolean) => {
        setIsAiProcessing(isProcessing)
    }

    const handleShowPreview = (suggestion: any) => {
        console.log('Получен suggestion для предварительного просмотра:', suggestion)

        // Проверяем разные возможные структуры данных
        let updatedHtml = null

        if (suggestion?.patch?.updatedHtml) {
            updatedHtml = suggestion.patch.updatedHtml
        } else if (suggestion?.suggestion?.patch?.updatedHtml) {
            updatedHtml = suggestion.suggestion.patch.updatedHtml
        }

        if (updatedHtml) {
            console.log('Устанавливаем предварительный просмотр:', updatedHtml)
            setPreviewHtml(updatedHtml)
        } else {
            console.error('Не удалось найти updatedHtml в suggestion:', suggestion)
        }
    }

    return (
        <div className="grid grid-cols-[300px_1fr_360px] h-[calc(100vh-64px)]">
            {/* Sidebar */}
            <aside className="border-r bg-white h-full overflow-hidden">
                <Sidebar
                    currentDocument={currentDocument}
                    documents={documents}
                    onFileUpload={handleFileUpload}
                    onDocumentSelect={handleDocumentSelect}
                    onDeleteDocument={deleteDocument}
                />
            </aside>

            {/* Main Editor */}
            <main className="border-x overflow-hidden bg-white text-slate-900">
                {doc.kind === 'none' && !currentDocument && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <FileText className="w-16 h-16 mb-4 text-slate-300" />
                        <h3 className="text-xl font-semibold mb-2">Импортируйте документ</h3>
                        <p className="text-center max-w-md text-sm">
                            Загрузите файл DOCX, PPTX, XLSX или PDF для начала работы
                        </p>
                    </div>
                )}

                {/* Показываем импортированный документ */}
                {currentDocument && doc.kind === 'none' && (
                    <>

                        {/* Переключатель режимов */}
                        <div className="sticky top-0 z-20 border-b border-slate-200 p-2 bg-slate-50 shadow-sm">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-slate-600">Режим просмотра:</span>
                                <div className="flex space-x-2">
                                    <button
                                        onClick={() => setViewMode('styled')}
                                        className={`px-3 py-1 text-xs rounded ${viewMode === 'styled'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                            }`}
                                    >
                                        Просмотр
                                    </button>
                                    <button
                                        onClick={() => setViewMode('advanced')}
                                        className={`px-3 py-1 text-xs rounded ${viewMode === 'advanced'
                                            ? 'bg-purple-600 text-white'
                                            : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                                            }`}
                                    >
                                        Продвинутый
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Режим просмотра */}
                        {viewMode === 'styled' && currentDocument.html && (
                            <StyledDocumentViewer
                                document={{
                                    id: currentDocument.id,
                                    title: currentDocument.title,
                                    html: previewHtml || currentDocument.html,
                                    type: currentDocument.type,
                                    createdAt: currentDocument.createdAt || new Date().toISOString(),
                                    updatedAt: currentDocument.updatedAt || new Date().toISOString(),
                                    metadata: currentDocument.metadata
                                }}
                                onSave={async (documentId, html) => {
                                    await updateDocument(documentId, { html })
                                }}
                                onAcceptChanges={handleAcceptChanges}
                                onRejectChanges={handleRejectChanges}
                                isAiProcessing={isAiProcessing}
                                isPreview={!!previewHtml}
                            />
                        )}

                        {/* Продвинутый режим */}
                        {viewMode === 'advanced' && currentDocument.html && (
                            <ImportedDocumentViewer
                                document={{
                                    id: currentDocument.id,
                                    title: currentDocument.title,
                                    html: previewHtml || currentDocument.html,
                                    type: currentDocument.type,
                                    createdAt: currentDocument.createdAt || new Date().toISOString(),
                                    updatedAt: currentDocument.updatedAt || new Date().toISOString(),
                                    metadata: currentDocument.metadata
                                }}
                                onSave={async (documentId, html) => {
                                    await updateDocument(documentId, { html })
                                }}
                                onAcceptChanges={handleAcceptChanges}
                                onRejectChanges={handleRejectChanges}
                                isAiProcessing={isAiProcessing}
                                isPreview={!!previewHtml}
                            />
                        )}
                    </>
                )}

                {/* Показываем обычный документ без HTML */}
                {currentDocument && doc.kind === 'none' && !currentDocument.html && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500">
                        <FileText className="w-16 h-16 mb-4 text-slate-300" />
                        <h3 className="text-xl font-semibold mb-2">Документ: {currentDocument.title}</h3>
                        <p className="text-center max-w-md text-sm">
                            Тип: {currentDocument.type}
                        </p>
                        <p className="text-center max-w-md text-sm mt-2 text-slate-400">
                            Этот документ не содержит HTML контента для просмотра
                        </p>
                    </div>
                )}

                {/* Показываем fallback редакторы */}
                {doc.kind === 'onlyoffice' && (
                    <OnlyOfficeEditor
                        fileUrlForDs={doc.urlForDs}
                        fileType={doc.type}
                        fileKey={doc.key}
                        title={doc.title}
                    />
                )}

                {doc.kind === 'fallback-docx' && (
                    <FallbackDocx arrayBuffer={doc.buf} />
                )}

                {doc.kind === 'fallback-pdf' && (
                    <FallbackPdf arrayBuffer={doc.buf} />
                )}
            </main>

            {/* Chat Panel */}
            <aside className="bg-slate-50 h-full overflow-hidden">
                <ChatPanel
                    currentDocument={currentDocument}
                    onDocumentUpdate={handleDocumentUpdated}
                    onAiProcessingChange={handleAiProcessingChange}
                    onShowPreview={handleShowPreview}
                />
            </aside>
        </div>
    )
}
