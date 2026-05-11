'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { VATBreakdown } from '@/components/shared/VATBreakdown'

interface CartSummary {
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  itemCount: number
}

export default function CheckoutPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)

  const [formData, setFormData] = useState({
    shippingAddress: '',
    billingAddress: '',
    phoneNumber: session?.user?.phone || '',
    note: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/customer/login')
    } else if (status === 'authenticated') {
      loadCartSummary()
    }
  }, [status, router])

  const loadCartSummary = async () => {
    try {
      const res = await fetch('/api/cart')
      const data = await res.json()
      if (data.success && data.data) {
        setCartSummary({
          subTotal: data.data.subTotal,
          taxRate: data.data.taxRate,
          taxAmount: data.data.taxAmount,
          grandTotal: data.data.grandTotal,
          itemCount: data.data.items.length,
        })
      } else {
        router.push('/customer/cart')
      }
    } catch (error) {
      toast.error('Failed to load cart')
      router.push('/customer/cart')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.shippingAddress || !formData.phoneNumber) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsProcessing(true)
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          billingAddress: formData.billingAddress || formData.shippingAddress,
        })
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed')
      }

      toast.success('Order placed successfully!')
      router.push(`/customer/orders/${data.order.id}`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to place order')
    } finally {
      setIsProcessing(false)
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!cartSummary) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Checkout</h1>
          <p className="text-slate-600">{cartSummary.itemCount} items in your order</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Shipping Information</h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="shippingAddress" className="block text-sm font-medium text-slate-700 mb-2">
                      Shipping Address *
                    </label>
                    <textarea
                      id="shippingAddress"
                      name="shippingAddress"
                      rows={3}
                      value={formData.shippingAddress}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="Enter your full shipping address"
                    />
                  </div>

                  <div>
                    <label htmlFor="phoneNumber" className="block text-sm font-medium text-slate-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      id="phoneNumber"
                      name="phoneNumber"
                      type="tel"
                      value={formData.phoneNumber}
                      onChange={handleChange}
                      required
                      className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="+251 9xx xxx xxx"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-900 mb-4">Billing Information</h2>

                <div>
                  <label htmlFor="billingAddress" className="block text-sm font-medium text-slate-700 mb-2">
                    Billing Address (optional, leave blank to use shipping address)
                  </label>
                  <textarea
                    id="billingAddress"
                    name="billingAddress"
                    rows={3}
                    value={formData.billingAddress}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="Enter billing address if different from shipping"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="note" className="block text-sm font-medium text-slate-700 mb-2">
                  Order Notes (optional)
                </label>
                <textarea
                  id="note"
                  name="note"
                  rows={3}
                  value={formData.note}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Any special instructions for your order?"
                />
              </div>

              <button
                type="submit"
                disabled={isProcessing}
                className="w-full bg-indigo-600 text-white py-4 rounded-lg font-bold text-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? 'Placing Order...' : 'Place Order'}
              </button>
            </form>
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-2xl shadow-lg p-8 sticky top-4">
              <h2 className="text-xl font-bold text-slate-900 mb-6">Order Summary</h2>

              <VATBreakdown
                subTotal={cartSummary.subTotal}
                taxRate={cartSummary.taxRate}
                taxAmount={cartSummary.taxAmount}
                grandTotal={cartSummary.grandTotal}
                showTitle={false}
              />

              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-600">
                  By placing this order, you agree to our terms and conditions.
                  Your order will be reviewed and approved by our team.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
