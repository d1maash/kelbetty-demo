'use client'

import { useState } from 'react'

export default function TestImportPage() {
    const [result, setResult] = useState<any>(null)
    const [loading, setLoading] = useState(false)

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setLoading(true)
        try {
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch('/api/test-import', {
                method: 'POST',
                body: formData
            })

            const data = await response.json()
            setResult(data)
        } catch (error) {
            console.error('Ошибка:', error)
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6">Тест импорта документов</h1>

            <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                    Выберите DOCX файл для тестирования:
                </label>
                <input
                    type="file"
                    accept=".docx"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
            </div>

            {loading && (
                <div className="text-blue-600">Загрузка и обработка файла...</div>
            )}

            {result && (
                <div className="space-y-6">
                    <div className="bg-green-50 p-4 rounded-lg">
                        <h2 className="text-lg font-semibold text-green-800 mb-2">Результат импорта</h2>
                        <p><strong>Длина HTML:</strong> {result.length} символов</p>
                        <p><strong>Количество предупреждений:</strong> {result.messages?.length || 0}</p>
                        {result.messages?.length > 0 && (
                            <div className="mt-2">
                                <strong>Предупреждения:</strong>
                                <ul className="list-disc list-inside text-sm">
                                    {result.messages.map((msg: any, i: number) => (
                                        <li key={i}>{msg.message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>

                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Исходный HTML (первые 1000 символов):</h3>
                        <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                            {result.html?.substring(0, 1000)}
                        </pre>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-lg">
                        <h3 className="text-lg font-semibold mb-2">Предварительный просмотр:</h3>
                        <div
                            className="border p-4 bg-white rounded"
                            style={{
                                fontFamily: 'Times New Roman, serif',
                                lineHeight: '1.6'
                            }}
                            dangerouslySetInnerHTML={{
                                __html: result.html?.substring(0, 2000) + (result.html?.length > 2000 ? '...' : '')
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    )
}