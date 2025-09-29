import { SignUp } from '@clerk/nextjs'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function SignUpPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex flex-col">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-6 py-4">
                    <Link href="/" className="flex items-center space-x-2">
                        <FileText className="h-8 w-8 text-blue-600" />
                        <span className="text-2xl font-bold text-slate-900">Kelbetty</span>
                    </Link>
                </div>
            </header>

            {/* Main */}
            <main className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-md">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold text-slate-900 mb-2">
                            Создать аккаунт
                        </h1>
                        <p className="text-slate-600">
                            Присоединяйтесь к тысячам пользователей, которые уже используют Kelbetty
                        </p>
                    </div>

                    <div className="bg-white rounded-2xl shadow-lg p-8 border border-slate-100">
                        <SignUp
                            appearance={{
                                elements: {
                                    formButtonPrimary: 'bg-blue-600 hover:bg-blue-700 text-sm normal-case',
                                    card: 'shadow-none',
                                    headerTitle: 'hidden',
                                    headerSubtitle: 'hidden',
                                }
                            }}
                            redirectUrl="/app"
                        />
                    </div>

                    <p className="text-center text-slate-600 mt-6">
                        Уже есть аккаунт?{' '}
                        <Link href="/sign-in" className="text-blue-600 hover:text-blue-700 font-semibold">
                            Войти
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    )
}
