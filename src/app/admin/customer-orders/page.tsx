'use client'

import { useCallback, useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

type CustomerOrder = {
  id: string
  status: string
  customerName: string
  customerEmail: string
  customerPhone: string | null
  quantity: number
  quotedPrice: number | null
  colorPreference: string | null
  note: string | null
  createdAt: string
  product: {
    name: string
    sku: string
    unit: string
    category?: { name: string }
  }
}

const STATUS_BADGE: Record<string, string> = {
  NEW: 'badge-purple',
  REVIEWED: 'badge-blue',
  QUOTED: 'badge-teal',
  CONFIRMED: 'badge-green',
  CLOSED: 'badge-gray',
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState<CustomerOrder | null>(null)
  const [editStatus, setEditStatus] = useState('')
  const [editQuote, setEditQuote] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ limit: '50' })
      if (statusFilter) q.set('status', statusFilter)
      const res = await fetch(`/api/customer-orders?${q}`)
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setOrders(data.orders || [])
      setTotal(data.total ?? 0)
    } catch {
      setOrders([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void load()
  }, [load])

  async function saveOrder() {
    if (!selected) return
    setSaving(true)
    try {
      const body: { status?: string; quotedPrice?: number | null } = {}
      if (editStatus && editStatus !== selected.status) body.status = editStatus
      if (editQuote.trim() !== '') {
        body.quotedPrice = parseFloat(editQuote)
      } else if (selected.quotedPrice != null && editQuote === '') {
        body.quotedPrice = null
      }
      if (!body.status && body.quotedPrice === undefined) {
        setSaving(false)
        return
      }
      const res = await fetch(`/api/customer-orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(err.error || 'Update failed')
        return
      }
      const updated = await res.json()
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      setSelected(updated)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Customer order requests</h1>
          <p className="text-sm text-slate-500">Inquiries from the public gallery ({total} total)</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-slate-600">Status</label>
          <select
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All</option>
            <option value="NEW">NEW</option>
            <option value="REVIEWED">REVIEWED</option>
            <option value="QUOTED">QUOTED</option>
            <option value="CONFIRMED">CONFIRMED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <button type="button" className="btn-secondary text-sm" onClick={() => void load()}>
            Refresh
          </button>
          <a href="/gallery" target="_blank" className="btn-primary text-sm" rel="noreferrer">
            Open gallery
          </a>
        </div>
      </div>

      {loading ? (
        <div className="card py-12 text-center text-slate-500">Loading…</div>
      ) : orders.length === 0 ? (
        <div className="card text-center py-16">
          <h2 className="text-xl font-bold text-slate-700 mb-2">No orders yet</h2>
          <p className="text-slate-500 mb-6">Submissions from the gallery will appear here.</p>
          <a href="/gallery" target="_blank" className="btn-primary" rel="noreferrer">
            View customer gallery
          </a>
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-3 pr-4">Date</th>
                <th className="py-3 pr-4">Customer</th>
                <th className="py-3 pr-4">Product</th>
                <th className="py-3 pr-4">Qty</th>
                <th className="py-3 pr-4">Quote</th>
                <th className="py-3 pr-4">Status</th>
                <th className="py-3"> </th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50">
                  <td className="py-3 pr-4 whitespace-nowrap">{formatDate(o.createdAt)}</td>
                  <td className="py-3 pr-4">
                    <div className="font-medium text-slate-800">{o.customerName}</div>
                    <div className="text-xs text-slate-500">{o.customerEmail}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <div className="font-medium">{o.product.name}</div>
                    <div className="text-xs text-slate-500">{o.product.sku}</div>
                  </td>
                  <td className="py-3 pr-4">
                    {o.quantity} {o.product.unit}
                  </td>
                  <td className="py-3 pr-4">{o.quotedPrice != null ? `Rs. ${o.quotedPrice}` : '—'}</td>
                  <td className="py-3 pr-4">
                    <span className={`badge ${STATUS_BADGE[o.status] || 'badge-gray'}`}>{o.status}</span>
                  </td>
                  <td className="py-3">
                    <button
                      type="button"
                      className="text-blue-600 hover:underline text-sm"
                      onClick={() => {
                        setSelected(o)
                        setEditStatus(o.status)
                        setEditQuote(o.quotedPrice != null ? String(o.quotedPrice) : '')
                      }}
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Order detail</h3>
            <p className="text-sm text-slate-600 mb-4">
              {selected.product.name} · {selected.quantity} {selected.product.unit}
            </p>
            <div className="space-y-3 text-sm mb-6">
              <div>
                <span className="text-slate-500">Customer:</span> {selected.customerName} ({selected.customerEmail})
              </div>
              {selected.customerPhone && (
                <div>
                  <span className="text-slate-500">Phone:</span> {selected.customerPhone}
                </div>
              )}
              {selected.colorPreference && (
                <div>
                  <span className="text-slate-500">Color:</span> {selected.colorPreference}
                </div>
              )}
              {selected.note && (
                <div>
                  <span className="text-slate-500">Note:</span> {selected.note}
                </div>
              )}
            </div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Status</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 mb-4"
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
            >
              {['NEW', 'REVIEWED', 'QUOTED', 'CONFIRMED', 'CLOSED'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-slate-700 mb-1">Quoted price (optional)</label>
            <input
              type="number"
              step="0.01"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 mb-6"
              placeholder="Leave empty to clear"
              value={editQuote}
              onChange={(e) => setEditQuote(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveOrder()}>
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
