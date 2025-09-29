import { NextRequest, NextResponse } from 'next/server'
import * as mammoth from 'mammoth'

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData()
        const file = formData.get('file') as File

        if (!file) {
            return NextResponse.json({ error: 'Файл не найден' }, { status: 400 })
        }

        console.log('Тестируем mammoth с файлом:', file.name, file.size, 'байт')

        // Читаем файл
        const arrayBuffer = await file.arrayBuffer()
        console.log('ArrayBuffer размер:', arrayBuffer.byteLength, 'байт')

        // Пробуем разные способы передачи в mammoth
        let result

        try {
            // Способ 1: с buffer
            result = await mammoth.convertToHtml({ buffer: Buffer.from(arrayBuffer) })
            console.log('Успешно с buffer')
        } catch (error1) {
            console.log('Ошибка с buffer:', error1)

            try {
                // Способ 2: с arrayBuffer
                result = await mammoth.convertToHtml({ arrayBuffer })
                console.log('Успешно с arrayBuffer')
            } catch (error2) {
                console.log('Ошибка с arrayBuffer:', error2)

                try {
                    // Способ 3: с Uint8Array
                    result = await mammoth.convertToHtml({ buffer: Buffer.from(arrayBuffer) })
                    console.log('Успешно с Uint8Array')
                } catch (error3) {
                    console.log('Ошибка с Uint8Array:', error3)
                    throw error3
                }
            }
        }

        return NextResponse.json({
            success: true,
            html: result.value,
            messages: result.messages,
            method: 'mammoth test'
        })

    } catch (error) {
        console.error('Ошибка тестирования mammoth:', error)
        return NextResponse.json(
            {
                error: error instanceof Error ? error.message : 'Неизвестная ошибка',
                details: error
            },
            { status: 500 }
        )
    }
}
