'use client'

import { useEffect, useRef, useState } from 'react'

declare global {
    interface Window {
        DocsAPI: any
    }
}

export default function OnlyOfficeEditor({
    fileUrlForDs,
    fileType,
    fileKey,
    title,
}: {
    fileUrlForDs: string
    fileType: 'docx' | 'pptx' | 'xlsx' | 'pdf'
    fileKey: string
    title: string
}) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [err, setErr] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const initEditor = async () => {
            try {
                setLoading(true)
                setErr(null)

                // Подключаем API скрипт OnlyOffice
                const response = await fetch('/api/onlyoffice/config', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ fileUrlForDs, fileType, fileKey, title }),
                })

                if (!response.ok) {
                    throw new Error('OnlyOffice config failed')
                }

                const ds = await response.json()

                if (!ds?.ok) {
                    throw new Error('OnlyOffice config failed')
                }

                // Загружаем скрипт OnlyOffice
                await new Promise<void>((resolve, reject) => {
                    const script = document.createElement('script')
                    script.src = `${ds.ds}/web-apps/apps/api/documents/api.js`
                    script.async = true
                    script.onload = () => resolve()
                    script.onerror = () => reject(new Error('Failed to load OnlyOffice script'))
                    document.body.appendChild(script)
                })

                if (cancelled || !containerRef.current) return

                // Инициализируем редактор
                const config = ds.payload ?? ds // если без JWT

                // Требуется контейнер с id
                containerRef.current.id = containerRef.current.id || 'oo-container'

                // eslint-disable-next-line no-new
                new window.DocsAPI.DocEditor(containerRef.current.id, config)
            } catch (e: any) {
                console.error('OnlyOffice init error:', e)
                if (!cancelled) {
                    setErr(e?.message ?? 'OnlyOffice init failed')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        initEditor()

        return () => {
            cancelled = true
        }
    }, [fileUrlForDs, fileType, fileKey, title])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-white text-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-slate-500">Инициализация редактора…</p>
                </div>
            </div>
        )
    }

    if (err) {
        return (
            <div className="h-full flex items-center justify-center bg-white text-slate-900">
                <div className="text-center p-6">
                    <div className="text-red-500 mb-4">⚠️</div>
                    <p className="text-sm text-red-600 mb-4">{err}</p>
                    <p className="text-xs text-slate-500">
                        Убедитесь, что OnlyOffice Document Server запущен:<br />
                        <code className="bg-slate-100 px-2 py-1 rounded">docker compose up -d documentserver</code>
                    </p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={containerRef}
            className="w-full h-full bg-white text-slate-900"
            style={{ minHeight: '600px' }}
        />
    )
}
