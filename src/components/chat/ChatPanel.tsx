'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Send, Bot, User, Sparkles, AlertCircle, CheckCircle, X } from 'lucide-react'
import type { DocumentData } from '@/hooks/useDocumentImport'
import '@/styles/chat.css'

interface Message {
    id: string
    type: 'user' | 'ai'
    content: string
    timestamp: Date
    suggestion?: {
        description: string
        patch: {
            type: 'html_overwrite'
            documentId: string
            updatedHtml: string
            changes: Array<{
                selector: string
                style: Record<string, string>
                summary: string
            }>
        }
        preview?: string
    }
}

interface ChatPanelProps {
    currentDocument: DocumentData | null
    onDocumentUpdate: (document: DocumentData) => void
}

export default function ChatPanel({ currentDocument, onDocumentUpdate }: ChatPanelProps) {
    const [messages, setMessages] = useState<Message[]>([])
    const [inputValue, setInputValue] = useState('')
    const [isLoading, setIsLoading] = useState(false)
    const [pendingSuggestion, setPendingSuggestion] = useState<Message | null>(null)
    const [isApplyingSuggestion, setIsApplyingSuggestion] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        // Автоматический скролл к последнему сообщению
        const scrollToBottom = () => {
            if (messagesEndRef.current) {
                messagesEndRef.current.scrollIntoView({
                    behavior: 'smooth',
                    block: 'end'
                })
            }
        }

        // Небольшая задержка для корректного скролла
        const timeoutId = setTimeout(scrollToBottom, 100)
        return () => clearTimeout(timeoutId)
    }, [messages, pendingSuggestion, isLoading])

    const loadChatHistory = useCallback(async () => {
        if (!currentDocument) return

        try {
            const response = await fetch(`/api/chat/${currentDocument.id}`)
            if (response.ok) {
                const data = await response.json()
                if (data.messages && data.messages.length > 0) {
                    // Загружаем сохраненную историю
                    const savedMessages: Message[] = data.messages.map((msg: any) => ({
                        id: msg.id,
                        type: msg.type,
                        content: msg.content,
                        timestamp: new Date(msg.createdAt),
                        suggestion: msg.suggestion
                    }))
                    setMessages(savedMessages)
                } else {
                    // Если истории нет, показываем приветственное сообщение
                    const welcomeMessage: Message = {
                        id: Date.now().toString(),
                        type: 'ai',
                        content: `👋 Привет! Я ваш ИИ помощник для работы с документом "${currentDocument.title}".\n\nЯ помогу вам:\n• Изменить форматирование текста\n• Настроить цвета и стили\n• Улучшить внешний вид документа\n• Добавить эффекты и анимации\n\nПросто опишите, что хотите изменить, и я это сделаю! Например: "Сделай заголовки синими" или "Увеличь размер шрифта".`,
                        timestamp: new Date()
                    }
                    setMessages([welcomeMessage])
                    await saveMessage(welcomeMessage)
                }
            }
        } catch (error) {
            console.error('Ошибка загрузки истории чата:', error)
            // Показываем приветственное сообщение при ошибке
            const welcomeMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                content: `👋 Привет! Я ваш ИИ помощник для работы с документом "${currentDocument.title}".\n\nПросто опишите, что хотите изменить, и я это сделаю!`,
                timestamp: new Date()
            }
            setMessages([welcomeMessage])
        }
        setPendingSuggestion(null)
    }, [currentDocument])

    const saveMessage = useCallback(async (message: Message) => {
        if (!currentDocument) return

        try {
            await fetch(`/api/chat/${currentDocument.id}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    type: message.type,
                    content: message.content,
                    suggestion: message.suggestion
                })
            })
        } catch (error) {
            console.error('Ошибка сохранения сообщения:', error)
        }
    }, [currentDocument])

    useEffect(() => {
        if (currentDocument) {
            loadChatHistory()
        }
    }, [currentDocument, loadChatHistory])

    const handleSendMessage = async () => {
        if (!inputValue.trim() || !currentDocument) return

        const userMessage: Message = {
            id: Date.now().toString(),
            type: 'user',
            content: inputValue,
            timestamp: new Date()
        }

        setMessages(prev => [...prev, userMessage])
        await saveMessage(userMessage)
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
                    documentId: currentDocument.id,
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
            await saveMessage(aiMessage)

            if (aiMessage.suggestion) {
                setPendingSuggestion(aiMessage)
            }
        } catch (error) {
            console.error('Ошибка в ChatPanel:', error)

            let errorContent = 'Извините, произошла ошибка при обработке вашего запроса.'

            if (error instanceof Error) {
                if (error.message.includes('401')) {
                    errorContent = 'Ошибка авторизации. Пожалуйста, войдите в систему заново.'
                } else if (error.message.includes('404')) {
                    errorContent = 'Документ не найден. Попробуйте перезагрузить страницу.'
                } else if (error.message.includes('500')) {
                    errorContent = 'Внутренняя ошибка сервера. Попробуйте позже.'
                } else {
                    errorContent = `Ошибка: ${error.message}`
                }
            }

            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: errorContent,
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            await saveMessage(errorMessage)
        } finally {
            setIsLoading(false)
        }
    }

    const handleApplySuggestion = async () => {
        if (!pendingSuggestion || !currentDocument || !pendingSuggestion.suggestion?.patch) {
            return
        }

        const { patch } = pendingSuggestion.suggestion

        if (!patch.updatedHtml) {
            return
        }

        setIsApplyingSuggestion(true)

        try {
            const response = await fetch(`/api/documents/${currentDocument.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    html: patch.updatedHtml
                })
            })

            if (!response.ok) {
                throw new Error('Ошибка обновления документа')
            }

            const { document: updatedDocument } = await response.json()

            const mergedDocument: DocumentData = {
                ...currentDocument,
                ...updatedDocument,
                html: patch.updatedHtml,
            }

            onDocumentUpdate(mergedDocument)

            const confirmMessage: Message = {
                id: Date.now().toString(),
                type: 'ai',
                content: '✅ Изменения успешно применены к документу! Документ обновлен и сохранен.',
                timestamp: new Date()
            }

            setMessages(prev => [...prev, confirmMessage])
            await saveMessage(confirmMessage)
            setPendingSuggestion(null)
        } catch (error) {
            console.error('Ошибка применения изменений:', error)
            const errorMessage: Message = {
                id: (Date.now() + 1).toString(),
                type: 'ai',
                content: '❌ Не удалось применить изменения к документу. Попробуйте еще раз или сформулируйте запрос иначе.',
                timestamp: new Date()
            }
            setMessages(prev => [...prev, errorMessage])
            await saveMessage(errorMessage)
        } finally {
            setIsApplyingSuggestion(false)
        }
    }

    const handleRejectSuggestion = async () => {
        if (!pendingSuggestion) return

        const rejectMessage: Message = {
            id: Date.now().toString(),
            type: 'ai',
            content: 'Изменения отклонены. Можете попробовать другую формулировку запроса.',
            timestamp: new Date()
        }

        setMessages(prev => [...prev, rejectMessage])
        await saveMessage(rejectMessage)
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
        <div className="bg-white flex flex-col h-full max-h-full chat-container">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-slate-200 chat-header">
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 max-h-full chat-messages">
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
                                                        disabled={isApplyingSuggestion}
                                                        className={`flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${isApplyingSuggestion
                                                            ? 'bg-green-400 text-white cursor-not-allowed'
                                                            : 'bg-green-600 text-white hover:bg-green-700'
                                                            }`}
                                                    >
                                                        <CheckCircle className="w-4 h-4 mr-1" />
                                                        {isApplyingSuggestion ? 'Применяем...' : 'Применить'}
                                                    </button>
                                                    <button
                                                        onClick={handleRejectSuggestion}
                                                        disabled={isApplyingSuggestion}
                                                        className={`flex items-center px-3 py-1.5 text-sm rounded-lg transition-colors ${isApplyingSuggestion
                                                            ? 'bg-slate-400 text-white cursor-not-allowed'
                                                            : 'bg-slate-600 text-white hover:bg-slate-700'
                                                            }`}
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
            <div className="flex-shrink-0 p-4 border-t border-slate-200 chat-input">
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
