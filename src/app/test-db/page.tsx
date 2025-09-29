'use client'

import { useState, useEffect } from 'react'
import ImportDropzone from '@/components/import/ImportDropzone'
import { FileText } from 'lucide-react'

export default function TestDbPage() {
    const [documents, setDocuments] = useState<any[]>([])
    const [loading, setLoading] = useState(false)

    const loadDocuments = async () => {
        setLoading(true)
        try {
            const response = await fetch('/api/test-documents')
            const data = await response.json()
            console.log('Документы из БД:', data)
            setDocuments(data.documents || [])
        } catch (error) {
            console.error('Ошибка загрузки документов:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDocumentLoaded = (loaded: any) => {
        console.log('Документ загружен:', loaded)
        // Перезагружаем список документов
        loadDocuments()
    }

    useEffect(() => {
        loadDocuments()
    }, [])

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-2xl font-bold mb-6">Тест базы данных</h1>

                <div className="grid grid-cols-2 gap-6">
                    {/* Импорт */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <h2 className="text-lg font-semibold mb-4">Импорт документа</h2>
                        <ImportDropzone onLoaded={handleDocumentLoaded} />
                    </div>

                    {/* Список документов */}
                    <div className="bg-white rounded-lg shadow p-4">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-lg font-semibold">Документы в БД</h2>
                            <button
                                onClick={loadDocuments}
                                disabled={loading}
                                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                            >
                                {loading ? 'Загрузка...' : 'Обновить'}
                            </button>
                        </div>

                        <div className="space-y-2">
                            {documents.length === 0 ? (
                                <p className="text-slate-500">Нет документов</p>
                            ) : (
                                documents.map((doc) => (
                                    <div key={doc.id} className="p-3 border border-slate-200 rounded">
                                        <h3 className="font-medium">{doc.title}</h3>
                                        <p className="text-sm text-slate-500">Тип: {doc.type}</p>
                                        <p className="text-sm text-slate-500">Создан: {new Date(doc.createdAt).toLocaleString()}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Отладочная информация */}
                <div className="mt-6 bg-white rounded-lg shadow p-4">
                    <h3 className="text-lg font-semibold mb-2">Отладочная информация</h3>
                    <pre className="text-sm bg-slate-100 p-2 rounded overflow-auto">
                        {JSON.stringify(documents, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    )
}
