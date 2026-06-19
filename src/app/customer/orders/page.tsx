'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge'
import { formatCurrency } from '@/lib/tax'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'
import { Pagination } from '@/components/shared/Pagination'
import { Package } from 'lucide-react'

const PAGE_LIMIT = 10

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  grandTotal: number
  items: { product: { name: string } }[]
}

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
]

export default function OrdersPage() {
  const { status: sessionStatus } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const totalPages = Math.ceil(total / PAGE_LIMIT)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') router.push('/customer/login')
  }, [sessionStatus, router])

  const loadOrders = useCallback(async () => {
    if (sessionStatus !== 'authenticated') return
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) })
      if (statusFilter) params.set('status', statusFilter)
      const res = await fetch(`/api/orders?${params}`)
      const data = await res.json()
      if (data.success) {
        setOrders(data.data || [])
        setTotal(data.total || data.data?.length || 0)
      }
    } catch {
      console.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }, [sessionStatus, page, statusFilter])

  useEffect(() => {
    void loadOrders()
  }, [loadOrders])

  const handleStatusChange = (s: string) => {
    setStatusFilter(s)
    setPage(1)
  }

  if (sessionStatus === 'loading') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="card"><TableSkeleton rows={5} columns={4} /></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Orders</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total > 0 ? `${total} order${total !== 1 ? 's' : ''}` : 'Your order history'}
          </p>
        </div>
        <select
          value={statusFilter}
          onChange={e => handleStatusChange(e.target.value)}
          className="input w-auto min-w-[160px]"
        >
          {STATUS_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Content */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="p-6"><TableSkeleton rows={5} columns={4} /></div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
              <Package className="w-8 h-8 text-indigo-400" />
            </div>
            <h3 className="font-semibold text-slate-700 mb-1">
              {statusFilter ? 'No orders with this status' : 'No orders yet'}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {statusFilter
                ? 'Try a different status filter or clear it.'
                : 'Start shopping to create your first order!'}
            </p>
            {statusFilter ? (
              <button onClick={() => handleStatusChange('')} className="btn-secondary">
                Clear Filter
              </button>
            ) : (
              <Link href="/customer/products" className="btn-primary">
                Browse Products
              </Link>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {orders.map(order => (
              <Link
                key={order.id}
                href={`/customer/orders/${order.id}`}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-slate-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                      {order.orderNumber}
                    </span>
                    <OrderStatusBadge status={order.status as never} />
                  </div>
                  <p className="text-sm text-slate-500">
                    {new Date(order.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                    <span className="mx-2 text-slate-300">·</span>
                    {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <p className="text-lg font-bold text-slate-900">{formatCurrency(order.grandTotal)}</p>
                  <span className="text-slate-300 group-hover:text-indigo-400 transition-colors text-lg">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={p => {
            setPage(p)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          total={total}
          limit={PAGE_LIMIT}
        />
      )}
    </div>
  )
}
