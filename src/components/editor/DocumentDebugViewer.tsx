'use client'

import { FileText, AlertCircle, Info } from 'lucide-react'

interface DocumentDebugViewerProps {
    document: {
        id: string
        title: string
        html?: string
        type: string
        createdAt?: string
        updatedAt?: string
        metadata?: {
            fileSize?: number
            storageKey?: string
        }
    }
}

export default function DocumentDebugViewer({ document }: DocumentDebugViewerProps) {
    return (
        <div className="h-full flex flex-col bg-white">
            {/* Header */}
            <div className="border-b border-slate-200 p-4 bg-slate-50">
                <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    <span className="font-medium text-slate-900">{document.title}</span>
                    <span className="text-sm text-slate-500">(отладка)</span>
                </div>
            </div>

            {/* Debug Info */}
            <div className="flex-1 overflow-auto p-6">
                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Document Info */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                        <h3 className="font-semibold text-blue-900 mb-3 flex items-center">
                            <Info className="w-4 h-4 mr-2" />
                            Информация о документе
                        </h3>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="font-medium text-blue-800">ID:</span>
                                <p className="text-blue-700 font-mono text-xs">{document.id}</p>
                            </div>
                            <div>
                                <span className="font-medium text-blue-800">Тип:</span>
                                <p className="text-blue-700">{document.type}</p>
                            </div>
                            <div>
                                <span className="font-medium text-blue-800">Создан:</span>
                                <p className="text-blue-700">
                                    {document.createdAt ? new Date(document.createdAt).toLocaleString('ru-RU') : 'Неизвестно'}
                                </p>
                            </div>
                            <div>
                                <span className="font-medium text-blue-800">Обновлен:</span>
                                <p className="text-blue-700">
                                    {document.updatedAt ? new Date(document.updatedAt).toLocaleString('ru-RU') : 'Неизвестно'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* HTML Content Info */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <h3 className="font-semibold text-green-900 mb-3">HTML Контент</h3>
                        {document.html ? (
                            <div className="space-y-2">
                                <p className="text-sm text-green-700">
                                    <span className="font-medium">Длина:</span> {document.html.length} символов
                                </p>
                                <p className="text-sm text-green-700">
                                    <span className="font-medium">Размер:</span> {Math.round(document.html.length / 1024)} КБ
                                </p>
                                <div className="mt-3">
                                    <p className="text-sm font-medium text-green-800 mb-2">Предварительный просмотр (первые 500 символов):</p>
                                    <div className="bg-white border border-green-300 rounded p-3 text-xs text-slate-700 max-h-32 overflow-auto">
                                        <pre>{document.html.substring(0, 500)}...</pre>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center space-x-2 text-red-700">
                                <AlertCircle className="w-4 h-4" />
                                <span className="text-sm">HTML контент отсутствует</span>
                            </div>
                        )}
                    </div>

                    {/* Metadata */}
                    {document.metadata && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <h3 className="font-semibold text-yellow-900 mb-3">Метаданные</h3>
                            <div className="space-y-2 text-sm">
                                {document.metadata.fileSize && (
                                    <p>
                                        <span className="font-medium text-yellow-800">Размер файла:</span>
                                        <span className="text-yellow-700 ml-2">{Math.round(document.metadata.fileSize / 1024)} КБ</span>
                                    </p>
                                )}
                                {document.metadata.storageKey && (
                                    <p>
                                        <span className="font-medium text-yellow-800">Ключ хранилища:</span>
                                        <span className="text-yellow-700 ml-2 font-mono text-xs">{document.metadata.storageKey}</span>
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
                        <h3 className="font-semibold text-slate-900 mb-3">Действия</h3>
                        <div className="space-y-2">
                            <button
                                onClick={() => {
                                    console.log('Полный документ:', document)
                                    alert('Информация о документе выведена в консоль')
                                }}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                            >
                                Вывести в консоль
                            </button>
                            {document.html && (
                                <button
                                    onClick={() => {
                                        const newWindow = window.open('', '_blank')
                                        if (newWindow) {
                                            newWindow.document.write(document.html!)
                                            newWindow.document.close()
                                        }
                                    }}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm ml-2"
                                >
                                    Открыть в новом окне
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
