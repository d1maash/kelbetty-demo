import { auth } from '@clerk/nextjs'
import { redirect } from 'next/navigation'
import { UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import { FileText } from 'lucide-react'

export default function AppLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const { userId } = auth()

    if (!userId) {
        redirect('/sign-in')
    }

    return (
        <div className="h-screen bg-white flex flex-col">
            {/* Top Header */}
            <header className="border-b border-slate-200 bg-white px-6 py-3">
                <div className="flex items-center justify-between">
                    <Link href="/" className="flex items-center space-x-2">
                        <FileText className="h-6 w-6 text-blue-600" />
                        <span className="text-lg font-bold text-slate-900">Kelbetty</span>
                    </Link>
                    <div className="flex items-center space-x-4">
                        <Link
                            href="/prising"
                            className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
                        >
                            Обновить план
                        </Link>
                        <UserButton
                            appearance={{
                                elements: {
                                    avatarBox: 'w-8 h-8'
                                }
                            }}
                        />
                    </div>
                </div>
            </header>

            {/* Main App Content */}
            <div className="flex-1 overflow-hidden">
                {children}
            </div>
        </div>
    )
}
