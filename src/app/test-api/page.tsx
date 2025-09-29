'use client'

import { useState } from 'react'

export default function TestApiPage() {
    const [status, setStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle')
    const [result, setResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const testApi = async () => {
        setStatus('testing')
        setError(null)
        setResult(null)

        try {
            console.log('Тестируем API импорта...')

            const response = await fetch('/api/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ test: true })
            })

            console.log('Статус ответа:', response.status)

            const data = await response.json()
            console.log('Данные ответа:', data)

            if (response.ok) {
                setStatus('success')
                setResult(data)
            } else {
                setStatus('error')
                setError(data.error || 'Неизвестная ошибка')
            }
        } catch (err: any) {
            console.error('Ошибка тестирования:', err)
            setStatus('error')
            setError(err.message || 'Ошибка сети')
        }
    }

    return (
        <div className="min-h-screen bg-slate-50 p-8">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold text-slate-900 mb-6">
                    Тестирование API импорта
                </h1>

                <div className="bg-white rounded-lg shadow p-6">
                    <button
                        onClick={testApi}
                        disabled={status === 'testing'}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                        {status === 'testing' ? 'Тестируем...' : 'Тестировать API'}
                    </button>

                    {status === 'success' && (
                        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <h3 className="font-semibold text-green-800 mb-2">Успешно!</h3>
                            <pre className="text-sm text-green-700 overflow-auto">
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <h3 className="font-semibold text-red-800 mb-2">Ошибка!</h3>
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}
                </div>

                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <h3 className="font-semibold text-yellow-800 mb-2">Инструкции:</h3>
                    <ol className="text-sm text-yellow-700 space-y-1 list-decimal list-inside">
                        <li>Нажмите "Тестировать API" для проверки доступности</li>
                        <li>Проверьте консоль браузера для подробных логов</li>
                        <li>Если API недоступен, проверьте сервер разработки</li>
                    </ol>
                </div>
            </div>
        </div>
    )
}
