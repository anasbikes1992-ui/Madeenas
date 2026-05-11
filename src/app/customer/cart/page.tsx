'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import Link from 'next/link'
import { VATBreakdown } from '@/components/shared/VATBreakdown'
import { formatCurrency } from '@/lib/tax'
import { EmptyState } from '@/components/shared/EmptyState'

interface CartItem {
  id: string
  quantity: number
  unitPrice: number
  product: {
    id: string
    name: string
    sku: string
    unit: string
  }
}

interface Cart {
  items: CartItem[]
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
}

export default function CartPage() {
  const { status } = useSession()
  const router = useRouter()
  const [cart, setCart] = useState<Cart | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  const loadCart = async () => {
    try {
      const res = await fetch('/api/cart')
      const data = await res.json()
      if (data.success) {
        setCart(data.data)
      }
    } catch (error) {
      toast.error('Failed to load cart')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/customer/login')
    } else if (status === 'authenticated') {
      loadCart()
    }
  }, [status, router])

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return

    setUpdating(itemId)
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity })
      })

      if (!res.ok) throw new Error('Failed to update')

      const data = await res.json()
      setCart(data.data)
      toast.success('Cart updated')
    } catch (error) {
      toast.error('Failed to update cart')
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setUpdating(itemId)
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE'
      })

      if (!res.ok) throw new Error('Failed to remove')

      const data = await res.json()
      setCart(data.data)
      toast.success('Item removed')
    } catch (error) {
      toast.error('Failed to remove item')
    } finally {
      setUpdating(null)
    }
  }

  const clearCart = async () => {
    if (!confirm('Are you sure you want to clear your cart?')) return

    try {
      const res = await fetch('/api/cart', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear cart')

      const data = await res.json()
      setCart(data.data)
      toast.success('Cart cleared')
    } catch (error) {
      toast.error('Failed to clear cart')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          description="Add some products to your cart to get started"
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
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold text-slate-900">Shopping Cart</h1>
                <button
                  onClick={clearCart}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold"
                >
                  Clear Cart
                </button>
              </div>

              <div className="space-y-4">
                {cart.items.map(item => (
                  <div key={item.id} className="border border-slate-200 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900">{item.product.name}</h3>
                        <p className="text-sm text-slate-500">{item.product.sku}</p>
                        <p className="text-sm text-slate-600 mt-1">
                          {formatCurrency(item.unitPrice)} per {item.product.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => removeItem(item.id)}
                        disabled={updating === item.id}
                        className="text-red-600 hover:text-red-700 font-semibold"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          disabled={updating === item.id || item.quantity <= 1}
                          className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="w-12 text-center font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          disabled={updating === item.id}
                          className="w-8 h-8 rounded-lg border border-slate-300 hover:bg-slate-50 disabled:opacity-50"
                        >
                          +
                        </button>
                      </div>
                      <span className="text-lg font-bold text-slate-900">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-4">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h2>

              <VATBreakdown
                subTotal={cart.subTotal}
                taxRate={cart.taxRate}
                taxAmount={cart.taxAmount}
                grandTotal={cart.grandTotal}
                showTitle={false}
                className="mb-6"
              />

              <Link
                href="/customer/checkout"
                className="block w-full bg-indigo-600 text-white text-center py-3 rounded-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Proceed to Checkout
              </Link>

              <Link
                href="/customer/products"
                className="block text-center text-sm text-slate-600 hover:text-slate-900 mt-4"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
