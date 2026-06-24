'use client'
import { usePathname, useRouter } from 'next/navigation'
import { signOut, useSession } from 'next-auth/react'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Package, BarChart2, ArrowDownToLine, SlidersHorizontal,
  BookOpen, ClipboardList, Send, PlusCircle, Truck, Bell, History,
  ShoppingBag, Image, ShoppingCart, Receipt, DollarSign, TrendingUp,
  FileText, Users, Building2, Tag, Boxes,
} from 'lucide-react'
import { ROLE_LABELS, getDashboardPath } from '@/lib/constants'
import { getInitials } from '@/lib/utils'
import NotificationBell from '@/components/NotificationBell'

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
    group: 'Stock Requests',
    items: [
      { href: '/admin/stock-out', label: 'All Requests', Icon: ClipboardList, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
      { href: '/admin/my-requests', label: 'My Requests', Icon: Send, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
      { href: '/admin/new-request', label: 'New Request', Icon: PlusCircle, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
      { href: '/admin/send-stock', label: 'Send Stock', Icon: Truck, roles: ['SUPER_ADMIN','ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF'] },
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
      { href: '/admin/finance/reviews', label: 'Tally Reviews', Icon: TrendingUp, roles: ['SUPER_ADMIN','ADMIN','FINANCE'] },
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
      { href: '/admin/settings/suppliers', label: 'Suppliers', Icon: Boxes, roles: ['SUPER_ADMIN','ADMIN','MANAGER'] },
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
    <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} transition-all duration-300 bg-linear-to-b from-navy-950 via-navy-900 to-navy-950 flex h-full flex-col`}>
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
            <div className="text-navy-300 text-xs">{ROLE_LABELS[role] || role}</div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-0.5">
        {filtered.map((group, groupIdx) => {
          // Colorful gradient palettes for each group
          const groupColors = [
            { from: 'from-sky-500', to: 'to-blue-600', text: 'text-sky-100', glow: 'shadow-sky-500/20' },
            { from: 'from-emerald-500', to: 'to-teal-600', text: 'text-emerald-100', glow: 'shadow-emerald-500/20' },
            { from: 'from-amber-500', to: 'to-orange-600', text: 'text-amber-100', glow: 'shadow-amber-500/20' },
            { from: 'from-purple-500', to: 'to-pink-600', text: 'text-purple-100', glow: 'shadow-purple-500/20' },
            { from: 'from-rose-500', to: 'to-red-600', text: 'text-rose-100', glow: 'shadow-rose-500/20' },
            { from: 'from-cyan-500', to: 'to-blue-600', text: 'text-cyan-100', glow: 'shadow-cyan-500/20' },
            { from: 'from-indigo-500', to: 'to-purple-600', text: 'text-indigo-100', glow: 'shadow-indigo-500/20' },
            { from: 'from-lime-500', to: 'to-green-600', text: 'text-lime-100', glow: 'shadow-lime-500/20' },
            { from: 'from-fuchsia-500', to: 'to-purple-600', text: 'text-fuchsia-100', glow: 'shadow-fuchsia-500/20' },
          ];
          const colors = groupColors[groupIdx % groupColors.length];

          return (
            <div key={group.group} className="mb-3">
              {sidebarOpen && (
                <div className={`bg-gradient-to-r ${colors.from} ${colors.to} ${colors.text} text-[10px] font-bold uppercase tracking-widest px-3 py-2 rounded-lg mb-1 shadow-md ${colors.glow}`}>
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
                    <item.Icon className="w-[18px] h-[18px] shrink-0" strokeWidth={1.75} />
                    {sidebarOpen && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          );
        })}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-white/10">
        <div className={`flex ${sidebarOpen ? 'items-center gap-3' : 'justify-center'}`}>
          <div className="w-9 h-9 rounded-xl bg-navy-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(session?.user?.name || 'U')}
          </div>
          {sidebarOpen && (
            <div className="flex-1 overflow-hidden">
              <div className="text-white text-sm font-medium truncate">{session?.user?.name}</div>
              <div className="text-navy-300 text-xs truncate">{session?.user?.email}</div>
            </div>
          )}
          {sidebarOpen && (
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              title="Sign out"
              className="text-navy-400 hover:text-white transition-colors"
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
              <div className="bg-slate-100 px-3 py-1 rounded-full font-mono text-xs text-navy-600 border border-slate-200">
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
