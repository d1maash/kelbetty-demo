import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const body = await req.json()
        console.log('OnlyOffice webhook:', body)

        // Здесь можно обработать события от OnlyOffice
        // Например, сохранение изменений в базу данных

        return NextResponse.json({ ok: true })
    } catch (error) {
        console.error('Ошибка webhook OnlyOffice:', error)
        return NextResponse.json({ ok: false, error: 'WEBHOOK_FAILED' }, { status: 500 })
    }
}
