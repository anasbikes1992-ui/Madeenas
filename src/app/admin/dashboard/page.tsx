'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

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

  useEffect(() => {
    fetch('/api/dashboard')
      .then(r => r.json())
      .then(data => { setStats(data); setLoading(false) })
  }, [])

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

  if (!stats) return null

  const statCards = [
    { label: 'Total Products', value: stats.totalProducts, icon: '📦', color: 'bg-indigo-50 text-indigo-600', change: 'Active SKUs' },
    { label: 'Pending Requests', value: stats.pendingRequests, icon: '⏳', color: 'bg-amber-50 text-amber-600', change: 'Awaiting approval' },
    { label: 'Low Stock Items', value: stats.lowStockCount, icon: '⚠️', color: 'bg-red-50 text-red-600', change: 'Need restocking' },
    { label: 'Customer Orders', value: stats.newCustomerOrders, icon: '🛍️', color: 'bg-emerald-50 text-emerald-600', change: 'New inquiries' },
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500 text-sm mt-0.5">Overview of your textile stock operations</p>
        </div>
        <div className="flex gap-2">
          <a href="/admin/stock-in" className="btn-secondary btn-sm">⬇️ Stock In</a>
          <a href="/admin/new-request" className="btn-primary btn-sm">+ New Request</a>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <div key={s.label} className="card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 mb-1">{s.label}</p>
                <p className="text-3xl font-bold text-slate-900">{s.value.toLocaleString()}</p>
                <p className="text-xs text-slate-400 mt-1">{s.change}</p>
              </div>
              <div className={`p-3 rounded-xl ${s.color}`}>
                <span className="text-xl">{s.icon}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Recent Stock Out Requests */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Stock Requests</h2>
            <a href="/admin/stock-out" className="text-indigo-600 text-sm hover:underline">View all →</a>
          </div>
          {stats.recentStockOuts.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No requests yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentStockOuts.map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{req.product.name}</p>
                    <p className="text-xs text-slate-500">
                      {req.fromLocation.name} → by {req.requestedByUser.name}
                    </p>
                  </div>
                  <div className="text-right ml-3">
                    <span className={STATUS_CLASSES[req.status] || 'badge-gray'}>{req.status}</span>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(req.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Stock In */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Recent Stock In</h2>
            <a href="/admin/stock-in" className="text-indigo-600 text-sm hover:underline">View all →</a>
          </div>
          {stats.recentStockIns.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No stock entries yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentStockIns.map((entry: any) => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{entry.product.name}</p>
                    <p className="text-xs text-slate-500">To {entry.location.name}</p>
                  </div>
                  <div className="text-right ml-3">
                    <span className="font-bold text-emerald-600">+{entry.quantity}</span>
                    <p className="text-xs text-slate-400 mt-1">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alerts */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">⚠️ Low Stock Alerts</h2>
            <a href="/admin/inventory" className="text-indigo-600 text-sm hover:underline">View inventory →</a>
          </div>
          {stats.lowStockItems.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">✅ All stocks healthy</p>
          ) : (
            <div className="space-y-3">
              {stats.lowStockItems.map((s: any) => (
                <div key={`${s.productId}-${s.locationId}`} className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.product.name}</p>
                    <p className="text-xs text-slate-500">{s.location.name}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-red-600">{s.quantity} {s.product.unit}</span>
                    <p className="text-xs text-slate-400">Threshold: {s.product.lowStockAt}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              { href: '/admin/products', label: 'Add Product', icon: '📦', color: 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' },
              { href: '/admin/stock-in', label: 'Record Stock In', icon: '⬇️', color: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100' },
              { href: '/admin/new-request', label: 'Request Stock', icon: '📤', color: 'bg-amber-50 text-amber-700 hover:bg-amber-100' },
              { href: '/admin/reports', label: 'View Reports', icon: '📈', color: 'bg-purple-50 text-purple-700 hover:bg-purple-100' },
              { href: '/admin/customer-orders', label: 'Customer Orders', icon: '🛍️', color: 'bg-pink-50 text-pink-700 hover:bg-pink-100' },
              { href: '/finance/dashboard', label: 'Finance', icon: '💰', color: 'bg-teal-50 text-teal-700 hover:bg-teal-100' },
            ].map(a => (
              <a
                key={a.href}
                href={a.href}
                className={`flex items-center gap-3 p-4 rounded-xl font-medium text-sm transition-colors ${a.color}`}
              >
                <span className="text-xl">{a.icon}</span>
                <span>{a.label}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
