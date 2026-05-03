import { auth } from '@/lib/auth'
import { NextResponse } from 'next/server'

const PUBLIC_PATHS = ['/login', '/api/auth', '/api/seed']

export default auth((req) => {
  const { nextUrl } = req
  const pathname = nextUrl.pathname
  const session = req.auth

  // Allow public paths
  const isPublic = PUBLIC_PATHS.some(p => pathname.startsWith(p))
  if (isPublic) return NextResponse.next()

  // Not authenticated → redirect to login
  if (!session) {
    const loginUrl = new URL('/login', nextUrl.origin)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const role = session?.user?.role as string | undefined

  // Finance users can only access finance/sales/reports pages within admin
  if (
    role === 'FINANCE' &&
    pathname.startsWith('/admin') &&
    !pathname.startsWith('/admin/finance') &&
    !pathname.startsWith('/admin/sales') &&
    !pathname.startsWith('/admin/reports') &&
    !pathname.startsWith('/admin/dashboard')
  ) {
    return NextResponse.redirect(new URL('/finance/dashboard', nextUrl.origin))
  }

  // Customer users can only access /gallery
  if (role === 'CUSTOMER' && !pathname.startsWith('/gallery')) {
    return NextResponse.redirect(new URL('/gallery', nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|sw.js|workbox).*)',
  ],
}
