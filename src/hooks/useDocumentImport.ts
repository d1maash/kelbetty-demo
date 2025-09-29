'use client'

import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'

export type ImportStatus = 'idle' | 'reading' | 'parsing' | 'ready' | 'error' | 'loading'

export interface DocumentImportState {
    status: ImportStatus
    error: string | null
    progress: number
}

export interface DocumentData {
    id: string
    type: 'docx' | 'pptx' | 'xlsx' | 'pdf'
    title: string
    file?: File
    content?: string
    html?: string
    metadata?: {
        fileName?: string
        fileSize?: number
        fileType?: string
        lastModified?: number
        storageKey?: string
    }
    createdAt?: string
    updatedAt?: string
    data?: any // Парсированные данные
}

export function useDocumentImport() {
    const [state, setState] = useState<DocumentImportState>({
        status: 'idle',
        error: null,
        progress: 0
    })

    const [currentDocument, setCurrentDocument] = useState<DocumentData | null>(null)
    const [documents, setDocuments] = useState<DocumentData[]>([])

    const loadDocuments = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, status: 'loading' }))

            const response = await fetch('/api/documents')
            if (!response.ok) {
                throw new Error('Ошибка загрузки документов')
            }

            const data = await response.json()
            console.log('Загружены документы:', data.documents)

            // Преобразуем данные из API в формат DocumentData
            const documents = (data.documents || []).map((doc: any) => ({
                id: doc.id,
                type: doc.type,
                title: doc.title,
                html: doc.html,
                metadata: {
                    fileName: doc.title,
                    fileSize: doc.html ? doc.html.length : 0,
                    fileType: `application/vnd.openxmlformats-officedocument.wordprocessingml.document`,
                    storageKey: doc.storageKey
                },
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
            }))

            setDocuments(documents)
            setState(prev => ({ ...prev, status: 'idle' }))
        } catch (error) {
            console.error('Ошибка при загрузке документов:', error)
            setState(prev => ({
                ...prev,
                status: 'error',
                error: 'Ошибка загрузки документов'
            }))
        }
    }, [])

    // Загружаем документы при инициализации
    useEffect(() => {
        loadDocuments()
    }, [loadDocuments])

    const validateFile = useCallback((file: File): { valid: boolean; error?: string } => {
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
    }, [])

    const importDocument = useCallback(async (file: File): Promise<DocumentData | null> => {
        setState({ status: 'reading', error: null, progress: 0 })

        try {
            // Валидация файла
            const validation = validateFile(file)
            if (!validation.valid) {
                throw new Error(validation.error)
            }

            setState(prev => ({ ...prev, status: 'parsing', progress: 50 }))

            // Определяем тип файла
            const extension = file.name.split('.').pop()?.toLowerCase() as 'docx' | 'pptx' | 'xlsx' | 'pdf'

            // Создаем документ в базе данных
            const response = await fetch('/api/documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    title: file.name,
                    type: extension,
                    content: '', // Пока пустой контент
                    metadata: {
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type,
                        lastModified: file.lastModified
                    }
                })
            })

            if (!response.ok) {
                throw new Error('Ошибка сохранения документа')
            }

            const { document: savedDocument } = await response.json()

            // Создаем объект документа
            const document: DocumentData = {
                id: savedDocument.id,
                type: extension,
                title: file.name,
                file,
                content: savedDocument.html || '',
                metadata: {
                    fileName: file.name,
                    fileSize: file.size,
                    fileType: file.type,
                    lastModified: file.lastModified
                },
                createdAt: savedDocument.createdAt,
                updatedAt: savedDocument.updatedAt
            }

            setState(prev => ({ ...prev, status: 'ready', progress: 100 }))
            setCurrentDocument(document)
            setDocuments(prev => [document, ...prev])

            toast.success(`Документ "${file.name}" успешно импортирован и сохранен.`)
            return document

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Неизвестная ошибка при импорте'
            setState({ status: 'error', error: errorMessage, progress: 0 })
            toast.error(errorMessage)
            console.error('Ошибка импорта документа:', error)
            return null
        }
    }, [validateFile])

    const resetImport = useCallback(() => {
        setState({ status: 'idle', error: null, progress: 0 })
        setCurrentDocument(null)
    }, [])

    const clearError = useCallback(() => {
        setState(prev => ({ ...prev, error: null }))
    }, [])

    const updateDocument = useCallback(async (documentId: string, updates: Partial<DocumentData>) => {
        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(updates)
            })

            if (!response.ok) {
                throw new Error('Ошибка обновления документа')
            }

            const { document: updatedDocument } = await response.json()

            setDocuments(prev => prev.map(doc =>
                doc.id === documentId ? { ...doc, ...updatedDocument } : doc
            ))

            if (currentDocument?.id === documentId) {
                setCurrentDocument(prev => prev ? { ...prev, ...updatedDocument } : null)
            }

            toast.success('Документ обновлен')
        } catch (error) {
            console.error('Ошибка при обновлении документа:', error)
            toast.error('Ошибка обновления документа')
        }
    }, [currentDocument])

    const deleteDocument = useCallback(async (documentId: string) => {
        try {
            const response = await fetch(`/api/documents/${documentId}`, {
                method: 'DELETE'
            })

            if (!response.ok) {
                throw new Error('Ошибка удаления документа')
            }

            setDocuments(prev => prev.filter(doc => doc.id !== documentId))

            if (currentDocument?.id === documentId) {
                setCurrentDocument(null)
            }

            toast.success('Документ удален')
        } catch (error) {
            console.error('Ошибка при удалении документа:', error)
            toast.error('Ошибка удаления документа')
        }
    }, [currentDocument])

    const selectDocument = useCallback((document: DocumentData) => {
        setCurrentDocument(document)
    }, [])

    return {
        state,
        currentDocument,
        documents,
        importDocument,
        resetImport,
        clearError,
        updateDocument,
        deleteDocument,
        selectDocument,
        loadDocuments
    }
}
