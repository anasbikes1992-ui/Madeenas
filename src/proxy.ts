import NextAuth from 'next-auth'
import { NextResponse } from 'next/server'
import { getDashboardPath } from '@/lib/constants'

const { auth } = NextAuth({
  providers: [],
  callbacks: {
    jwt({ token }) { return token },
    session({ session }) { return session },
  },
})

export default auth((req) => {
  const { nextUrl, auth: session } = req as any
  const isLoggedIn = !!session?.user
  const role = session?.user?.role as string | undefined
  const path = nextUrl.pathname

  // Public paths
  const publicPaths = ['/login', '/gallery', '/api/auth']
  const isPublic = publicPaths.some(p => path.startsWith(p))

  if (!isLoggedIn && !isPublic) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // If logged-in user hits /login, redirect to their dashboard
  if (isLoggedIn && path === '/login') {
    return NextResponse.redirect(new URL(getDashboardPath(role || ''), nextUrl))
  }

  // Finance can only access /finance/* and /admin/reports
  if (role === 'FINANCE') {
    if (!path.startsWith('/finance') && !path.startsWith('/api') && !path.startsWith('/admin/reports')) {
      return NextResponse.redirect(new URL('/finance/dashboard', nextUrl))
    }
  }

  // CUSTOMER only accesses /gallery
  if (role === 'CUSTOMER') {
    if (!path.startsWith('/gallery') && !path.startsWith('/api')) {
      return NextResponse.redirect(new URL('/gallery', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
