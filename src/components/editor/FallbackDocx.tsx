'use client'

import { useEffect, useRef, useState } from 'react'

export default function FallbackDocx({ arrayBuffer }: { arrayBuffer: ArrayBuffer }) {
    const ref = useRef<HTMLDivElement>(null)
    const [err, setErr] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const convertDocx = async () => {
            try {
                setLoading(true)
                setErr(null)

                // Динамический импорт mammoth
                const mammoth = await import('mammoth/mammoth.browser')

                const { value: html } = await mammoth.convertToHtml({ arrayBuffer }, {
                    styleMap: [
                        "p[style-name='Heading 1'] => h1:fresh",
                        "p[style-name='Heading 2'] => h2:fresh",
                        "p[style-name='Title'] => h1.title:fresh",
                        "u => u",
                        "b => strong",
                        "i => em"
                    ]
                })

                if (!cancelled && ref.current) {
                    ref.current.innerHTML = html
                    ref.current.contentEditable = 'true'
                }
            } catch (e: any) {
                console.error('Ошибка конвертации DOCX:', e)
                if (!cancelled) {
                    setErr('Не удалось отобразить DOCX (fallback)')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        convertDocx()

        return () => {
            cancelled = true
        }
    }, [arrayBuffer])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-white text-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-slate-500">Загрузка DOCX…</p>
                </div>
            </div>
        )
    }

    if (err) {
        return (
            <div className="h-full flex items-center justify-center bg-white text-slate-900">
                <div className="text-center p-6">
                    <div className="text-red-500 mb-4">⚠️</div>
                    <p className="text-sm text-red-600">{err}</p>
                </div>
            </div>
        )
    }

    return (
        <div
            ref={ref}
            className="prose max-w-none p-6 bg-white text-slate-900 leading-relaxed"
            style={{ minHeight: '600px' }}
        />
    )
}
