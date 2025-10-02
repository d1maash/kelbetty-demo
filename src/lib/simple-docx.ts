import * as mammoth from 'mammoth'

export async function convertDocxToHtmlSimple(
    input: ArrayBuffer | Uint8Array | Buffer
): Promise<{ html: string; warnings: any[] }> {
    console.log('convertDocxToHtmlSimple: Начало простой конвертации')

    const buffer = Buffer.isBuffer(input) ? input : Buffer.from(input)
    console.log('convertDocxToHtmlSimple: Буфер создан, размер:', buffer.length)

    try {
        console.log('convertDocxToHtmlSimple: Запускаем простую конвертацию mammoth')
        const result = await mammoth.convertToHtml({ buffer })
        console.log('convertDocxToHtmlSimple: Простая конвертация завершена')

        return {
            html: result.value,
            warnings: result.messages
        }
    } catch (error) {
        console.error('convertDocxToHtmlSimple: Ошибка при простой конвертации:', error)
        throw error
    }
}
