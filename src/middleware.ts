import { authMiddleware } from '@clerk/nextjs'

export default authMiddleware({
    // Публичные маршруты, которые не требуют аутентификации
    publicRoutes: [
        '/',
        '/pricing',
        '/prising',
        '/enterprise',
        '/sign-in(.*)',
        '/sign-up(.*)',
        '/api/webhooks(.*)'
    ],

    // Игнорировать эти маршруты полностью
    ignoredRoutes: [
        '/api/webhooks(.*)',
        '/((?!api|trpc))(_next.*|.+\\.[\\w]+$)'
    ],

    // Перенаправлять неаутентифицированных пользователей на sign-in
    // при попытке доступа к защищённым маршрутам
    afterAuth(auth, req, evt) {
        // Если пользователь не аутентифицирован и пытается попасть в /app
        if (!auth.userId && req.nextUrl.pathname.startsWith('/app')) {
            const signInUrl = new URL('/sign-in', req.url)
            signInUrl.searchParams.set('redirect_url', req.url)
            return Response.redirect(signInUrl)
        }

        // Если пользователь аутентифицирован и находится на странице входа/регистрации
        if (auth.userId && (req.nextUrl.pathname === '/sign-in' || req.nextUrl.pathname === '/sign-up')) {
            return Response.redirect(new URL('/app', req.url))
        }
    }
})

export const config = {
    matcher: ['/((?!.+\\.[\\w]+$|_next).*)', '/', '/(api|trpc)(.*)'],
}
