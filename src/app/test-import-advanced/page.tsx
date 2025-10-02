'use client'

import { useState } from 'react'
import ImportDropzone from '@/components/import/ImportDropzone'
import ImportedDocxEditor from '@/components/editor/ImportedDocxEditor'
import { FileText, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface ImportResult {
    success: boolean
    document?: {
        id: string
        title: string
        type: string
        html: string
        createdAt: string
        updatedAt: string
    }
    warnings?: any[]
    error?: string
}

export default function TestImportAdvancedPage() {
    const [importResult, setImportResult] = useState<ImportResult | null>(null)
    const [isEditing, setIsEditing] = useState(false)

    const handleImportSuccess = (result: ImportResult) => {
        setImportResult(result)
        setIsEditing(true)
    }

    const handleSave = async (documentId: string, html: string) => {
        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    content: html
                })
            })

            if (!response.ok) {
                throw new Error('Ошибка сохранения')
            }
        } catch (error) {
            console.error('Ошибка сохранения:', error)
            throw error
        }
    }

    const handleBackToImport = () => {
        setImportResult(null)
        setIsEditing(false)
    }

    return (
        <div className="min-h-screen bg-slate-50">
            {/* Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <Link
                                href="/app"
                                className="flex items-center text-slate-600 hover:text-slate-900 transition-colors"
                            >
                                <ArrowLeft className="w-5 h-5 mr-2" />
                                Назад к приложению
                            </Link>
                            <div className="h-6 w-px bg-slate-300" />
                            <div className="flex items-center space-x-2">
                                <FileText className="w-6 h-6 text-blue-600" />
                                <h1 className="text-xl font-semibold text-slate-900">
                                    Импорт с сохранением стилей
                                </h1>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {!isEditing ? (
                    <div className="space-y-8">
                        {/* Info Section */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                            <h2 className="text-lg font-semibold text-blue-900 mb-3">
                                🎯 Продвинутый импорт документов
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <h3 className="font-medium text-blue-800 mb-2">Что сохраняется:</h3>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Все заголовки и их стили</li>
                                        <li>• Шрифты, размеры и цвета текста</li>
                                        <li>• Жирный, курсив, подчеркивание</li>
                                        <li>• Таблицы с границами и стилями</li>
                                        <li>• Списки и отступы</li>
                                        <li>• Изображения и их позиционирование</li>
                                    </ul>
                                </div>
                                <div>
                                    <h3 className="font-medium text-blue-800 mb-2">Возможности:</h3>
                                    <ul className="text-sm text-blue-700 space-y-1">
                                        <li>• Полное редактирование текста</li>
                                        <li>• Сохранение изменений в БД</li>
                                        <li>• Экспорт в HTML с стилями</li>
                                        <li>• ИИ-редактирование через чат</li>
                                        <li>• Версионность документов</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Import Component */}
                        <ImportDropzone
                            onImportSuccess={handleImportSuccess}
                            onLoaded={(loaded) => {
                                if (loaded.mode === 'advanced' && loaded.document) {
                                    handleImportSuccess({
                                        success: true,
                                        document: loaded.document,
                                        warnings: loaded.warnings
                                    })
                                }
                            }}
                        />

                        {/* Instructions */}
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-6">
                            <h3 className="font-semibold text-slate-900 mb-3">Инструкции по тестированию:</h3>
                            <ol className="text-sm text-slate-700 space-y-2 list-decimal list-inside">
                                <li>Создайте DOCX файл в Microsoft Word с различными стилями (заголовки, списки, таблицы, форматирование)</li>
                                <li>Загрузите файл через форму выше</li>
                                <li>Проверьте, что все стили сохранились в редакторе</li>
                                <li>Отредактируйте текст и сохраните изменения</li>
                                <li>Экспортируйте документ в HTML для проверки</li>
                            </ol>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Back Button */}
                        <button
                            onClick={handleBackToImport}
                            className="flex items-center px-4 py-2 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            <ArrowLeft className="w-4 h-4 mr-2" />
                            Назад к импорту
                        </button>

                        {/* Editor */}
                        {importResult?.document && (
                            <div className="h-[calc(100vh-200px)]">
                                <ImportedDocxEditor
                                    document={importResult.document}
                                    onSave={handleSave}
                                />
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
