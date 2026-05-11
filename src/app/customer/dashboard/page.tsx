'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge'
import { formatCurrency } from '@/lib/tax'

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  grandTotal: number
}

export default function CustomerDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/customer/login')
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'authenticated') {
      fetch('/api/orders?limit=5')
        .then(res => res.json())
        .then(data => {
          setOrders(data.data || [])
          setLoading(false)
        })
        .catch(() => setLoading(false))
    }
  }, [status])

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">
            Welcome back, {session?.user?.name}!
          </h1>
          <p className="text-slate-600">Your customer dashboard</p>
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/customer/products"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-3">🛍️</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">Browse Products</h3>
            <p className="text-sm text-slate-600">Explore our product catalog</p>
          </Link>

          <Link
            href="/customer/cart"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-3">🛒</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">View Cart</h3>
            <p className="text-sm text-slate-600">Check your shopping cart</p>
          </Link>

          <Link
            href="/customer/orders"
            className="bg-white rounded-2xl shadow-lg p-6 hover:shadow-xl transition-shadow"
          >
            <div className="text-4xl mb-3">📦</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">My Orders</h3>
            <p className="text-sm text-slate-600">Track your order status</p>
          </Link>
        </div>

        {/* Recent Orders */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-slate-900">Recent Orders</h2>
            <Link href="/customer/orders" className="text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
              View all →
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-5xl mb-4">📦</div>
              <p className="text-slate-600 mb-4">No orders yet</p>
              <Link
                href="/customer/products"
                className="inline-flex px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold"
              >
                Start Shopping
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <Link
                  key={order.id}
                  href={`/customer/orders/${order.id}`}
                  className="block border border-slate-200 rounded-xl p-4 hover:border-indigo-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-slate-900">{order.orderNumber}</p>
                      <p className="text-sm text-slate-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <OrderStatusBadge status={order.status as any} />
                      <p className="text-sm font-semibold text-slate-900 mt-2">
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
