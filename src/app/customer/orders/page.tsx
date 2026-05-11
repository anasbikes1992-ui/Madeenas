'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge'
import { formatCurrency } from '@/lib/tax'
import { EmptyState } from '@/components/shared/EmptyState'
import { TableSkeleton } from '@/components/shared/LoadingSkeleton'

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  grandTotal: number
  items: { product: { name: string } }[]
}

export default function OrdersPage() {
  const { status: sessionStatus } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('')

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/customer/login')
    } else if (sessionStatus === 'authenticated') {
      loadOrders()
    }
  }, [sessionStatus, router, statusFilter])

  const loadOrders = async () => {
    try {
      const params = new URLSearchParams()
      if (statusFilter) params.append('status', statusFilter)

      const res = await fetch(`/api/orders?${params.toString()}`)
      const data = await res.json()

      if (data.success) {
        setOrders(data.data)
      }
    } catch (error) {
      console.error('Failed to load orders:', error)
    } finally {
      setLoading(false)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <TableSkeleton rows={5} columns={4} />
          </div>
        </div>
      </div>
    )
  }

  if (orders.length === 0 && !statusFilter) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <EmptyState
          icon="📦"
          title="No orders yet"
          description="You haven't placed any orders. Start shopping to create your first order!"
          action={{
            label: 'Browse Products',
            onClick: () => router.push('/customer/products')
          }}
        />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-3xl font-bold text-slate-900">My Orders</h1>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="PROCESSING">Processing</option>
              <option value="SHIPPED">Shipped</option>
              <option value="DELIVERED">Delivered</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          {orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">🔍</div>
              <p className="text-slate-600">No orders found with this status</p>
              <button
                onClick={() => setStatusFilter('')}
                className="mt-4 text-indigo-600 hover:text-indigo-700 font-semibold"
              >
                Clear Filter
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <Link
                  key={order.id}
                  href={`/customer/orders/${order.id}`}
                  className="block border border-slate-200 rounded-xl p-6 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-slate-900">{order.orderNumber}</h3>
                        <OrderStatusBadge status={order.status as any} />
                      </div>
                      <p className="text-sm text-slate-600 mb-1">
                        {new Date(order.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                      <p className="text-sm text-slate-500">
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-slate-900">
                        {formatCurrency(order.grandTotal)}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
