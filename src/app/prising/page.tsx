import Link from 'next/link'
import { FileText, Check, Star, Zap, Shield } from 'lucide-react'

export default function PrisingPage() {
    return (
        <div className="min-h-screen bg-white">
            {/* Header */}
            <header className="border-b border-slate-200">
                <div className="mx-auto max-w-7xl px-6 py-4">
                    <div className="flex items-center justify-between">
                        <Link href="/" className="flex items-center space-x-2">
                            <FileText className="h-8 w-8 text-blue-600" />
                            <span className="text-2xl font-bold text-slate-900">Kelbetty</span>
                        </Link>
                        <nav className="hidden md:flex items-center space-x-6">
                            <Link href="/" className="text-slate-600 hover:text-slate-900 transition-colors">
                                Главная
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

            <main className="mx-auto max-w-7xl px-6 py-16">
                {/* Hero */}
                <div className="text-center mb-16">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                        Простые и прозрачные цены
                    </h1>
                    <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                        Выберите план, который подходит именно вам. Все планы включают сохранение стилей документов.
                    </p>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    {/* Free Plan */}
                    <div className="border border-slate-200 rounded-2xl p-8 bg-white">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Бесплатно</h3>
                            <div className="text-4xl font-bold text-slate-900 mb-1">₽0</div>
                            <p className="text-slate-600">навсегда</p>
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">5 документов в месяц</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Все форматы (DOCX, PPTX, XLSX, PDF)</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">ИИ-редактирование</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Сохранение стилей</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Базовая поддержка</span>
                            </li>
                        </ul>

                        <Link
                            href="/sign-up"
                            className="w-full block text-center rounded-lg border-2 border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            Начать бесплатно
                        </Link>
                    </div>

                    {/* Pro Plan */}
                    <div className="border-2 border-blue-500 rounded-2xl p-8 bg-white relative">
                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                            <div className="bg-blue-500 text-white px-4 py-1 rounded-full text-sm font-semibold flex items-center">
                                <Star className="w-4 h-4 mr-1" />
                                Популярный
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Профессиональный</h3>
                            <div className="text-4xl font-bold text-slate-900 mb-1">₽1 990</div>
                            <p className="text-slate-600">в месяц</p>
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Неограниченное количество документов</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Все функции бесплатного плана</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Продвинутые ИИ-функции</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">История версий</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Приоритетная поддержка</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">API доступ</span>
                            </li>
                        </ul>

                        <Link
                            href="/sign-up"
                            className="w-full block text-center rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 transition-colors"
                        >
                            <Zap className="inline-block w-5 h-5 mr-2" />
                            Выбрать план
                        </Link>
                    </div>

                    {/* Enterprise Plan */}
                    <div className="border border-slate-200 rounded-2xl p-8 bg-white">
                        <div className="text-center mb-6">
                            <h3 className="text-2xl font-bold text-slate-900 mb-2">Корпоративный</h3>
                            <div className="text-4xl font-bold text-slate-900 mb-1">По запросу</div>
                            <p className="text-slate-600">индивидуально</p>
                        </div>

                        <ul className="space-y-3 mb-8">
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Все функции Pro плана</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Приватное развёртывание</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">SSO интеграция</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Корпоративная безопасность</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">Персональный менеджер</span>
                            </li>
                            <li className="flex items-center">
                                <Check className="w-5 h-5 text-green-500 mr-3" />
                                <span className="text-slate-700">SLA гарантии</span>
                            </li>
                        </ul>

                        <Link
                            href="/enterprise"
                            className="w-full block text-center rounded-lg border-2 border-slate-300 px-6 py-3 font-semibold text-slate-700 hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            <Shield className="inline-block w-5 h-5 mr-2" />
                            Связаться с нами
                        </Link>
                    </div>
                </div>

                {/* FAQ */}
                <div className="bg-slate-50 rounded-3xl p-12">
                    <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
                        Часто задаваемые вопросы
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">
                                Действительно ли сохраняются все стили?
                            </h3>
                            <p className="text-slate-600">
                                Да! Kelbetty использует продвинутые алгоритмы для сохранения шрифтов, отступов, цветов и всего форматирования при импорте и экспорте документов.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">
                                Какие форматы поддерживаются?
                            </h3>
                            <p className="text-slate-600">
                                Word (.docx), PowerPoint (.pptx), Excel (.xlsx) и PDF. Мы постоянно добавляем поддержку новых форматов.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">
                                Можно ли отменить подписку?
                            </h3>
                            <p className="text-slate-600">
                                Конечно! Вы можете отменить подписку в любое время. При отмене вы сохраняете доступ до конца оплаченного периода.
                            </p>
                        </div>

                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 mb-3">
                                Безопасны ли мои документы?
                            </h3>
                            <p className="text-slate-600">
                                Абсолютно! Мы используем шифрование уровня банков и не сохраняем содержимое ваших документов дольше, чем необходимо для обработки.
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center mt-16">
                    <h2 className="text-3xl font-bold text-slate-900 mb-6">
                        Готовы начать?
                    </h2>
                    <p className="text-xl text-slate-600 mb-8 max-w-2xl mx-auto">
                        Попробуйте Kelbetty бесплатно и убедитесь, что ваши документы останутся такими же красивыми.
                    </p>
                    <Link
                        href="/app"
                        className="inline-flex items-center rounded-xl px-8 py-4 bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                    >
                        <Zap className="w-5 h-5 mr-2" />
                        Попробовать бесплатно
                    </Link>
                </div>
            </main>
        </div>
    )
}
