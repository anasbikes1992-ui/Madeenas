import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
})

const PUBLIC_PATHS = [
  '/',
  '/gallery',
  '/login',
  '/signup',
  '/customer/login',
  '/customer/signup',
]

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const session = req.auth
  const origin = nextUrl.origin

  const isPublic = PUBLIC_PATHS.some((path) => (path === '/' ? pathname === '/' : pathname.startsWith(path)))
  if (isPublic) return NextResponse.next()

  if (!session) {
    const loginUrl = new URL('/login', origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = session?.user?.role as string | undefined

  if (
    role === 'FINANCE' &&
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/finance') &&
    !pathname.startsWith('/admin/sales') &&
    !pathname.startsWith('/admin/reports') &&
    !pathname.startsWith('/admin/dashboard')
  ) {
    return NextResponse.redirect(new URL('/finance/dashboard', origin))
  }

  if (role === 'CUSTOMER' && pathname.startsWith('/admin')) {
    return NextResponse.redirect(new URL('/', origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox).*)'],
}
