import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { authConfig } from '@/lib/auth.config'

const { auth } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
})

const PUBLIC_PATHS = ['/', '/gallery', '/login', '/signup', '/api/auth']

function getRequestOrigin(req: Parameters<typeof auth>[0]) {
  const forwardedHost = req.headers.get('x-forwarded-host')
  const host = forwardedHost ?? req.headers.get('host')
  const forwardedProto = req.headers.get('x-forwarded-proto')
  const protocol = forwardedProto ?? req.nextUrl.protocol.replace(':', '') ?? 'http'

  if (host) {
    return `${protocol}://${host}`
  }

  return req.nextUrl.origin
}

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const session = req.auth
  const origin = getRequestOrigin(req)

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
