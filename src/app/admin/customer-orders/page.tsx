'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { toast } from 'sonner'

type CustomerOrderStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED'

type CustomerOrder = {
  id: string
  orderNumber: string
  status: CustomerOrderStatus
  createdAt: string
  updatedAt: string
  subTotal: number
  taxAmount: number
  grandTotal: number
  taxRate: number
  shippingAddress: string
  phoneNumber: string
  note: string | null
  customer: {
    name: string
    email: string
  }
  sale?: {
    receiptNo: string
    createdAt: string
    totalAmount: number
  } | null
  items: Array<{
    id: string
    quantity: number
    unitPrice: number
    product: {
      id: string
      name: string
      sku: string
      unit: string
      category?: { name: string } | null
    }
  }>
}

type LocationItem = {
  id: string
  name: string
  code: string
}

const STATUS_BADGE: Record<CustomerOrderStatus, string> = {
  PENDING: 'badge-amber',
  APPROVED: 'badge-blue',
  PROCESSING: 'badge-indigo',
  SHIPPED: 'badge-purple',
  DELIVERED: 'badge-green',
  CANCELLED: 'badge-red',
  REFUNDED: 'badge-gray',
}

const ALL_STATUSES: CustomerOrderStatus[] = [
  'PENDING',
  'APPROVED',
  'PROCESSING',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED',
  'REFUNDED',
]

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [search, setSearch] = useState('')
  const [todayOnly, setTodayOnly] = useState(false)
  const [selected, setSelected] = useState<CustomerOrder | null>(null)
  const [editStatus, setEditStatus] = useState<CustomerOrderStatus>('PENDING')
  const [editQuote, setEditQuote] = useState('')
  const [saving, setSaving] = useState(false)
  const [locations, setLocations] = useState<LocationItem[]>([])
  const [fulfillLocationId, setFulfillLocationId] = useState('')
  const [fulfillPaymentMode, setFulfillPaymentMode] = useState('CASH')
  const [fulfilling, setFulfilling] = useState(false)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [bulkBusy, setBulkBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const q = new URLSearchParams({ limit: '100' })
      if (statusFilter) q.set('status', statusFilter)
      const res = await fetch(`/api/customer-orders?${q.toString()}`)
      if (!res.ok) throw new Error('Failed to load orders')
      const data = await res.json()
      setOrders(data.orders || [])
      setTotal(data.total ?? 0)
      setSelectedIds([])
    } catch {
      setOrders([])
      setTotal(0)
      toast.error('Could not load customer orders')
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
      .then((data) => setLocations(Array.isArray(data) ? data : []))
      .catch(() => setLocations([]))
  }, [])

  const filteredOrders = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return orders.filter((order) => {
      const primaryItem = order.items[0]
      const matchesText =
        !needle ||
        order.orderNumber.toLowerCase().includes(needle) ||
        order.customer.name.toLowerCase().includes(needle) ||
        order.customer.email.toLowerCase().includes(needle) ||
        (order.phoneNumber || '').toLowerCase().includes(needle) ||
        primaryItem?.product.name.toLowerCase().includes(needle) ||
        primaryItem?.product.sku.toLowerCase().includes(needle)

      if (!matchesText) return false
      if (!todayOnly) return true

      const created = new Date(order.createdAt)
      const now = new Date()
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth() &&
        created.getDate() === now.getDate()
      )
    })
  }, [orders, search, todayOnly])

  const pendingCount = filteredOrders.filter((order) => order.status === 'PENDING').length
  const deliveredCount = filteredOrders.filter((order) => order.status === 'DELIVERED').length
  const todayRevenue = filteredOrders
    .filter((order) => {
      if (order.status !== 'DELIVERED') return false
      const created = new Date(order.createdAt)
      const now = new Date()
      return (
        created.getFullYear() === now.getFullYear() &&
        created.getMonth() === now.getMonth() &&
        created.getDate() === now.getDate()
      )
    })
    .reduce((sum, order) => sum + order.grandTotal, 0)

  async function saveOrder() {
    if (!selected) return
    setSaving(true)
    try {
      if (editStatus === selected.status) return

      const res = await fetch(`/api/customer-orders/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: editStatus }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        toast.error(err.error || 'Update failed')
        return
      }

      const updated = await res.json()
      setOrders((prev) => prev.map((order) => (order.id === updated.id ? { ...order, ...updated } : order)))
      setSelected((current) => (current ? { ...current, ...updated } : current))
      toast.success('Order status updated')
    } finally {
      setSaving(false)
    }
  }

  async function fulfillOrder() {
    if (!selected) return
    if (!fulfillLocationId) {
      toast.error('Please select a location for fulfillment')
      return
    }

    setFulfilling(true)
    try {
      const parsedUnitPrice = editQuote.trim() ? parseFloat(editQuote) : undefined
      if (parsedUnitPrice !== undefined && Number.isNaN(parsedUnitPrice)) {
        toast.error('Quoted price must be a valid number')
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
        toast.error(data.error || 'Could not fulfill order')
        return
      }

      const updated = data.order
      setOrders((prev) => prev.map((order) => (order.id === updated.id ? { ...order, ...updated } : order)))
      setSelected((current) => (current ? { ...current, ...updated } : current))
      toast.success(`Order fulfilled and sale posted (${data.sale?.receiptNo || 'receipt created'})`)
    } catch {
      toast.error('An error occurred while fulfilling the order')
    } finally {
      setFulfilling(false)
    }
  }

  async function bulkApproveSelected() {
    if (selectedIds.length === 0) return
    setBulkBusy(true)
    try {
      const targets = filteredOrders.filter((order) => selectedIds.includes(order.id) && order.status === 'PENDING')
      if (targets.length === 0) {
        toast.error('Only pending orders can be bulk-approved')
        return
      }

      const results = await Promise.all(
        targets.map((order) =>
          fetch(`/api/customer-orders/${order.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' }),
          })
        )
      )

      const failed = results.filter((result) => !result.ok).length
      if (failed > 0) {
        toast.error(`Approved ${targets.length - failed} orders. ${failed} failed.`)
      } else {
        toast.success(`Approved ${targets.length} orders successfully`)
      }

      await load()
    } finally {
      setBulkBusy(false)
    }
  }

  function toggleSelect(orderId: string, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) return Array.from(new Set([...current, orderId]))
      return current.filter((id) => id !== orderId)
    })
  }

  function toggleSelectAll(checked: boolean) {
    if (!checked) {
      setSelectedIds([])
      return
    }
    setSelectedIds(filteredOrders.map((order) => order.id))
  }

  return (
    <div className="space-y-6 fade-in">
      <section className="rounded-4xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">Customer requests</p>
            <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Order management built for fast-moving operations.</h1>
            <p className="text-sm leading-7 text-slate-600">Search quickly, bulk-approve pending requests, and fulfill confirmed orders into sales with complete LKR + VAT visibility.</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:min-w-136">
            {[
              ['Total Orders', String(total)],
              ['Pending Orders', String(pendingCount)],
              ['Today\'s Sales', formatCurrency(todayRevenue)],
            ].map(([label, value]) => (
              <div key={label} className="flex flex-col rounded-[1.25rem] border border-slate-200/80 bg-white p-5 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by order, customer, SKU..."
            className="input lg:col-span-2"
            aria-label="Search customer orders"
          />

          <select
            id="status-filter"
            aria-label="Filter by status"
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All statuses</option>
            {ALL_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setTodayOnly((current) => !current)}
            className={`btn ${todayOnly ? 'btn-primary' : 'btn-secondary'}`}
            aria-pressed={todayOnly}
          >
            Today only
          </button>

          <button type="button" className="btn-secondary" onClick={() => void load()}>
            Refresh
          </button>
        </div>
      </section>

      <section className="card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-slate-800">Filtered Orders: {filteredOrders.length}</p>
            <p className="text-xs text-slate-500">Delivered: {deliveredCount} · Pending: {pendingCount}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-primary"
              onClick={() => void bulkApproveSelected()}
              disabled={bulkBusy || selectedIds.length === 0}
            >
              {bulkBusy ? 'Approving...' : `Approve Selected (${selectedIds.length})`}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-500">Loading customer orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-16 text-center">
            <h2 className="text-xl font-bold text-slate-700 mb-2">No orders found</h2>
            <p className="text-slate-500">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-slate-500">
                  <th className="py-3 pr-4">
                    <input
                      type="checkbox"
                      aria-label="Select all filtered orders"
                      checked={filteredOrders.length > 0 && selectedIds.length === filteredOrders.length}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                    />
                  </th>
                  <th className="py-3 pr-4">Date</th>
                  <th className="py-3 pr-4">Order</th>
                  <th className="py-3 pr-4">Customer</th>
                  <th className="py-3 pr-4">Products</th>
                  <th className="py-3 pr-4">Total</th>
                  <th className="py-3 pr-4">Status</th>
                  <th className="py-3"> </th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((order) => {
                  const firstItem = order.items[0]
                  const hasMoreItems = order.items.length > 1
                  const isSelected = selectedIds.includes(order.id)

                  return (
                    <tr key={order.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 pr-4">
                        <input
                          type="checkbox"
                          aria-label={`Select order ${order.orderNumber}`}
                          checked={isSelected}
                          onChange={(e) => toggleSelect(order.id, e.target.checked)}
                        />
                      </td>
                      <td className="py-3 pr-4 whitespace-nowrap">{formatDate(order.createdAt)}</td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-800">{order.orderNumber}</div>
                        <div className="text-xs text-slate-500">{order.phoneNumber || 'No phone'}</div>
                      </td>
                      <td className="py-3 pr-4">
                        <div className="font-medium text-slate-800">{order.customer.name}</div>
                        <div className="text-xs text-slate-500">{order.customer.email}</div>
                      </td>
                      <td className="py-3 pr-4">
                        {firstItem ? (
                          <>
                            <div className="font-medium">{firstItem.product.name}</div>
                            <div className="text-xs text-slate-500">{firstItem.product.sku}</div>
                            {hasMoreItems && <div className="text-xs text-slate-500 mt-1">+{order.items.length - 1} more item(s)</div>}
                          </>
                        ) : (
                          <span className="text-slate-500">No items</span>
                        )}
                      </td>
                      <td className="py-3 pr-4 font-semibold">{formatCurrency(order.grandTotal)}</td>
                      <td className="py-3 pr-4">
                        <span className={`badge ${STATUS_BADGE[order.status]}`}>{order.status}</span>
                      </td>
                      <td className="py-3">
                        <button
                          type="button"
                          className="text-blue-600 hover:underline text-sm"
                          onClick={() => {
                            setSelected(order)
                            setEditStatus(order.status)
                            setEditQuote(order.items[0]?.unitPrice ? String(order.items[0].unitPrice) : '')
                            setFulfillLocationId('')
                            setFulfillPaymentMode('CASH')
                          }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
          <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-2">Order detail</h3>
            <p className="text-sm text-slate-600 mb-4">
              {selected.orderNumber} · {selected.customer.name}
            </p>

            <div className="mb-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-2">Items</p>
              <div className="space-y-2">
                {selected.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-medium text-slate-800">{item.product.name}</p>
                      <p className="text-xs text-slate-500">{item.product.sku}</p>
                    </div>
                    <p className="text-slate-700">{item.quantity} {item.product.unit}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="edit-status" className="block text-sm font-medium text-slate-700 mb-1">Status</label>
                <select
                  id="edit-status"
                  aria-label="Order status"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as CustomerOrderStatus)}
                >
                  {ALL_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="unit-price" className="block text-sm font-medium text-slate-700 mb-1">Unit price override (optional)</label>
                <input
                  id="unit-price"
                  type="number"
                  step="0.01"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2"
                  placeholder="Used during fulfill"
                  value={editQuote}
                  onChange={(e) => setEditQuote(e.target.value)}
                />
              </div>
            </div>

            {!['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(selected.status) && (
              <div className="mb-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 mb-3">Fulfill order</p>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label htmlFor="fulfill-location" className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                    <select
                      id="fulfill-location"
                      aria-label="Fulfillment location"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
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
                  </div>

                  <div>
                    <label htmlFor="payment-mode" className="block text-sm font-medium text-slate-700 mb-1">Payment mode</label>
                    <select
                      id="payment-mode"
                      aria-label="Payment mode"
                      className="w-full rounded-lg border border-slate-200 px-3 py-2"
                      value={fulfillPaymentMode}
                      onChange={(e) => setFulfillPaymentMode(e.target.value)}
                    >
                      {['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT'].map((mode) => (
                        <option key={mode} value={mode}>
                          {mode}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-secondary" onClick={() => setSelected(null)}>
                Close
              </button>
              {!['DELIVERED', 'CANCELLED', 'REFUNDED'].includes(selected.status) && (
                <button type="button" className="btn-secondary" disabled={fulfilling || saving} onClick={() => void fulfillOrder()}>
                  {fulfilling ? 'Fulfilling...' : 'Fulfill & Post Sale'}
                </button>
              )}
              <button type="button" className="btn-primary" disabled={saving} onClick={() => void saveOrder()}>
                {saving ? 'Saving...' : 'Save Status'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
