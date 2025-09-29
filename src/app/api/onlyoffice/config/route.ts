import { NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'

export const runtime = 'nodejs'

export async function POST(req: Request) {
    try {
        const { fileUrlForDs, fileType, fileKey, title } = await req.json()

        const ds = process.env.ONLYOFFICE_URL!
        const secret = process.env.ONLYOFFICE_JWT_SECRET || ''

        const doc = {
            fileType,               // 'docx' | 'pptx' | 'xlsx' | 'pdf'
            key: fileKey,           // уникальный ключ версии
            title: title || `Document.${fileType}`,
            url: fileUrlForDs,      // URL для DocumentServer
        }

        const config = {
            document: doc,
            editorConfig: {
                callbackUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/onlyoffice/webhook`, // опционально
                customization: { autosave: true },
                mode: 'edit',
            },
            documentType:
                fileType === 'docx' ? 'word' :
                    fileType === 'pptx' ? 'slide' :
                        fileType === 'xlsx' ? 'cell' :
                            'word',
        }

        const payload = secret ? { payload: config, token: jwt.sign(config, secret) } : { payload: config }
        return NextResponse.json({ ok: true, ds, ...payload })
    } catch (error) {
        console.error('Ошибка конфигурации OnlyOffice:', error)
        return NextResponse.json({ ok: false, error: 'CONFIG_FAILED' }, { status: 500 })
    }
}
