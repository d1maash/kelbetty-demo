'use client'

import { useState, useRef } from 'react'
import { FileText, Upload, Plus, Search, MoreVertical, Trash2, Download, AlertCircle, Sparkles } from 'lucide-react'
import { formatFileSize } from '@/lib/utils'
import Link from 'next/link'

interface Document {
    id: string
    type: 'docx' | 'pptx' | 'xlsx' | 'pdf' | null
    title: string
    file?: File
    content?: string
    metadata?: any
    createdAt?: string
    updatedAt?: string
}

interface SidebarProps {
    currentDocument: Document | null
    documents: Document[]
    onFileUpload: (file: File) => void
    onDocumentSelect: (document: Document) => void
    onDeleteDocument: (documentId: string) => void
}

export default function Sidebar({ currentDocument, documents, onFileUpload, onDocumentSelect, onDeleteDocument }: SidebarProps) {
    const [searchQuery, setSearchQuery] = useState('')
    const [uploadError, setUploadError] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const validateFile = (file: File): { valid: boolean; error?: string } => {
        // Проверка размера (максимум 50MB)
        const MAX_SIZE = 50 * 1024 * 1024
        if (file.size > MAX_SIZE) {
            return {
                valid: false,
                error: `Файл слишком большой (${Math.round(file.size / 1024 / 1024)}MB). Максимальный размер: 50MB`
            }
        }

        // Проверка типа файла
        const extension = file.name.split('.').pop()?.toLowerCase()
        const supportedTypes = ['docx', 'pptx', 'xlsx', 'pdf']

        if (!extension || !supportedTypes.includes(extension)) {
            return {
                valid: false,
                error: `Неподдерживаемый формат файла. Поддерживаются: ${supportedTypes.join(', ')}`
            }
        }

        return { valid: true }
    }

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        setUploadError(null)

        // Валидация файла
        const validation = validateFile(file)
        if (!validation.valid) {
            setUploadError(validation.error || 'Ошибка валидации файла')
            return
        }

        try {
            const extension = file.name.split('.').pop()?.toLowerCase()
            let type: 'docx' | 'pptx' | 'xlsx' | 'pdf' | null = null

            switch (extension) {
                case 'docx':
                    type = 'docx'
                    break
                case 'pptx':
                    type = 'pptx'
                    break
                case 'xlsx':
                    type = 'xlsx'
                    break
                case 'pdf':
                    type = 'pdf'
                    break
                default:
                    setUploadError('Неподдерживаемый формат файла')
                    return
            }

            onFileUpload(file)

        } catch (error) {
            console.error('Ошибка при загрузке файла:', error)
            setUploadError('Не удалось загрузить файл. Попробуйте еще раз.')
        }
    }

    const getFileIcon = (type: string | null) => {
        switch (type) {
            case 'docx':
                return '📄'
            case 'pptx':
                return '📊'
            case 'xlsx':
                return '📈'
            case 'pdf':
                return '📕'
            default:
                return '📄'
        }
    }

    const filteredDocuments = documents.filter(doc =>
        doc.title.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCreateNew = () => {
        fileInputRef.current?.click()
    }

    const handleDeleteDocument = (docId: string, event: React.MouseEvent) => {
        event.stopPropagation()
        onDeleteDocument(docId)
    }

    const clearUploadError = () => {
        setUploadError(null)
    }

    return (
        <div className="bg-white border-r border-slate-200 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center space-x-2 mb-4">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <h2 className="font-semibold text-slate-900">Документы</h2>
                </div>

                {/* Action Buttons */}
                <div className="space-y-2 mb-4">
                    <div className="flex space-x-2">
                        <button
                            onClick={handleCreateNew}
                            className="flex-1 flex items-center justify-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                        >
                            <Plus className="w-4 h-4 mr-1" />
                            Создать
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 flex items-center justify-center px-3 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                        >
                            <Upload className="w-4 h-4 mr-1" />
                            Импорт
                        </button>
                    </div>

                    {/* Advanced Import Link */}
                    <Link
                        href="/test-import-advanced"
                        className="flex items-center justify-center px-3 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg text-sm font-medium hover:from-purple-700 hover:to-blue-700 transition-all"
                    >
                        <Sparkles className="w-4 h-4 mr-1" />
                        Тест импорта
                    </Link>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Поиск документов..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>

                {/* Upload Error */}
                {uploadError && (
                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <p className="text-sm text-red-700">{uploadError}</p>
                                <button
                                    onClick={clearUploadError}
                                    className="mt-1 text-xs text-red-600 hover:text-red-800 underline"
                                >
                                    Закрыть
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hidden file input */}
                <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept=".docx,.pptx,.xlsx,.pdf"
                    onChange={handleFileUpload}
                />
            </div>

            {/* Documents List */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100 hover:scrollbar-thumb-slate-400">
                {filteredDocuments.length === 0 ? (
                    <div className="p-4 text-center text-slate-500">
                        {searchQuery ? (
                            <p>Документы не найдены</p>
                        ) : (
                            <div>
                                <FileText className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                                <p className="text-sm mb-2">Пока нет документов</p>
                                <p className="text-xs text-slate-400">
                                    Загрузите первый документ, чтобы начать работу
                                </p>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="p-2">
                        {filteredDocuments.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => onDocumentSelect(doc)}
                                className={`group flex items-center p-3 rounded-lg cursor-pointer transition-colors mb-1 ${currentDocument?.id === doc.id
                                    ? 'bg-blue-50 border border-blue-200'
                                    : 'hover:bg-slate-50'
                                    }`}
                            >
                                <div className="text-2xl mr-3">
                                    {getFileIcon(doc.type)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <h3 className="font-medium text-slate-900 truncate text-sm">
                                        {doc.title}
                                    </h3>
                                    <div className="text-xs text-slate-500 space-y-1">
                                        <p>
                                            {doc.metadata?.fileSize ? formatFileSize(doc.metadata.fileSize) : 'Неизвестный размер'}
                                        </p>
                                        <p>
                                            {doc.type?.toUpperCase()} • {doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('ru-RU') : 'Неизвестная дата'}
                                        </p>
                                        {doc.metadata?.storageKey && (
                                            <p className="text-slate-400">
                                                Импортирован
                                            </p>
                                        )}
                                    </div>
                                </div>

                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                                        className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50">
                <div className="text-xs text-slate-500 text-center">
                    <p>Бесплатный план: {documents.length}/5 документов</p>
                    <button className="text-blue-600 hover:text-blue-700 mt-1">
                        Обновить план
                    </button>
                </div>
            </div>
        </div>
    )
}