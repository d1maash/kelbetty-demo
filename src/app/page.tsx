import Link from 'next/link'
import { FileText, Sparkles, Shield, Zap } from 'lucide-react'

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50">
            {/* Header */}
            <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
                <div className="mx-auto max-w-7xl px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <span className="text-2xl font-bold text-slate-900">Kelbetty</span>
                        </div>
                        <nav className="hidden md:flex items-center space-x-6">
                            <Link href="/prising" className="text-slate-600 hover:text-slate-900 transition-colors">
                                Цены
                            </Link>
                            <Link href="/enterprise" className="text-slate-600 hover:text-slate-900 transition-colors">
                                Для бизнеса
                            </Link>
                            <Link href="/sign-in" className="text-slate-600 hover:text-slate-900 transition-colors">
                                Войти
                            </Link>
                            <Link
                                href="/sign-up"
                                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 transition-colors"
                            >
                                Регистрация
                            </Link>
                        </nav>
                    </div>
                </div>
            </header>

            {/* Hero Section */}
            <main className="mx-auto max-w-7xl px-6 py-20">
                <div className="text-center">
                    <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
                        Kelbetty — ИИ‑редактор документов<br />
                        <span className="text-blue-600">с сохранением стиля</span>
                    </h1>
                    <p className="mt-6 text-xl text-slate-600 max-w-3xl mx-auto leading-relaxed">
                        Импортируйте. Редактируйте. Экспортируйте. Без поломанных шрифтов и отступов.
                        Первый сервис, который сохраняет исходное форматирование документов при работе с ИИ.
                    </p>
                    <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/app"
                            className="rounded-xl px-8 py-4 bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
                        >
                            <Sparkles className="inline-block w-5 h-5 mr-2" />
                            Попробовать демо
                        </Link>
                        <Link
                            href="/prising"
                            className="rounded-xl px-8 py-4 border-2 border-slate-300 text-slate-700 text-lg font-semibold hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            Посмотреть цены
                        </Link>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-32 grid md:grid-cols-3 gap-8">
                    <div className="text-center p-8 rounded-2xl bg-white shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <FileText className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">Все форматы</h3>
                        <p className="text-slate-600">
                            Word, PowerPoint, Excel, PDF — полная поддержка с сохранением стилей, шрифтов и форматирования.
                        </p>
                    </div>

                    <div className="text-center p-8 rounded-2xl bg-white shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Sparkles className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">ИИ-помощник</h3>
                        <p className="text-slate-600">
                            Управляйте документами через чат. ИИ понимает контекст и вносит изменения без потери стиля.
                        </p>
                    </div>

                    <div className="text-center p-8 rounded-2xl bg-white shadow-sm border border-slate-100">
                        <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                            <Shield className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-3">Безопасность</h3>
                        <p className="text-slate-600">
                            Корпоративная безопасность, приватные развёртывания, SSO интеграция для бизнеса.
                        </p>
                    </div>
                </div>

                {/* Problem/Solution */}
                <div className="mt-32 bg-slate-50 rounded-3xl p-12 md:p-16">
                    <div className="grid md:grid-cols-2 gap-12 items-center">
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                Проблема знакома?
                            </h2>
                            <div className="space-y-4 text-slate-600">
                                <p>❌ Загрузили документ — потерялись шрифты</p>
                                <p>❌ Попросили ИИ отредактировать — сломалось форматирование</p>
                                <p>❌ Скачали результат — часы на восстановление стиля</p>
                            </div>
                        </div>
                        <div>
                            <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-6">
                                Kelbetty решает это
                            </h2>
                            <div className="space-y-4 text-slate-600">
                                <p>✅ Импорт с полным сохранением стилей</p>
                                <p>✅ ИИ-редактирование без потери форматирования</p>
                                <p>✅ Экспорт в исходном качестве</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="mt-32 text-center bg-blue-600 rounded-3xl p-12 md:p-16 text-white">
                    <h2 className="text-3xl md:text-4xl font-bold mb-6">
                        Готовы попробовать?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                        Загрузите свой документ и убедитесь сами — стиль остается неизменным.
                    </p>
                    <Link
                        href="/app"
                        className="inline-flex items-center rounded-xl px-8 py-4 bg-white text-blue-600 text-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
                    >
                        <Zap className="w-5 h-5 mr-2" />
                        Начать бесплатно
                    </Link>
                </div>
            </main>

            {/* Footer */}
            <footer className="border-t border-slate-200 bg-white">
                <div className="mx-auto max-w-7xl px-6 py-12">
                    <div className="grid md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <FileText className="h-6 w-6 text-blue-600" />
                                <span className="text-lg font-bold text-slate-900">Kelbetty</span>
                            </div>
                            <p className="text-slate-600">
                                ИИ-редактор документов с сохранением стиля
                            </p>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-3">Продукт</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li><Link href="/app" className="hover:text-slate-900 transition-colors">Демо</Link></li>
                                <li><Link href="/prising" className="hover:text-slate-900 transition-colors">Цены</Link></li>
                                <li><Link href="/enterprise" className="hover:text-slate-900 transition-colors">Для бизнеса</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-3">Аккаунт</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li><Link href="/sign-up" className="hover:text-slate-900 transition-colors">Регистрация</Link></li>
                                <li><Link href="/sign-in" className="hover:text-slate-900 transition-colors">Вход</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-semibold text-slate-900 mb-3">Поддержка</h3>
                            <ul className="space-y-2 text-slate-600">
                                <li><a href="mailto:help@kelbetty.ai" className="hover:text-slate-900 transition-colors">Помощь</a></li>
                                <li><a href="mailto:contact@kelbetty.ai" className="hover:text-slate-900 transition-colors">Контакты</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-slate-200 mt-8 pt-8 text-center text-slate-600">
                        <p>&copy; 2024 Kelbetty. Все права защищены.</p>
                    </div>
                </div>
            </footer>
        </div>
    )
}
