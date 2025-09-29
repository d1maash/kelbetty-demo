'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Sparkles, AlertCircle, CheckCircle, X } from 'lucide-react'

interface Message {
    id: string
    type: 'user' | 'ai'
    content: string
    timestamp: Date
    suggestion?: {
        description: string
        patch: any
        preview?: string
    }
}

interface Document {
    id: string
    type: 'docx' | 'pptx' | 'xlsx' | 'pdf' | null
    title: string
    file?: File
}

interface ChatPanelProps {
    currentDocument: Document | null
    onDocumentUpdate: (document: Document) => void
}

export default function ChatPanel({ currentDocument, onDocumentUpdate }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [pendingSuggestion, setPendingSuggestion] = useState<Message | null>(null)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        if (currentDocument) {
            // Приветственное сообщение при загрузке документа
            const welcomeMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                content: `Документ "${currentDocument.title}" загружен! Теперь вы можете редактировать его с помощью команд. Например, попробуйте: "Сделай все заголовки синими" или "Увеличь размер шрифта в абзацах".`,
                timestamp: new Date()
            }
            setMessages([welcomeMessage])
        }
    }, [currentDocument])

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !currentDocument) return

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: inputValue,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        setInputValue('')
        setIsLoading(true)

        try {
            // Симуляция вызова API ИИ
            const response = await fetch('/api/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: inputValue,
                    document: currentDocument,
                }),
            })

            if (!response.ok) {
                throw new Error('Ошибка при обращении к ИИ')
            }

            const data = await response.json()

            const aiMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: data.response || 'Я проанализировал ваш запрос и подготовил изменения.',
                timestamp: new Date(),
                suggestion: data.suggestion ? {
                    description: data.suggestion.description,
                    patch: data.suggestion.patch,
                    preview: data.suggestion.preview
                } : undefined
            }

            setMessages(prev => [...prev, aiMessage])

            if (aiMessage.suggestion) {
                setPendingSuggestion(aiMessage)
            }
        } catch (error) {
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: 'Извините, произошла ошибка при обработке вашего запроса. Попробуйте еще раз.',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
        } finally {
            setIsLoading(false)
        }
    }

    const handleApplySuggestion = () => {
        if (!pendingSuggestion || !currentDocument) return

        // В реальном приложении здесь применялся бы патч к документу
        console.log('Применяем изменения:', pendingSuggestion.suggestion?.patch)

        const confirmMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            content: 'Изменения успешно применены к документу!',
            timestamp: new Date()
        }

        setMessages(prev => [...prev, confirmMessage])
        setPendingSuggestion(null)
    }

    const handleRejectSuggestion = () => {
        if (!pendingSuggestion) return

        const rejectMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            content: 'Изменения отклонены. Можете попробовать другую формулировку запроса.',
            timestamp: new Date()
        }

        setMessages(prev => [...prev, rejectMessage])
        setPendingSuggestion(null)
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSendMessage()
        }
    }

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit'
        })
    }

    return (
        <div className="bg-white flex flex-col h-full">
            {/* Header */}
            <div className="p-4 border-b border-slate-200">
                <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-blue-600" />
                    <h3 className="font-semibold text-slate-900">ИИ Помощник</h3>
                    {currentDocument && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                            Активен
                        </span>
                    )}
                </div>
                {currentDocument && (
                    <p className="text-xs text-slate-500 mt-1">
                        Работаем с: {currentDocument.title}
                    </p>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {!currentDocument ? (
                    <div className="text-center text-slate-500 mt-8">
                        <Bot className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                        <p className="text-sm">Загрузите документ, чтобы начать общение с ИИ</p>
                    </div>
                ) : (
                    <>
                        {messages.map((message) => (
                            <div
                                key={message.id}
                                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${message.type === 'user'
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-900'
                                        }`}
                                >
                                    <div className="flex items-start space-x-2">
                                        {message.type === 'ai' && (
                                            <Bot className="w-4 h-4 mt-0.5 text-blue-600" />
                                        )}
                                        {message.type === 'user' && (
                                            <User className="w-4 h-4 mt-0.5 text-white" />
                                        )}
                                        <div className="flex-1">
                                            <p className="text-sm">{message.content}</p>
                                            <p className={`text-xs mt-1 ${message.type === 'user' ? 'text-blue-200' : 'text-slate-500'
                                                }`}>
                                                {formatTime(message.timestamp)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Suggestion Card */}
                                    {message.suggestion && (
                                        <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200">
                                            <div className="flex items-center space-x-2 mb-2">
                                                <Sparkles className="w-4 h-4 text-yellow-500" />
                                                <span className="text-sm font-medium text-slate-900">
                                                    Предлагаемые изменения
                                                </span>
                                            </div>
                                            <p className="text-sm text-slate-600 mb-3">
                                                {message.suggestion.description}
                                            </p>

                                            {pendingSuggestion?.id === message.id && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={handleApplySuggestion}
                                                        className="flex items-center px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        Применить
                                                    </button>
                                                    <button
                                                        onClick={handleRejectSuggestion}
                                                        className="flex items-center px-3 py-1.5 bg-slate-600 text-white text-sm rounded-lg hover:bg-slate-700 transition-colors"
                                                    >
                                                        <X className="w-4 h-4 mr-1" />
                                                        Отклонить
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-slate-100 rounded-2xl px-4 py-3">
                                    <div className="flex items-center space-x-2">
                                        <Bot className="w-4 h-4 text-blue-600" />
                                        <div className="flex space-x-1">
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                            <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-slate-200">
                {!currentDocument ? (
                    <div className="text-center text-slate-400 text-sm py-4">
                        Загрузите документ для начала работы
                    </div>
                ) : (
                    <div className="flex space-x-2">
                        <div className="flex-1 relative">
                            <textarea
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Опишите, что нужно изменить в документе..."
                                disabled={isLoading}
                                className="w-full p-3 pr-12 border border-slate-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:text-slate-500"
                                rows={2}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputValue.trim() || isLoading}
                                className="absolute right-2 bottom-2 p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                {currentDocument && (
                    <div className="mt-2 text-xs text-slate-500">
                        <div className="flex items-center space-x-2">
                            <AlertCircle className="w-3 h-3" />
                            <span>ИИ сохранит стили и форматирование документа</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
