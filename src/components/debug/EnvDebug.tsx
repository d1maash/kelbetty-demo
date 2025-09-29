'use client'

export default function EnvDebug() {
    return (
        <div className="bg-slate-100 p-4 rounded-lg">
            <h3 className="font-semibold mb-2">Переменные окружения:</h3>
            <div className="text-sm space-y-1">
                <p>NEXT_PUBLIC_ONLYOFFICE_ENABLED: {process.env.NEXT_PUBLIC_ONLYOFFICE_ENABLED || 'не задано'}</p>
                <p>NODE_ENV: {process.env.NODE_ENV}</p>
                <p>NEXT_PUBLIC_APP_URL: {process.env.NEXT_PUBLIC_APP_URL || 'не задано'}</p>
            </div>
        </div>
    )
}
