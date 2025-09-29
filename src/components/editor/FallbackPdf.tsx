'use client'

import { useEffect, useRef, useState } from 'react'

export default function FallbackPdf({ arrayBuffer }: { arrayBuffer: ArrayBuffer }) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const [err, setErr] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const renderPdf = async () => {
            try {
                setLoading(true)
                setErr(null)

                // Динамический импорт pdfjs-dist
                const pdfjs = await import('pdfjs-dist')

                // Устанавливаем worker
                pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

                const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise
                const page = await pdf.getPage(1)
                const viewport = page.getViewport({ scale: 1.2 })

                const canvas = canvasRef.current!
                const ctx = canvas.getContext('2d')!
                canvas.height = viewport.height
                canvas.width = viewport.width

                await page.render({ canvasContext: ctx, viewport, canvas }).promise
            } catch (e: any) {
                console.error('Ошибка рендеринга PDF:', e)
                if (!cancelled) {
                    setErr('Не удалось отобразить PDF')
                }
            } finally {
                if (!cancelled) {
                    setLoading(false)
                }
            }
        }

        renderPdf()

        return () => {
            cancelled = true
        }
    }, [arrayBuffer])

    if (loading) {
        return (
            <div className="h-full flex items-center justify-center bg-white text-slate-900">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-sm text-slate-500">Загрузка PDF…</p>
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
        <div className="h-full overflow-auto bg-white text-slate-900 p-4">
            <canvas
                ref={canvasRef}
                className="w-full h-auto bg-white border border-slate-200 rounded-lg shadow-sm"
            />
        </div>
    )
}
