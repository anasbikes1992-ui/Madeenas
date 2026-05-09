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
  updatedAt: string
  product: {
    name: string
    sku: string
    unit: string
    category?: { name: string }
  }
}

type SaleInfo = {
  receiptNo: string
  createdAt: string
  totalAmount: number
} | null

type LocationItem = {
  id: string
  name: string
  code: string
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
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [fulfillLocationId, setFulfillLocationId] = useState('')
  const [fulfillPaymentMode, setFulfillPaymentMode] = useState('CASH')
  const [fulfilling, setFulfilling] = useState(false)
  const [fulfilledSale, setFulfilledSale] = useState<SaleInfo>(null)

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

  useEffect(() => {
    fetch('/api/locations')
      .then((res) => res.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : []
        setLocations(list)
      })
      .catch(() => {
        setLocations([])
      })
  }, [])

  async function saveOrder() {
    if (!selected) return
    setSaving(true)
    try {
      const body: { status?: string; quotedPrice?: number | null } = {}
      if (editStatus && editStatus !== selected.status) body.status = editStatus
      if (editQuote.trim() !== '') {
        const parsedQuote = parseFloat(editQuote)
        if (Number.isNaN(parsedQuote)) {
          alert('Quoted price must be a valid number')
          setSaving(false)
          return
        }
        body.quotedPrice = parsedQuote
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

  async function fulfillOrder() {
    if (!selected) return
    if (!fulfillLocationId) {
      alert('Please select a location for fulfillment')
      return
    }

    setFulfilling(true)
    try {
      const parsedUnitPrice = editQuote.trim() ? parseFloat(editQuote) : undefined
      if (parsedUnitPrice !== undefined && Number.isNaN(parsedUnitPrice)) {
        alert('Quoted price must be a valid number before fulfillment')
        return
      }

      const res = await fetch(`/api/customer-orders/${selected.id}/fulfill`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          locationId: fulfillLocationId,
          paymentMode: fulfillPaymentMode,
          unitPrice: parsedUnitPrice,
        }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 409) {
          alert(`Order already fulfilled. Receipt: ${data.sale?.receiptNo || 'N/A'}`)
          setFulfilledSale(data.sale || null)
        } else {
          alert(data.error || 'Could not fulfill order')
        }
        return
      }

      const updated = data.order
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? { ...o, ...updated } : o)))
      setSelected((current) => (current ? { ...current, ...updated } : current))
      setFulfilledSale(data.sale || null)
      alert(`Order fulfilled and sale posted (${data.sale?.receiptNo || 'receipt created'})`)
    } catch (error) {
      console.error('Fulfill order error:', error)
      alert('An error occurred while fulfilling the order')
    } finally {
      setFulfilling(false)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <section className="rounded-4xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">Customer requests</p>
            <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Orders from the public gallery, organized for fast review and fulfillment.</h1>
            <p className="text-sm leading-7 text-slate-600">This workspace keeps the quote-to-fulfillment flow visible, with customer requests, pricing changes, and completion handling in one place.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-136">
            {[
              ['Total', String(total)],
              ['New', String(orders.filter((order) => order.status === 'NEW').length)],
              ['Closed', String(orders.filter((order) => order.status === 'CLOSED').length)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <label className="text-sm font-medium text-slate-600">Status</label>
          <select
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
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
      </section>

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
                        setFulfillLocationId('')
                        setFulfillPaymentMode('CASH')
                        setFulfilledSale(null)
                        // Check if order has fulfillment note
                        if (o.note && o.note.includes('[Fulfilled as sale')) {
                          const match = o.note.match(/sale ([A-Z0-9-]+)/)
                          if (match) {
                            fetch(`/api/sales?receiptNo=${match[1]}`)
                              .then(r => r.json())
                              .then(data => {
                                if (data.sales?.[0]) {
                                  setFulfilledSale(data.sales[0])
                                }
                              })
                              .catch(() => {})
                          }
                        }
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
            {fulfilledSale && (
              <div className="rounded-lg bg-green-50 border border-green-200 p-4 mb-4">
                <p className="text-sm font-semibold text-green-900 mb-1">✓ Order Fulfilled</p>
                <p className="text-xs text-green-700">Receipt: {fulfilledSale.receiptNo}</p>
                <p className="text-xs text-green-700">Amount: Rs. {fulfilledSale.totalAmount}</p>
                <p className="text-xs text-green-600">Date: {new Date(fulfilledSale.createdAt).toLocaleString()}</p>
              </div>
            )}
            {selected.status !== 'CLOSED' && (
              <>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fulfillment location</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 mb-4"
              value={fulfillLocationId}
              onChange={(e) => setFulfillLocationId(e.target.value)}
            >
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.code})
                </option>
              ))}
            </select>
            <label className="block text-sm font-medium text-slate-700 mb-1">Payment mode for sale</label>
            <select
              className="w-full rounded-lg border border-slate-200 px-3 py-2 mb-6"
              value={fulfillPaymentMode}
              onChange={(e) => setFulfillPaymentMode(e.target.value)}
            >
              {['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'].map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
              </>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              {selected.status !== 'CLOSED' && (
                <button type="button" className="btn-secondary" disabled={fulfilling || saving} onClick={() => void fulfillOrder()}>
                  {fulfilling ? 'Fulfilling…' : 'Fulfill & Post Sale'}
                </button>
              )}
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
