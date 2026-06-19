'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import { VATBreakdown } from '@/components/shared/VATBreakdown'
import { formatCurrency } from '@/lib/tax'
import { EmptyState } from '@/components/shared/EmptyState'
import { Trash2, ShoppingBag } from 'lucide-react'

interface CartItem {
  id: string
  quantity: number
  unitPrice: number
  product: {
    id: string
    name: string
    sku: string
    unit: string
    category?: { name: string; color: string; icon?: string | null } | null
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
      if (data.success) setCart(data.data)
    } catch {
      toast.error('Failed to load cart')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/customer/login')
    } else if (status === 'authenticated') {
      void loadCart()
    }
  }, [status, router])

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (quantity < 1) return
    setUpdating(itemId)
    const previousCart = cart ? { ...cart } : null
    if (cart) {
      setCart({ ...cart, items: cart.items.map(i => i.id === itemId ? { ...i, quantity } : i) })
    }
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity }),
      })
      if (!res.ok) throw new Error('Failed to update')
      const data = await res.json()
      setCart(data.data)
    } catch {
      if (previousCart) setCart(previousCart)
      toast.error('Failed to update cart')
    } finally {
      setUpdating(null)
    }
  }

  const removeItem = async (itemId: string) => {
    setUpdating(itemId)
    const previousCart = cart ? { ...cart } : null
    if (cart) {
      setCart({ ...cart, items: cart.items.filter(i => i.id !== itemId) })
    }
    try {
      const res = await fetch(`/api/cart/items/${itemId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to remove')
      const data = await res.json()
      setCart(data.data)
      toast.success('Item removed')
    } catch {
      if (previousCart) setCart(previousCart)
      toast.error('Failed to remove item')
    } finally {
      setUpdating(null)
    }
  }

  const clearCart = async () => {
    if (!confirm('Clear your entire cart?')) return
    try {
      const res = await fetch('/api/cart', { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to clear cart')
      const data = await res.json()
      setCart(data.data)
      toast.success('Cart cleared')
    } catch {
      toast.error('Failed to clear cart')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600" />
          <p className="text-sm text-slate-500">Loading your cart…</p>
        </div>
      </div>
    )
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-4">
        <EmptyState
          icon="🛒"
          title="Your cart is empty"
          description="Add some products to your cart to get started"
          action={{
            label: 'Browse Products',
            onClick: () => router.push('/customer/products'),
          }}
        />
      </div>
    )
  }

  // Recompute displayed totals client-side so they always match the item rows
  const clientSubTotal = cart.items.reduce((sum, item) => sum + item.quantity * Number(item.unitPrice), 0)
  const clientTaxAmount = (clientSubTotal * cart.taxRate) / 100
  const clientGrandTotal = clientSubTotal + clientTaxAmount

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Step progress */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 mb-3">Checkout flow</p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { label: 'Cart', active: true },
            { label: 'Checkout', active: false },
            { label: 'Confirmation', active: false },
          ].map((step, index) => (
            <div
              key={step.label}
              className={`rounded-xl border px-3 py-2 text-center font-semibold ${
                step.active
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-slate-50 text-slate-400'
              }`}
              aria-current={step.active ? 'step' : undefined}
            >
              {index + 1}. {step.label}
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Cart Items */}
        <div className="lg:col-span-2 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-slate-900">
              Shopping Cart <span className="text-slate-400 font-normal text-base ml-1">({cart.items.length} item{cart.items.length !== 1 ? 's' : ''})</span>
            </h1>
            <button
              onClick={clearCart}
              className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-semibold transition"
              aria-label="Clear entire cart"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear All
            </button>
          </div>

          {cart.items.map(item => {
            const isUpdating = updating === item.id
            const lineTotal = item.quantity * Number(item.unitPrice)
            const catColor = item.product.category?.color ?? '#6366f1'

            return (
              <div
                key={item.id}
                className={`card p-4 sm:p-5 transition ${isUpdating ? 'opacity-60' : ''}`}
              >
                <div className="flex gap-4">
                  {/* Product icon */}
                  <div
                    className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl shrink-0"
                    style={{ background: `linear-gradient(135deg, ${catColor}15, ${catColor}30)` }}
                  >
                    {item.product.category?.icon ?? '🧵'}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 leading-snug">{item.product.name}</p>
                        <p className="text-xs text-slate-400 font-mono">{item.product.sku}</p>
                        {item.product.category && (
                          <span
                            className="inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium"
                            style={{ backgroundColor: `${catColor}18`, color: catColor }}
                          >
                            {item.product.category.icon ? `${item.product.category.icon} ` : ''}{item.product.category.name}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => void removeItem(item.id)}
                        disabled={isUpdating}
                        className="shrink-0 text-slate-300 hover:text-red-500 transition disabled:opacity-40"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                      {/* Unit price */}
                      <p className="text-sm text-slate-500">
                        {formatCurrency(Number(item.unitPrice))} / {item.product.unit}
                      </p>

                      {/* Quantity stepper */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
                          <button
                            onClick={() => void updateQuantity(item.id, item.quantity - 1)}
                            disabled={isUpdating || item.quantity <= 1}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition font-bold"
                            aria-label="Decrease"
                          >
                            −
                          </button>
                          <span className="w-10 text-center text-sm font-semibold text-slate-900 select-none">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => void updateQuantity(item.id, item.quantity + 1)}
                            disabled={isUpdating}
                            className="w-8 h-8 flex items-center justify-center text-slate-500 hover:bg-slate-50 disabled:opacity-40 transition font-bold"
                            aria-label="Increase"
                          >
                            +
                          </button>
                        </div>
                        <span className="text-sm font-bold text-slate-900 min-w-[80px] text-right">
                          {formatCurrency(lineTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-4 space-y-5">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-indigo-600" />
              <h2 className="text-base font-semibold text-slate-900">Order Summary</h2>
            </div>

            <VATBreakdown
              subTotal={clientSubTotal}
              taxRate={cart.taxRate}
              taxAmount={clientTaxAmount}
              grandTotal={clientGrandTotal}
              showTitle={false}
              className="border-t border-slate-100 pt-4"
            />

            <Link
              href="/customer/checkout"
              className="btn-primary flex items-center justify-center gap-2 w-full py-3"
            >
              Continue to Checkout →
            </Link>

            <p className="text-xs text-slate-400 text-center">Prices in LKR with VAT (18%)</p>

            <Link
              href="/customer/products"
              className="block text-center text-sm text-slate-500 hover:text-slate-700 transition"
            >
              ← Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
