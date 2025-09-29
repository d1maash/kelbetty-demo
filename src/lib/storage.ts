// Утилиты для работы с файловым хранилищем
// В реальном приложении здесь была бы интеграция с S3, UploadThing или другим сервисом

export interface UploadResult {
    url: string
    key: string
    size: number
    contentType: string
}

export async function uploadFile(file: File, folder: string = 'documents'): Promise<UploadResult> {
    // В реальном приложении здесь был бы реальный upload
    // Для демо возвращаем фиктивные данные

    const key = `${folder}/${Date.now()}-${file.name}`
    const url = `/uploads/${key}`

    return {
        url,
        key,
        size: file.size,
        contentType: file.type
    }
}

export async function deleteFile(key: string): Promise<boolean> {
    // В реальном приложении здесь было бы удаление из хранилища
    console.log(`Удаляем файл: ${key}`)
    return true
}

export function getFileUrl(key: string): string {
    // В реальном приложении здесь был бы реальный URL
    return `/uploads/${key}`
}

export function validateFileType(file: File): boolean {
    const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
        'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx  
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // xlsx
        'application/pdf'
    ]

    return allowedTypes.includes(file.type)
}

export function validateFileSize(file: File, maxSizeMB: number = 50): boolean {
    const maxSize = maxSizeMB * 1024 * 1024 // Конвертируем в байты
    return file.size <= maxSize
}

export function getFileSizeString(bytes: number): string {
    if (bytes === 0) return '0 Bytes'

    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
