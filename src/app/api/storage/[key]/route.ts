import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

const ROOT = process.env.UPLOAD_DIR ?? '/tmp/kelbetty_uploads'

export async function GET(_req: Request, { params }: { params: { key: string } }) {
    try {
        const p = join(ROOT, params.key)
        const buf = await readFile(p)
        const ext = (params.key.split('.').pop() || '').toLowerCase()

        const ct =
            ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' :
                ext === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' :
                    ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
                        ext === 'pdf' ? 'application/pdf' :
                            'application/octet-stream'

        return new NextResponse(new Uint8Array(buf), {
            headers: {
                'Content-Type': ct,
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        })
    } catch (error) {
        console.error('Ошибка чтения файла:', error)
        return NextResponse.json({ ok: false, error: 'NOT_FOUND' }, { status: 404 })
    }
}
