'use client'

import { useState } from 'react'
import LibreOfficeDocumentViewer from '@/components/editor/LibreOfficeDocumentViewer'
import { toast } from 'sonner'
import { Loader2, FileText, Settings, Download } from 'lucide-react'

interface DocumentData {
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

export default function TestLibreOfficePage() {
    const [document, setDocument] = useState<DocumentData | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [importMethod, setImportMethod] = useState<'libreoffice' | 'mammoth'>('libreoffice')

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0]
        if (!file) {
            return
        }

        setIsLoading(true)
        setError(null)
        setDocument(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const response = await fetch('/api/import', {
                method: 'POST',
                body: formData,
            })

            if (!response.ok) {
                const errorData = await response.json()
                throw new Error(errorData.error || 'Ошибка импорта документа')
            }

            const result = await response.json()
            setDocument(result.document)
            setImportMethod(result.method || 'unknown')
            toast.success(`Документ успешно импортирован через ${result.method || 'LibreOffice'}!`)
        } catch (err: any) {
            console.error('Ошибка при импорте:', err)
            setError(err.message || 'Неизвестная ошибка при импорте.')
            toast.error(`Ошибка импорта: ${err.message}`)
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <header className="bg-white shadow-sm p-4 border-b border-gray-200">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold text-gray-900">Тест LibreOffice интеграции</h1>
                        <div className="flex items-center space-x-2">
                            <Settings className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-600">Метод конвертации:</span>
                            <span className={`px-2 py-1 text-xs rounded ${importMethod === 'libreoffice'
                                    ? 'bg-green-100 text-green-800'
                                    : 'bg-blue-100 text-blue-800'
                                }`}>
                                {importMethod === 'libreoffice' ? 'LibreOffice' : 'Mammoth Fallback'}
                            </span>
                        </div>
                    </div>
                    <input
                        type="file"
                        accept=".docx,.rtf"
                        onChange={handleFileChange}
                        className="block w-full text-sm text-gray-500
                        file:mr-4 file:py-2 file:px-4
                        file:rounded-full file:border-0
                        file:text-sm file:font-semibold
                        file:bg-blue-50 file:text-blue-700
                        hover:file:bg-blue-100 cursor-pointer"
                        disabled={isLoading}
                    />
                </div>
            </header>

            <main className="flex-1 overflow-hidden p-4">
                <div className="max-w-7xl mx-auto h-full bg-white rounded-lg shadow-md overflow-hidden">
                    {isLoading && (
                        <div className="flex items-center justify-center h-full flex-col gap-4 text-gray-600">
                            <Loader2 className="w-10 h-10 animate-spin text-blue-500" />
                            <p className="text-lg">Импорт документа через LibreOffice...</p>
                            <p className="text-sm text-gray-500">Это может занять до 30 секунд для больших файлов</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex items-center justify-center h-full flex-col gap-4 text-red-600">
                            <FileText className="w-10 h-10" />
                            <p className="text-lg font-medium">Ошибка:</p>
                            <p className="text-center max-w-md">{error}</p>
                            <button
                                onClick={() => {
                                    setError(null)
                                    setDocument(null)
                                }}
                                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                            >
                                Попробовать снова
                            </button>
                        </div>
                    )}

                    {document && !isLoading && !error && (
                        <LibreOfficeDocumentViewer
                            document={document}
                            isPreview={false}
                        />
                    )}

                    {!document && !isLoading && !error && (
                        <div className="flex items-center justify-center h-full flex-col gap-4 text-gray-500">
                            <FileText className="w-10 h-10" />
                            <p className="text-lg">Загрузите DOCX или RTF файл для тестирования LibreOffice</p>
                            <div className="text-sm text-center max-w-md">
                                <p className="mb-2">Поддерживаемые форматы:</p>
                                <ul className="space-y-1">
                                    <li>• DOCX (Word документы)</li>
                                    <li>• RTF (Rich Text Format)</li>
                                </ul>
                                <p className="mt-4 text-xs text-gray-400">
                                    LibreOffice обеспечивает максимальное сохранение форматирования
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <footer className="bg-white border-t border-gray-200 p-4">
                <div className="max-w-7xl mx-auto text-center text-sm text-gray-500">
                    <p>LibreOffice интеграция с iframe изоляцией для максимальной точности отображения</p>
                </div>
            </footer>
        </div>
    )
}
