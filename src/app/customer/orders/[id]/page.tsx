'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { OrderStatusBadge } from '@/components/shared/OrderStatusBadge'
import { VATBreakdownTable } from '@/components/shared/VATBreakdown'
import { formatCurrency } from '@/lib/tax'
import { ConfirmDialog } from '@/components/shared/ConfirmDialog'

interface OrderItem {
  id: string
  quantity: number
  unitPrice: number
  subTotal: number
  taxAmount: number
  total: number
  product: {
    name: string
    sku: string
    unit: string
  }
}

interface Order {
  id: string
  orderNumber: string
  status: string
  createdAt: string
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  shippingAddress: string
  billingAddress: string
  phoneNumber: string
  note?: string
  approvedAt?: string
  approvedBy?: { name: string }
  items: OrderItem[]
}

export default function OrderDetailPage({ params }: { params: { id: string } }) {
  const { status: sessionStatus } = useSession()
  const router = useRouter()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelDialog, setShowCancelDialog] = useState(false)

  useEffect(() => {
    if (sessionStatus === 'unauthenticated') {
      router.push('/customer/login')
    } else if (sessionStatus === 'authenticated') {
      loadOrder()
    }
  }, [sessionStatus, router])

  const loadOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${params.id}`)
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to load order')
      }

      setOrder(data.data)
    } catch (error) {
      toast.error('Failed to load order')
      router.push('/customer/orders')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelOrder = async () => {
    setCancelling(true)
    try {
      const res = await fetch(`/api/orders/${params.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Customer requested cancellation' })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to cancel order')
      }

      toast.success('Order cancelled successfully')
      setOrder(data.data)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to cancel order')
    } finally {
      setCancelling(false)
    }
  }

  if (sessionStatus === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  const canCancel = order.status === 'PENDING'

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 mb-2">{order.orderNumber}</h1>
              <p className="text-slate-600">
                Placed on {new Date(order.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <OrderStatusBadge status={order.status as any} />
          </div>

          {canCancel && (
            <button
              onClick={() => setShowCancelDialog(true)}
              disabled={cancelling}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </button>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8 mb-8">
          {/* Shipping Info */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Shipping Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600 font-medium mb-1">Address:</p>
                <p className="text-slate-900">{order.shippingAddress}</p>
              </div>
              <div>
                <p className="text-slate-600 font-medium mb-1">Phone:</p>
                <p className="text-slate-900">{order.phoneNumber}</p>
              </div>
            </div>
          </div>

          {/* Billing Info */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-slate-900 mb-4">Billing Information</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-600 font-medium mb-1">Address:</p>
                <p className="text-slate-900">{order.billingAddress}</p>
              </div>
              {order.approvedAt && order.approvedBy && (
                <div>
                  <p className="text-slate-600 font-medium mb-1">Approved by:</p>
                  <p className="text-slate-900">
                    {order.approvedBy.name} on {new Date(order.approvedAt).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Items */}
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Order Items</h2>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-slate-200">
                <tr className="text-left text-sm text-slate-600">
                  <th className="pb-3">Product</th>
                  <th className="pb-3 text-right">Quantity</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Subtotal</th>
                  <th className="pb-3 text-right">Tax</th>
                  <th className="pb-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {order.items.map(item => (
                  <tr key={item.id} className="text-sm">
                    <td className="py-4">
                      <div>
                        <p className="font-semibold text-slate-900">{item.product.name}</p>
                        <p className="text-xs text-slate-500">{item.product.sku}</p>
                      </div>
                    </td>
                    <td className="py-4 text-right text-slate-900">
                      {item.quantity} {item.product.unit}
                    </td>
                    <td className="py-4 text-right text-slate-900">
                      {formatCurrency(item.unitPrice)}
                    </td>
                    <td className="py-4 text-right text-slate-900">
                      {formatCurrency(item.subTotal)}
                    </td>
                    <td className="py-4 text-right text-slate-600">
                      {formatCurrency(item.taxAmount)}
                    </td>
                    <td className="py-4 text-right font-semibold text-slate-900">
                      {formatCurrency(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Order Summary */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <h2 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h2>

          <VATBreakdownTable
            subTotal={order.subTotal}
            taxRate={order.taxRate}
            taxAmount={order.taxAmount}
            grandTotal={order.grandTotal}
          />

          {order.note && (
            <div className="mt-6 pt-6 border-t border-slate-200">
              <p className="text-sm font-medium text-slate-700 mb-2">Order Notes:</p>
              <p className="text-sm text-slate-600">{order.note}</p>
            </div>
          )}
        </div>

        <div className="mt-8 text-center">
          <Link
            href="/customer/orders"
            className="text-indigo-600 hover:text-indigo-700 font-semibold"
          >
            ← Back to Orders
          </Link>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        onConfirm={handleCancelOrder}
        title="Cancel Order"
        message="Are you sure you want to cancel this order? This action cannot be undone."
        confirmText="Cancel Order"
        cancelText="Keep Order"
        variant="danger"
      />
    </div>
  )
}
