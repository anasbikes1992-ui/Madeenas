'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { VATBreakdown } from '@/components/shared/VATBreakdown'

interface CartSummary {
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  itemCount: number
}

export default function CheckoutPage() {
  const { status } = useSession()
  const router = useRouter()
  const [cartSummary, setCartSummary] = useState<CartSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [activeStep, setActiveStep] = useState(1)
  const [savedAddresses, setSavedAddresses] = useState<string[]>([])
  const [saveAddress, setSaveAddress] = useState(true)

  const [formData, setFormData] = useState({
    shippingAddress: '',
    billingAddress: '',
    phoneNumber: '',
    note: '',
  })

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/customer/login')
    } else if (status === 'authenticated') {
      loadCartSummary()
      const stored = window.localStorage.getItem('customer-saved-addresses')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed)) {
            setSavedAddresses(parsed.filter((value) => typeof value === 'string'))
          }
        } catch {
          setSavedAddresses([])
        }
      }
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

      if (saveAddress) {
        const normalized = formData.shippingAddress.trim()
        if (normalized) {
          const next = Array.from(new Set([normalized, ...savedAddresses])).slice(0, 5)
          setSavedAddresses(next)
          window.localStorage.setItem('customer-saved-addresses', JSON.stringify(next))
        }
      }

      toast.success('Order placed successfully!')
      router.push(`/customer/orders/${data.data.id}`)
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
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Progress steps */}
      <div className="card p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-600 mb-3">Checkout flow</p>
        <div className="grid grid-cols-3 gap-3 text-sm">
          {[
            { label: 'Address', step: 1 },
            { label: 'Review', step: 2 },
            { label: 'Payment', step: 3 },
          ].map((item) => (
            <button
              key={item.step}
              type="button"
              onClick={() => setActiveStep(item.step)}
              className={`rounded-xl border px-3 py-2 font-semibold transition ${
                activeStep === item.step
                  ? 'border-indigo-200 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300'
              }`}
              aria-current={activeStep === item.step ? 'step' : undefined}
            >
              {item.step}. {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Checkout Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="card p-6 sm:p-8 space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Checkout</h1>
              <p className="text-sm text-slate-500 mt-0.5">{cartSummary.itemCount} item{cartSummary.itemCount !== 1 ? 's' : ''} in your order</p>
            </div>

            {/* Step 1: Shipping */}
            <section className={activeStep === 1 ? '' : 'opacity-60 pointer-events-none'}>
              <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">1</span>
                Shipping Information
              </h2>
              <div className="space-y-4">
                {savedAddresses.length > 0 && (
                  <div>
                    <label htmlFor="savedAddress" className="label">Saved Addresses</label>
                    <select
                      id="savedAddress"
                      className="input"
                      onChange={(e) => {
                        if (e.target.value) setFormData((prev) => ({ ...prev, shippingAddress: e.target.value }))
                      }}
                      defaultValue=""
                    >
                      <option value="">Select a saved address…</option>
                      {savedAddresses.map((address) => (
                        <option key={address} value={address}>{address}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="shippingAddress" className="label">Shipping Address *</label>
                  <textarea
                    id="shippingAddress"
                    name="shippingAddress"
                    rows={3}
                    value={formData.shippingAddress}
                    onChange={handleChange}
                    required
                    className="input"
                    placeholder="Enter your full shipping address"
                  />
                </div>
                <label className="inline-flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAddress}
                    onChange={(e) => setSaveAddress(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Save this address for next time
                </label>
                <div>
                  <label htmlFor="phoneNumber" className="label">Phone Number *</label>
                  <input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    required
                    className="input"
                    placeholder="+94 7X XXX XXXX"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(2)}
                className="btn-primary mt-5 w-full sm:w-auto"
              >
                Continue to Review →
              </button>
            </section>

            {/* Step 2: Billing */}
            <section className={activeStep === 2 ? '' : 'opacity-60 pointer-events-none'}>
              <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">2</span>
                Billing Information
              </h2>
              <div>
                <label htmlFor="billingAddress" className="label">Billing Address <span className="text-slate-400 font-normal">(optional — leave blank to use shipping address)</span></label>
                <textarea
                  id="billingAddress"
                  name="billingAddress"
                  rows={3}
                  value={formData.billingAddress}
                  onChange={handleChange}
                  className="input"
                  placeholder="Enter billing address if different from shipping"
                />
              </div>
              <button
                type="button"
                onClick={() => setActiveStep(3)}
                className="btn-primary mt-5 w-full sm:w-auto"
              >
                Continue to Payment →
              </button>
            </section>

            {/* Step 3: Payment */}
            <section className={activeStep === 3 ? '' : 'opacity-60 pointer-events-none'}>
              <h2 className="text-base font-semibold text-slate-700 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">3</span>
                Payment Method
              </h2>
              <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 space-y-1">
                <p className="text-sm font-semibold text-slate-800">Bank Transfer (Sri Lanka)</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-slate-600">
                  <span className="font-medium text-slate-500">Bank</span><span>Commercial Bank PLC</span>
                  <span className="font-medium text-slate-500">Account Name</span><span>Nexus Inventorytile Management</span>
                  <span className="font-medium text-slate-500">Account No.</span><span className="font-mono font-semibold text-slate-800">101245789633</span>
                  <span className="font-medium text-slate-500">Branch</span><span>Pettah</span>
                </div>
                <p className="mt-3 text-xs text-slate-500 pt-2 border-t border-indigo-100">Use your order number as the transfer reference after confirmation.</p>
              </div>
            </section>

            {/* Order notes */}
            <div>
              <label htmlFor="note" className="label">Order Notes <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                id="note"
                name="note"
                rows={3}
                value={formData.note}
                onChange={handleChange}
                className="input"
                placeholder="Any special instructions for your order?"
              />
            </div>

            <button
              type="submit"
              disabled={isProcessing}
              className="btn-primary w-full py-3 text-base"
            >
              {isProcessing ? 'Placing Order…' : '🛒 Place Order'}
            </button>
          </form>
        </div>

        {/* Order Summary */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-4 space-y-5">
            <h2 className="text-base font-semibold text-slate-900">Order Summary</h2>

            <VATBreakdown
              subTotal={cartSummary.subTotal}
              taxRate={cartSummary.taxRate}
              taxAmount={cartSummary.taxAmount}
              grandTotal={cartSummary.grandTotal}
              showTitle={false}
            />

            <p className="text-xs text-slate-500 pt-4 border-t border-slate-100">
              By placing this order, you agree to our terms and conditions. Your order will be reviewed and approved by our team. All amounts in LKR, VAT 18%.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
