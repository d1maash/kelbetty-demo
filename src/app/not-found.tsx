import Link from 'next/link'
import { FileText, Home } from 'lucide-react'

export default function NotFound() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
            <div className="text-center max-w-md">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-6" />
                <h1 className="text-4xl font-bold text-slate-900 mb-4">404</h1>
                <h2 className="text-xl font-semibold text-slate-700 mb-4">Страница не найдена</h2>
                <p className="text-slate-600 mb-8">
                    К сожалению, запрашиваемая страница не существует или была перемещена.
                </p>
                <Link
                    href="/"
                    className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                    <Home className="w-5 h-5 mr-2" />
                    Вернуться на главную
                </Link>
            </div>
        </div>
    )
}
