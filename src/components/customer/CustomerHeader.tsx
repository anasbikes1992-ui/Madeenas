'use client'

import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { ShoppingCart, Package, ClipboardList, LogOut, Menu, X, User } from 'lucide-react'

export function CustomerHeader() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const [cartCount, setCartCount] = useState(0)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/cart')
      .then(r => r.json())
      .then(d => {
        const items = d?.data?.items ?? []
        setCartCount(items.length)
      })
      .catch(() => {})
  }, [status, pathname])

  // Don't render header on login/signup pages
  if (pathname?.startsWith('/customer/login') || pathname?.startsWith('/customer/signup')) {
    return null
  }

  const navLinks = [
    { href: '/customer/products', label: 'Products', icon: Package },
    { href: '/customer/orders', label: 'My Orders', icon: ClipboardList },
  ]

  const isActive = (href: string) => pathname?.startsWith(href)

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_2px_20px_rgba(15,23,42,0.06)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/customer/products" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white text-xs font-bold shadow-md group-hover:scale-105 transition-transform">
              M
            </div>
            <span className="font-bold text-slate-900 text-sm hidden sm:block">Madeena Store</span>
          </Link>

          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  isActive(href)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-2">
            {/* Cart */}
            <Link
              href="/customer/cart"
              className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                isActive('/customer/cart')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:block">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-sm">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* User + Sign out */}
            {status === 'authenticated' && session?.user && (
              <div className="hidden md:flex items-center gap-2 pl-2 border-l border-slate-200 ml-1">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50">
                  <User className="w-3.5 h-3.5 text-slate-500" />
                  <span className="text-xs font-medium text-slate-700 max-w-[100px] truncate">
                    {session.user.name ?? session.user.email}
                  </span>
                </div>
                <button
                  onClick={() => void signOut({ callbackUrl: '/customer/login' })}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="md:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="md:hidden border-t border-slate-100 py-3 space-y-1 pb-4">
            {navLinks.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  isActive(href)
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {status === 'authenticated' && (
              <button
                onClick={() => void signOut({ callbackUrl: '/customer/login' })}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
          </div>
        )}
      </div>
    </header>
  )
}
