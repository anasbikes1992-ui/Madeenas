'use client'
import { useEffect, useRef, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { PremiumCard } from '@/components/ui/PremiumCard'
import { GoldButton } from '@/components/ui/GoldButton'
import { NavyButton } from '@/components/ui/NavyButton'
import { motion } from 'framer-motion'
import { Package, Clock, AlertTriangle, ShoppingBag } from 'lucide-react'

const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
}

interface DashboardStats {
  totalProducts: number
  totalLocations: number
  pendingRequests: number
  newCustomerOrders: number
  lowStockCount: number
  totalStockUnits: number
  recentStockIns: any[]
  recentStockOuts: any[]
  lowStockItems: any[]
}

const STATUS_CLASSES: Record<string, string> = {
  PENDING: 'badge-amber',
  APPROVED: 'badge-blue',
  DISPATCHED: 'badge-indigo',
  ACKNOWLEDGED: 'badge-green',
  REJECTED: 'badge-red',
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [csvBusy, setCsvBusy] = useState(false)
  const [csvMessage, setCsvMessage] = useState<string | null>(null)
  const [approving, setApproving] = useState<Set<string>>(new Set())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  async function loadStats() {
    setError(null)
    try {
      const r = await fetch('/api/dashboard')
      if (!r.ok) throw new Error(`Dashboard API error: ${r.status}`)
      const data = await r.json()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadStats() }, [])

  async function handleApprove(id: string) {
    setApproving(prev => new Set(prev).add(id))
    await fetch(`/api/stock-out/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setApproving(prev => { const next = new Set(prev); next.delete(id); return next })
    void loadStats()
  }

  async function handleReject(id: string) {
    setApproving(prev => new Set(prev).add(id))
    await fetch(`/api/stock-out/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejectionReason: 'Rejected from dashboard' }),
    })
    setApproving(prev => { const next = new Set(prev); next.delete(id); return next })
    void loadStats()
  }

  async function exportCsv() {
    setCsvBusy(true)
    setCsvMessage(null)
    try {
      const response = await fetch('/api/dashboard/export')
      if (!response.ok) throw new Error('Export failed')

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `dashboard-export-${new Date().toISOString().slice(0, 10)}.csv`
      anchor.click()
      URL.revokeObjectURL(url)
      setCsvMessage('CSV export downloaded.')
    } catch (error) {
      console.error('CSV export error:', error)
      setCsvMessage('CSV export failed.')
    } finally {
      setCsvBusy(false)
    }
  }

  async function downloadTemplate() {
    setCsvBusy(true)
    setCsvMessage(null)

    try {
      const response = await fetch('/api/dashboard/import-template')
      if (!response.ok) {
        throw new Error('Template download failed')
      }

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'import-template.csv'
      anchor.click()
      URL.revokeObjectURL(url)
      setCsvMessage('Template downloaded successfully.')
    } catch (error) {
      console.error('Template download error:', error)
      setCsvMessage('Template download failed.')
    } finally {
      setCsvBusy(false)
    }
  }

  async function importCsv(file: File) {
    setCsvBusy(true)
    setCsvMessage(null)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/dashboard/import', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(result.error || 'CSV import failed')
      }

      setCsvMessage(`CSV import complete. Imported: ${result.imported}, Failed: ${result.failed}`)
      const data = await fetch('/api/dashboard').then((r) => r.json())
      setStats(data)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CSV import failed.'
      console.error('CSV import error:', error)
      setCsvMessage(message)
    } finally {
      setCsvBusy(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="card h-28 bg-slate-100" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="card h-64 bg-slate-100" />
          <div className="card h-64 bg-slate-100" />
        </div>
      </div>
    )
  }

  if (!stats) return (
    <div className="p-8 text-center">
      <p className="text-red-500 font-medium">{error || 'No dashboard data available.'}</p>
      <button onClick={() => { setLoading(true); void loadStats() }} className="mt-4 btn-secondary btn-sm">Retry</button>
    </div>
  )

  const statCards = [
    {
      label: 'Total Products',
      value: stats.totalProducts,
      Icon: Package,
      gradient: 'from-sky-500 to-indigo-600',
      cardTone: 'from-sky-50 via-white to-indigo-50',
      change: 'Active SKUs',
    },
    {
      label: 'Pending Requests',
      value: stats.pendingRequests,
      Icon: Clock,
      gradient: 'from-amber-500 to-orange-600',
      cardTone: 'from-amber-50 via-white to-orange-50',
      change: 'Awaiting approval',
    },
    {
      label: 'Low Stock Items',
      value: stats.lowStockCount,
      Icon: AlertTriangle,
      gradient: 'from-rose-500 to-red-600',
      cardTone: 'from-rose-50 via-white to-red-50',
      change: 'Need restocking',
    },
    {
      label: 'Customer Orders',
      value: stats.newCustomerOrders,
      Icon: ShoppingBag,
      gradient: 'from-emerald-500 to-teal-600',
      cardTone: 'from-emerald-50 via-white to-teal-50',
      change: 'New inquiries',
    },
  ]

  return (
    <motion.div 
      className="space-y-8"
      initial="hidden"
      animate="visible"
      variants={stagger}
    >
      {/* Header */}
      <motion.div
        variants={fadeIn}
        className="relative overflow-hidden rounded-[1.75rem] border border-sky-100 bg-[linear-gradient(120deg,#ffffff_0%,#f6fbff_52%,#eef5ff_100%)] p-6 shadow-[0_20px_54px_rgba(30,64,175,0.12)]"
      >
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-sky-200/40 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-16 left-20 h-36 w-36 rounded-full bg-amber-200/30 blur-2xl" />
        <div>
          <h1 className="text-4xl font-heading font-bold text-navy-900">
            Dashboard
          </h1>
          <p className="text-navy-600/70 text-lg mt-2">Overview of your inventory and operations</p>
        </div>
        <div className="flex gap-3">
          <input
            ref={fileInputRef}
            id="csv-import-input"
            type="file"
            accept=".csv,.xlsx,.xls"
            aria-label="Import CSV file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (file) {
                void importCsv(file)
              }
            }}
          />
          <NavyButton
            variant="outline"
            size="sm"
            onClick={() => void downloadTemplate()}
            disabled={csvBusy}
          >
            {csvBusy ? 'Working...' : 'Download Template'}
          </NavyButton>
          <NavyButton
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={csvBusy}
          >
            Upload CSV
          </NavyButton>
          <NavyButton
            variant="outline"
            size="sm"
            onClick={() => void exportCsv()}
            disabled={csvBusy}
          >
            Export CSV
          </NavyButton>
          <a href="/admin/stock-in">
            <NavyButton size="sm">Stock In</NavyButton>
          </a>
          <a href="/admin/new-request">
            <GoldButton size="sm">+ New Request</GoldButton>
          </a>
        </div>
      </motion.div>
      {csvMessage ? <motion.p variants={fadeIn} className="text-sm text-navy-600">{csvMessage}</motion.p> : null}

      {/* Stat cards */}
      <motion.div variants={fadeIn} className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map(s => (
          <PremiumCard key={s.label} hover className={`bg-[linear-gradient(145deg,var(--tw-gradient-stops))] ${s.cardTone} border border-white/70`}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-navy-600/70 mb-2 font-medium">{s.label}</p>
                <p className="text-4xl font-bold text-navy-900 mb-1">{s.value.toLocaleString()}</p>
                <p className="text-xs text-navy-500">{s.change}</p>
              </div>
              <div className={`p-4 rounded-xl bg-gradient-to-br ${s.gradient} shadow-premium`}>
                <s.Icon className="w-6 h-6 text-white" strokeWidth={1.75} />
              </div>
            </div>
          </PremiumCard>
        ))}
      </motion.div>

      <motion.div variants={fadeIn} className="grid lg:grid-cols-2 gap-6">
        {/* Recent Stock Out Requests */}
        <PremiumCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-navy-900">Recent Stock Requests</h2>
            <a href="/admin/stock-out" className="text-gold-600 text-sm font-semibold hover:text-gold-700 transition">
              View all →
            </a>
          </div>
          {stats.recentStockOuts.length === 0 ? (
            <p className="text-navy-400 text-sm text-center py-12">No requests yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentStockOuts.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-sky-50 via-white to-indigo-50/60 rounded-xl border border-sky-100 hover:border-indigo-200 transition-all">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-navy-100 flex items-center justify-center text-navy-600 shrink-0"><Package className="w-5 h-5" strokeWidth={1.75} /></div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-900 truncate">{req.product.name}</p>
                      <p className="text-xs text-navy-600/70">
                        {req.fromLocation.name} · by {req.requestedByUser?.name || '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 ml-2 shrink-0">
                    <div className="text-right">
                      <span className={STATUS_CLASSES[req.status] || 'badge-gray'}>{req.status}</span>
                      <p className="text-xs text-navy-500 mt-1">{formatDate(req.createdAt)}</p>
                    </div>
                    {req.status === 'PENDING' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => void handleApprove(req.id)}
                          disabled={approving.has(req.id)}
                          className="text-xs py-2 px-3 rounded-lg font-semibold bg-emerald-500 text-white hover:bg-emerald-600 transition-colors disabled:opacity-50 shadow-sm"
                        >
                          ✓
                        </button>
                        <button
                          onClick={() => void handleReject(req.id)}
                          disabled={approving.has(req.id)}
                          className="text-xs py-2 px-3 rounded-lg font-semibold bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50 shadow-sm"
                        >
                          ✗
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </PremiumCard>

        {/* Recent Stock In */}
        <PremiumCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-navy-900">Recent Stock In</h2>
            <a href="/admin/stock-in" className="text-gold-600 text-sm font-semibold hover:text-gold-700 transition">
              View all →
            </a>
          </div>
          {stats.recentStockIns.length === 0 ? (
            <p className="text-navy-400 text-sm text-center py-12">No stock entries yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentStockIns.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 via-white to-teal-50 rounded-xl border border-emerald-100 hover:border-teal-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-navy-900 truncate">{entry.product.name}</p>
                    <p className="text-xs text-navy-600/70">To {entry.location.name}</p>
                  </div>
                  <div className="text-right ml-3">
                    <span className="text-lg font-bold text-emerald-600">+{entry.quantity}</span>
                    <p className="text-xs text-navy-500 mt-1">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PremiumCard>

        {/* Low Stock Alerts */}
        <PremiumCard>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-navy-900">⚠️ Low Stock Alerts</h2>
            <a href="/admin/inventory" className="text-gold-600 text-sm font-semibold hover:text-gold-700 transition">
              View inventory →
            </a>
          </div>
          {stats.lowStockItems.length === 0 ? (
            <p className="text-emerald-600 text-sm text-center py-12 font-semibold">✅ All stocks healthy</p>
          ) : (
            <div className="space-y-3">
              {stats.lowStockItems.map((s: any) => (
                <div key={`${s.productId}-${s.locationId}`} className="flex items-center justify-between p-4 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100 hover:border-red-200 transition-all">
                  <div>
                    <p className="text-sm font-semibold text-navy-900">{s.product.name}</p>
                    <p className="text-xs text-navy-600/70">{s.location.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-red-600">{s.quantity} {s.product.unit}</span>
                    <p className="text-xs text-navy-500">Threshold: {s.product.lowStockAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </PremiumCard>

        {/* Quick Actions */}
        <PremiumCard>
          <h2 className="text-xl font-bold text-navy-900 mb-6">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { href: '/admin/products', label: 'Add Product', icon: '📦', gradient: 'from-navy-500 to-navy-600' },
              { href: '/admin/stock-in', label: 'Record Stock In', icon: '⬇️', gradient: 'from-emerald-500 to-emerald-600' },
              { href: '/admin/new-request', label: 'Request Stock', icon: '📤', gradient: 'from-gold-500 to-gold-600' },
              { href: '/admin/reports', label: 'View Reports', icon: '📈', gradient: 'from-purple-500 to-purple-600' },
              { href: '/admin/customer-orders', label: 'Customer Orders', icon: '🛍️', gradient: 'from-pink-500 to-pink-600' },
              { href: '/finance/dashboard', label: 'Finance', icon: '💰', gradient: 'from-teal-500 to-teal-600' },
            ].map(a => (
              <a
                key={a.href}
                href={a.href}
                className={`flex items-center gap-3 p-4 bg-gradient-to-br ${a.gradient} text-white rounded-xl shadow-premium hover:shadow-premium-lg transition-all font-semibold text-sm`}
              >
                <span className="text-2xl">{a.icon}</span>
                <span>{a.label}</span>
              </a>
            ))}
          </div>
        </PremiumCard>
      </motion.div>
    </motion.div>
  )
}
