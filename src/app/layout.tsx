import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const inter = Inter({ subsets: ['latin', 'cyrillic'] })

export const metadata: Metadata = {
    title: 'Kelbetty — ИИ-редактор документов с сохранением стиля',
    description: 'Интеллектуальный сервис для импорта, редактирования и экспорта документов (Word, PowerPoint, Excel, PDF) с сохранением исходного стиля и управлением через чат с ИИ.',
    keywords: 'документы, редактор, ИИ, Word, PowerPoint, Excel, PDF, стиль, форматирование',
}

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <ClerkProvider>
            <html lang="ru">
                <body className={`${inter.className} bg-white text-slate-900 antialiased`}>
                    {children}
                </body>
            </html>
        </ClerkProvider>
    )
}
