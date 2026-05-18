'use client'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ROLE_LABELS, getDashboardPath } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import NotificationBell from '@/components/NotificationBell'

const navItems = [
  {
    group: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', icon: '⊞', roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
    ]
  },
  {
    group: 'Inventory',
    items: [
      { href: '/admin/products', label: 'Products', icon: '📦', roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER'] },
      { href: '/admin/inventory', label: 'Inventory Matrix', icon: '📊', roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/admin/stock-in', label: 'Stock In', icon: '⬇️', roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/admin/stock-adjustments', label: 'Stock Adjustments', icon: '⚖️', roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/admin/stock-journal', label: 'Stock Journal', icon: '📜', roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF','FINANCE'] },
    ]
  },
  {
    group: 'Stock Requests',
    items: [
      { href: '/admin/stock-out', label: 'All Requests', icon: '📋', roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
      { href: '/admin/my-requests', label: 'My Requests', icon: '📤', roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
      { href: '/admin/new-request', label: 'New Request', icon: '➕', roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
    ]
  },
  {
    group: 'Activity',
    items: [
      { href: '/admin/notifications', label: 'Notifications', icon: '🔔', roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF','FINANCE'] },
    ]
  },
  {
    group: 'Customers',
    items: [
      { href: '/admin/customer-orders', label: 'Order Requests', icon: '🛍️', roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/gallery', label: 'View Gallery', icon: '🖼️', roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
    ]
  },
  {
    group: 'Sales & POS',
    items: [
      { href: '/admin/pos', label: 'Point of Sale', icon: '🛒', roles: ['SUPER_ADMIN','ADMIN','SHOP_STAFF'] },
      { href: '/admin/sales', label: 'Sales History', icon: '🧾', roles: ['SUPER_ADMIN','ADMIN','MANAGER','FINANCE','SHOP_STAFF'] },
    ]
  },
  {
    group: 'Finance',
    items: [
      { href: '/admin/finance/dashboard', label: 'Finance Overview', icon: '💰', roles: ['SUPER_ADMIN','ADMIN','FINANCE'] },
      { href: '/admin/finance/reviews', label: 'Tally Reviews', icon: '🧾', roles: ['SUPER_ADMIN','ADMIN','FINANCE'] },
    ]
  },
  {
    group: 'Reports',
    items: [
      { href: '/admin/reports', label: 'Reports', icon: '📈', roles: ['SUPER_ADMIN','ADMIN','MANAGER','FINANCE'] },
      { href: '/admin/reports/audit-logs', label: 'Audit Logs', icon: '📜', roles: ['SUPER_ADMIN','ADMIN'] },
    ]
  },
  {
    group: 'Settings',
    items: [
      { href: '/admin/settings/users', label: 'Users', icon: '👥', roles: ['SUPER_ADMIN','ADMIN'] },
      { href: '/admin/settings/locations', label: 'Locations', icon: '🏭', roles: ['SUPER_ADMIN','ADMIN'] },
      { href: '/admin/settings/categories', label: 'Categories', icon: '🏷️', roles: ['SUPER_ADMIN','ADMIN'] },
      { href: '/admin/settings/suppliers', label: 'Suppliers', icon: '🚛', roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
    ]
  },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session, status } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [time, setTime] = useState(new Date())
  const [mounted, setMounted] = useState(false)
  const role = session?.user?.role || ''

  // Redirect to login if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login')
    }
  }, [status, router])

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const filtered = navItems.map(g => ({
    ...g,
    items: g.items.filter(i => i.roles.includes(role))
  })).filter(g => g.items.length > 0)

  const Sidebar = (
    <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-linear-to-b from-indigo-900 via-navy-900 to-slate-950 flex h-full flex-col`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <div className="text-white font-bold text-sm leading-tight">Madeena Tex</div>
            <div className="text-indigo-300 text-xs">{ROLE_LABELS[role] || role}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {filtered.map(group => (
          <div key={group.group} className="mb-3">
            {sidebarOpen && (
              <div className="text-indigo-400 text-[10px] font-semibold uppercase tracking-widest px-3 py-1">
                {group.group}
              </div>
            )}
            {group.items.map(item => {
              const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={!sidebarOpen ? item.label : undefined}
                  className={`sidebar-item min-h-11 ${active ? 'active' : ''} ${!sidebarOpen ? 'justify-center px-2' : ''}`}
                >
                  <span className="text-base shrink-0">{item.icon}</span>
                  {sidebarOpen && <span className="truncate">{item.label}</span>}
                </Link>
              )
            })}
          </div>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex ${sidebarOpen ? 'items-center gap-3' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(session?.user?.name || 'U')}
          </div>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <div className="text-white text-sm font-medium truncate">{session?.user?.name}</div>
              <div className="text-indigo-300 text-xs truncate">{session?.user?.email}</div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="text-indigo-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.05),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#ffffff_48%,#eef4ff_100%)] text-slate-900">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-full">
        {Sidebar}
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 lg:hidden flex flex-col w-64 transform transition-transform duration-300 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {Sidebar}
      </div>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <header className="surface-card-soft mx-3 mt-3 flex shrink-0 items-center justify-between px-4 py-3 sm:mx-4 sm:px-6 sm:py-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              aria-label="Open navigation"
              className="lg:hidden min-h-11 min-w-11 flex items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            {/* Desktop collapse */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
              className="hidden lg:flex min-h-11 min-w-11 items-center justify-center rounded-xl hover:bg-slate-100 text-slate-500 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <nav className="hidden sm:flex items-center gap-1 text-sm text-slate-500">
              <span>Madeena Tex</span>
              <span>/</span>
              <span className="text-slate-900 font-medium capitalize mr-4">
                {pathname.split('/').filter(Boolean).pop()?.replace(/-/g, ' ') || 'Dashboard'}
              </span>
              <div className="bg-slate-100 px-3 py-1 rounded-full font-mono text-xs text-indigo-600 border border-slate-200">
                {mounted ? time.toLocaleTimeString('en-LK', { hour12: true, hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '--:--:--'}
              </div>
            </nav>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <Link href="/gallery" target="_blank" className="btn-secondary btn-sm hidden sm:flex min-h-11 items-center">
              🖼️ Gallery
            </Link>
            <Link href="/admin/new-request" className="btn-primary min-h-11 px-4 py-2 text-sm sm:text-base flex items-center whitespace-nowrap">
              + New Request
            </Link>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
