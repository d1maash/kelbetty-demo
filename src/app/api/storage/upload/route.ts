import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const ROOT = process.env.UPLOAD_DIR ?? '/tmp/kelbetty_uploads'

export async function POST(req: Request) {
    try {
        await mkdir(ROOT, { recursive: true })

        const form = await req.formData()
        const file = form.get('file') as File | null
        if (!file) return NextResponse.json({ ok: false, error: 'FILE_REQUIRED' }, { status: 400 })

        const bytes = new Uint8Array(await file.arrayBuffer())
        const id = randomUUID()
        const ext = (file.name.split('.').pop() || '').toLowerCase()
        const key = `${id}.${ext}`
        const p = join(ROOT, key)
        await writeFile(p, bytes)

        // URL, по которому DocumentServer сможет скачать файл
        const base = process.env.PUBLIC_HOST_FOR_DS || process.env.NEXT_PUBLIC_APP_URL!
        const urlForDs = `${base}/api/storage/${key}`

        return NextResponse.json({
            ok: true,
            key,
            url: `${process.env.NEXT_PUBLIC_APP_URL}/api/storage/${key}`,
            urlForDs
        })
    } catch (error) {
        console.error('Ошибка загрузки файла:', error)
        return NextResponse.json({ ok: false, error: 'UPLOAD_FAILED' }, { status: 500 })
    }
}
