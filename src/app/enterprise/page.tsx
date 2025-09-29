import Link from 'next/link'
import { FileText, Shield, Users, Zap, Lock, Globe, HeadphonesIcon, CheckCircle } from 'lucide-react'

export default function EnterprisePage() {
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
                            <Link href="/prising" className="text-slate-600 hover:text-slate-900 transition-colors">
                                Цены
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
                <div className="text-center mb-20">
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">
                        Kelbetty для корпораций
                    </h1>
                    <p className="text-xl text-slate-600 max-w-3xl mx-auto mb-8">
                        Безопасное и масштабируемое решение для работы с документами в крупных организациях.
                        Приватные развёртывания, корпоративная безопасность, интеграции с вашей инфраструктурой.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="mailto:enterprise@kelbetty.ai"
                            className="rounded-xl px-8 py-4 bg-blue-600 text-white text-lg font-semibold hover:bg-blue-700 transition-colors shadow-lg"
                        >
                            <Shield className="inline-block w-5 h-5 mr-2" />
                            Связаться с отделом продаж
                        </a>
                        <Link
                            href="/app"
                            className="rounded-xl px-8 py-4 border-2 border-slate-300 text-slate-700 text-lg font-semibold hover:border-slate-400 hover:bg-slate-50 transition-colors"
                        >
                            Попробовать демо
                        </Link>
                    </div>
                </div>

                {/* Key Benefits */}
                <div className="grid md:grid-cols-3 gap-8 mb-20">
                    <div className="text-center p-8 rounded-2xl bg-slate-50">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Lock className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-4">Максимальная безопасность</h3>
                        <p className="text-slate-600">
                            Шифрование end-to-end, соответствие GDPR, ISO 27001, SOC 2. Ваши документы никогда не покидают контролируемую среду.
                        </p>
                    </div>

                    <div className="text-center p-8 rounded-2xl bg-slate-50">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Globe className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-4">Приватное развёртывание</h3>
                        <p className="text-slate-600">
                            On-premise или в вашем облаке. Полный контроль над данными, интеграция с существующей инфраструктурой.
                        </p>
                    </div>

                    <div className="text-center p-8 rounded-2xl bg-slate-50">
                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
                            <Users className="w-8 h-8 text-blue-600" />
                        </div>
                        <h3 className="text-xl font-semibold text-slate-900 mb-4">SSO и управление</h3>
                        <p className="text-slate-600">
                            Интеграция с Active Directory, SAML, OAuth. Централизованное управление пользователями и правами доступа.
                        </p>
                    </div>
                </div>

                {/* Features Grid */}
                <div className="bg-slate-50 rounded-3xl p-12 mb-20">
                    <h2 className="text-3xl font-bold text-slate-900 text-center mb-12">
                        Корпоративные возможности
                    </h2>

                    <div className="grid md:grid-cols-2 gap-8">
                        <div className="space-y-6">
                            <div className="flex items-start space-x-4">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Белый лейбл</h3>
                                    <p className="text-slate-600">Настройте интерфейс под ваш бренд с логотипом, цветами и доменом.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">API интеграции</h3>
                                    <p className="text-slate-600">REST API для интеграции с вашими системами документооборота.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Аудит и логирование</h3>
                                    <p className="text-slate-600">Полная история действий пользователей для соответствия требованиям.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Масштабируемость</h3>
                                    <p className="text-slate-600">От сотен до десятков тысяч пользователей с гарантированной производительностью.</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="flex items-start space-x-4">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Резервное копирование</h3>
                                    <p className="text-slate-600">Автоматическое резервное копирование с возможностью восстановления.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">SLA гарантии</h3>
                                    <p className="text-slate-600">99.9% uptime с компенсациями за простои и круглосуточной поддержкой.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Обучение команды</h3>
                                    <p className="text-slate-600">Персональные тренинги и материалы для быстрого внедрения.</p>
                                </div>
                            </div>

                            <div className="flex items-start space-x-4">
                                <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                <div>
                                    <h3 className="font-semibold text-slate-900 mb-2">Персональный менеджер</h3>
                                    <p className="text-slate-600">Выделенный менеджер для решения любых вопросов и потребностей.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Security & Compliance */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-6">
                            Безопасность и соответствие
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">SOC 2 Type II сертификация</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">ISO 27001 соответствие</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">GDPR готовность</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">Шифрование AES-256</span>
                            </div>
                            <div className="flex items-center space-x-3">
                                <Shield className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">Регулярные пентесты</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 rounded-2xl p-8">
                        <h3 className="text-xl font-semibold text-slate-900 mb-4">
                            Доверие крупных компаний
                        </h3>
                        <p className="text-slate-600 mb-6">
                            Более 500 корпораций по всему миру уже используют Kelbetty для безопасной работы с документами.
                        </p>
                        <div className="text-sm text-slate-500">
                            * Имена клиентов предоставляются по запросу с соблюдением NDA
                        </div>
                    </div>
                </div>

                {/* Deployment Options */}
                <div className="bg-slate-900 rounded-3xl p-12 text-white mb-20">
                    <h2 className="text-3xl font-bold text-center mb-12">
                        Варианты развёртывания
                    </h2>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Globe className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Облачное</h3>
                            <p className="text-slate-300">
                                Размещение в нашем защищённом облаке с выделенными ресурсами для вашей организации.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Lock className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">Гибридное</h3>
                            <p className="text-slate-300">
                                Часть функций в облаке, критичные данные остаются в вашей инфраструктуре.
                            </p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                <Shield className="w-8 h-8 text-white" />
                            </div>
                            <h3 className="text-xl font-semibold mb-4">On-Premise</h3>
                            <p className="text-slate-300">
                                Полное развёртывание в вашей инфраструктуре с максимальным контролем.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Support */}
                <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
                    <div className="bg-blue-50 rounded-2xl p-8">
                        <HeadphonesIcon className="w-12 h-12 text-blue-600 mb-6" />
                        <h3 className="text-2xl font-semibold text-slate-900 mb-4">
                            Премиум поддержка
                        </h3>
                        <p className="text-slate-600">
                            Круглосуточная поддержка, время отклика менее 1 часа для критичных проблем,
                            персональный канал связи с командой разработки.
                        </p>
                    </div>

                    <div>
                        <h3 className="text-2xl font-semibold text-slate-900 mb-6">
                            Что включено
                        </h3>
                        <ul className="space-y-3">
                            <li className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">Приоритетная техподдержка 24/7</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">Персональный менеджер аккаунта</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">Обучение и онбординг</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">Помощь с интеграцией</span>
                            </li>
                            <li className="flex items-center space-x-3">
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-slate-700">Регулярные консультации</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* CTA */}
                <div className="text-center bg-blue-600 rounded-3xl p-12 text-white">
                    <h2 className="text-3xl font-bold mb-6">
                        Готовы обсудить корпоративное решение?
                    </h2>
                    <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
                        Наша команда поможет подобрать оптимальную конфигурацию для вашей организации
                        и проведёт демонстрацию всех возможностей.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <a
                            href="mailto:enterprise@kelbetty.ai"
                            className="inline-flex items-center rounded-xl px-8 py-4 bg-white text-blue-600 text-lg font-semibold hover:bg-blue-50 transition-colors shadow-lg"
                        >
                            <Zap className="w-5 h-5 mr-2" />
                            Запросить демо
                        </a>
                        <a
                            href="tel:+74951234567"
                            className="inline-flex items-center rounded-xl px-8 py-4 border-2 border-white text-white text-lg font-semibold hover:bg-white hover:text-blue-600 transition-colors"
                        >
                            <HeadphonesIcon className="w-5 h-5 mr-2" />
                            +7 (495) 123-45-67
                        </a>
                    </div>
                </div>
            </main>
        </div>
    )
}
