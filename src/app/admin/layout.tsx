'use client'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Package, BarChart2, ArrowDownToLine, SlidersHorizontal,
  BookOpen, ArrowLeftRight, Bell, History,
  ShoppingBag, Image, ShoppingCart, Receipt, DollarSign, TrendingUp,
  FileText, Users, Building2, Tag, Boxes, Database,
} from 'lucide-react'
import { ROLE_LABELS, getDashboardPath } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import NotificationBell from '@/components/NotificationBell'
import ThemeToggle from '@/components/ThemeToggle'

interface NavItem {
  href: string
  label: string
  Icon: LucideIcon
  roles: string[]
}

interface NavGroup {
  group: string
  items: NavItem[]
}

const navItems: NavGroup[] = [
  {
    group: 'Overview',
    items: [
      { href: '/admin/dashboard', label: 'Dashboard', Icon: LayoutDashboard, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
    ]
  },
  {
    group: 'Inventory',
    items: [
      { href: '/admin/products', label: 'Products', Icon: Package, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER'] },
      { href: '/admin/inventory', label: 'Inventory Matrix', Icon: BarChart2, roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/admin/stock-in', label: 'Stock In', Icon: ArrowDownToLine, roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/admin/stock-adjustments', label: 'Adjustments', Icon: SlidersHorizontal, roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/admin/stock-journal', label: 'Stock Journal', Icon: BookOpen, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF','FINANCE'] },
    ]
  },
  {
    group: 'Transfers',
    items: [
      { href: '/admin/transfers', label: 'All Transfers', Icon: ArrowLeftRight, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
      { href: '/admin/transfers/new', label: 'New Transfer', Icon: ArrowDownToLine, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
    ]
  },
  {
    group: 'Activity',
    items: [
      { href: '/admin/notifications', label: 'Notifications', Icon: Bell, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF','FINANCE'] },
      { href: '/admin/history', label: 'History', Icon: History, roles: ['SUPER_ADMIN'] },
    ]
  },
  {
    group: 'Customers',
    items: [
      { href: '/admin/customer-orders', label: 'Order Requests', Icon: ShoppingBag, roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/gallery', label: 'View Gallery', Icon: Image, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
    ]
  },
  {
    group: 'Sales & POS',
    items: [
      { href: '/admin/pos', label: 'Point of Sale', Icon: ShoppingCart, roles: ['SUPER_ADMIN','ADMIN','SHOP_STAFF'] },
      { href: '/admin/sales', label: 'Sales History', Icon: Receipt, roles: ['SUPER_ADMIN','ADMIN','MANAGER','FINANCE','SHOP_STAFF'] },
    ]
  },
  {
    group: 'Finance',
    items: [
      { href: '/admin/finance/dashboard', label: 'Finance Overview', Icon: DollarSign, roles: ['SUPER_ADMIN','ADMIN','FINANCE'] },
    ]
  },
  {
    group: 'Reports',
    items: [
      { href: '/admin/reports', label: 'Reports', Icon: BarChart2, roles: ['SUPER_ADMIN','ADMIN','MANAGER','FINANCE'] },
      { href: '/admin/reports/audit-logs', label: 'Audit Logs', Icon: FileText, roles: ['SUPER_ADMIN','ADMIN'] },
    ]
  },
  {
    group: 'Settings',
    items: [
      { href: '/admin/settings/users', label: 'Users', Icon: Users, roles: ['SUPER_ADMIN','ADMIN'] },
      { href: '/admin/settings/locations', label: 'Locations', Icon: Building2, roles: ['SUPER_ADMIN','ADMIN'] },
      { href: '/admin/settings/categories', label: 'Categories', Icon: Tag, roles: ['SUPER_ADMIN','ADMIN'] },
      { href: '/admin/settings/units', label: 'Units Matrix', Icon: Boxes, roles: ['SUPER_ADMIN'] },
      { href: '/admin/settings/suppliers', label: 'Suppliers', Icon: Boxes, roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
      { href: '/admin/settings/backup', label: 'Backup & Data', Icon: Database, roles: ['SUPER_ADMIN','ADMIN'] },
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
    <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 glass-sidebar flex h-full flex-col`}>
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[var(--border)]">
        <div className="w-9 h-9 rounded-[12px] bg-[var(--primary)] flex items-center justify-center shrink-0 shadow-[0_4px_12px_rgba(0,82,255,0.3)]">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        </div>
        {sidebarOpen && (
          <div className="overflow-hidden">
            <div className="text-[var(--text)] font-black text-sm leading-tight tracking-tight">NEXUS</div>
            <div className="text-[var(--text-muted)] text-[10px] uppercase font-semibold tracking-widest">{ROLE_LABELS[role] || role}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-2">
        {filtered.map((group, groupIdx) => {
          return (
            <div key={group.group} className="mb-4">
              {sidebarOpen && (
                <div className="px-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--text-muted)] opacity-70">{group.group}</span>
                </div>
              )}
              {group.items.map(item => {
                const active = pathname === item.href || (item.href !== '/admin/dashboard' && pathname.startsWith(item.href))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={!sidebarOpen ? item.label : undefined}
                    className={`flex items-center gap-3 rounded-[12px] px-3 py-2.5 text-sm font-semibold transition-all duration-300 mb-1 ${
                      active 
                        ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--primary-soft)] text-white shadow-[0_4px_14px_0_rgba(0,82,255,0.25)] dark:shadow-[0_4px_14px_0_rgba(77,124,255,0.2)]'
                        : 'text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] hover:shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:hover:bg-[var(--surface-muted)]'
                    } ${!sidebarOpen ? 'justify-center px-0' : ''}`}
                  >
                    <div className={active ? 'bg-white/20 p-1.5 rounded-[8px] backdrop-blur-sm' : 'p-1.5'}>
                      <item.Icon className="w-4.5 h-4.5 shrink-0" strokeWidth={active ? 2.5 : 2} />
                    </div>
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-muted)]/30">
        <div className={`flex ${sidebarOpen ? 'items-center gap-3' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-[10px] bg-[var(--border-strong)] flex items-center justify-center text-[var(--text)] text-xs font-black shrink-0">
            {getInitials(session?.user?.name || 'U')}
          </div>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <div className="text-[var(--text)] text-sm font-bold truncate">{session?.user?.name}</div>
              <div className="text-[var(--text-muted)] text-[10px] truncate">{session?.user?.email}</div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="text-[var(--text-muted)] hover:text-[var(--destructive)] transition-colors p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  )

  return (
    <div className="flex h-screen overflow-hidden bg-transparent">
      {/* Desktop sidebar */}
      <div className="hidden lg:flex flex-col h-full z-10 shadow-[4px_0_24px_rgba(0,0,0,0.02)]">
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
      <div className="flex-1 flex flex-col h-full relative z-0 min-w-0">
        {/* Topbar */}
        <header className="glass-nav sticky top-0 z-30 flex shrink-0 items-center justify-between px-6 py-4 shadow-[0_4px_20px_rgba(0,0,0,0.02)]">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(o => !o)}
              className="p-2 -ml-2 rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] lg:hidden transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Desktop toggle */}
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="hidden lg:block p-2 -ml-2 rounded-[10px] text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-[var(--text)] transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
              </svg>
            </button>

            {/* Breadcrumbs */}
            <div className="hidden md:flex items-center gap-2 text-sm font-semibold">
              <span className="text-[var(--text-muted)]">Nexus</span>
              <span className="text-[var(--border-strong)]">/</span>
              <span className="text-[var(--text)] capitalize">
                {pathname.split('/').filter(Boolean).pop()?.replace('-', ' ')}
              </span>
            </div>
            
            {/* Clock */}
            {mounted && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--border)] text-[10px] font-mono font-bold tracking-widest text-[var(--text-muted)] shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
                {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <Link href="/admin/transfers/new" className="btn-primary py-2 px-4 text-xs">
              <span className="mr-1 text-lg leading-none">+</span> New Request
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 custom-scrollbar relative z-0">
          {children}
        </main>
      </div>
    </div>
  )
}
