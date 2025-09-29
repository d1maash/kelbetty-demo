import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'

export async function POST(req: NextRequest) {
    try {
        console.log('=== ТЕСТ ИМПОРТА ===')

        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
        }

        console.log('Имя файла:', file.name)
        console.log('Размер файла:', file.size)

        // Читаем файл
        const arrayBuffer = await file.arrayBuffer()
        console.log('Размер буфера:', arrayBuffer.byteLength, 'байт')

        // Конвертируем с базовой конфигурацией
        const result = await mammoth.convertToHtml({ buffer: Buffer.from(arrayBuffer) }, {
            includeDefaultStyleMap: true
        })

        console.log('Длина HTML:', result.value.length)
        console.log('Количество предупреждений:', result.messages.length)
        console.log('Предупреждения:', result.messages)

        // Возвращаем HTML для анализа
        return NextResponse.json({
            success: true,
            html: result.value,
            messages: result.messages,
            length: result.value.length
        })

    } catch (error) {
        console.error('Ошибка тестирования импорта:', error)
        return NextResponse.json(
            { error: 'Ошибка тестирования импорта', details: error instanceof Error ? error.message : 'Неизвестная ошибка' },
            { status: 500 }
        )
    }
}
