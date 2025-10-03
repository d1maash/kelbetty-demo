'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function TestFormattingPage() {
    const [isUploading, setIsUploading] = useState(false)
    const [uploadedDocument, setUploadedDocument] = useState<any>(null)

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) return

        if (!file.name.toLowerCase().endsWith('.docx')) {
            toast.error('Пожалуйста, выберите DOCX файл')
            return
        }

        setIsUploading(true)

        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Ошибка импорта')
            }

            const result = await response.json()
            setUploadedDocument(result.document)
            toast.success('Документ успешно импортирован с сохранением форматирования!')
        } catch (error) {
            console.error('Ошибка импорта:', error)
            toast.error(`Ошибка импорта: ${error instanceof Error ? error.message : 'Неизвестная ошибка'}`)
        } finally {
            setIsUploading(false)
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        Тест сохранения форматирования
                    </h1>
                    <p className="text-gray-600 mb-8">
                        Загрузите DOCX файл для проверки сохранения отступов и размеров шрифта
                    </p>

                    {/* Загрузка файла */}
                    <div className="mb-8">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Выберите DOCX файл для тестирования
                        </label>
                        <input
                            type="file"
                            accept=".docx"
                            onChange={handleFileUpload}
                            disabled={isUploading}
                            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50"
                        />
                        {isUploading && (
                            <div className="mt-2 flex items-center text-blue-600">
                                <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mr-2"></div>
                                Импорт документа...
                            </div>
                        )}
                    </div>

                    {/* Отображение импортированного документа */}
                    {uploadedDocument && (
                        <div className="border-t pt-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">
                                Импортированный документ: {uploadedDocument.title}
                            </h2>
                            <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                <p className="text-sm text-gray-600">
                                    <strong>ID:</strong> {uploadedDocument.id}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Тип:</strong> {uploadedDocument.type}
                                </p>
                                <p className="text-sm text-gray-600">
                                    <strong>Создан:</strong> {new Date(uploadedDocument.createdAt).toLocaleString('ru-RU')}
                                </p>
                            </div>

                            {/* HTML контент с сохранением форматирования */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-100 px-4 py-2 border-b border-gray-200">
                                    <h3 className="text-sm font-medium text-gray-700">
                                        Предварительный просмотр (с сохранением форматирования)
                                    </h3>
                                </div>
                                <div
                                    className="formatting-preservation p-8 bg-white"
                                    dangerouslySetInnerHTML={{ __html: uploadedDocument.html }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Инструкции */}
                    <div className="mt-8 bg-blue-50 rounded-lg p-6">
                        <h3 className="text-lg font-semibold text-blue-900 mb-3">
                            Что проверяется:
                        </h3>
                        <ul className="text-blue-800 space-y-2">
                            <li>• <strong>Отступы абзацев</strong> - должны сохраняться точно как в оригинале</li>
                            <li>• <strong>Размеры шрифтов</strong> - должны соответствовать оригиналу</li>
                            <li>• <strong>Отступы первой строки</strong> - должны сохраняться</li>
                            <li>• <strong>Межстрочный интервал</strong> - должен соответствовать оригиналу</li>
                            <li>• <strong>Выравнивание текста</strong> - должно сохраняться</li>
                            <li>• <strong>Цвета и форматирование</strong> - должны сохраняться</li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    )
}
