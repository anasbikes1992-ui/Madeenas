'use client'

import { useState, useEffect, useMemo } from 'react'
import { toast } from 'react-hot-toast'

interface Product {
  id: string
  name: string
  sku: string
  costPrice?: number
  unit?: string
  [key: string]: unknown
}

interface CartItem {
  product: Product
  quantity: number
  unitPrice: number
  subTotal: number
}

const RETAIL_MARKUP = 1.2

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [isCreditEligible, setIsCreditEligible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  useEffect(() => {
    fetch('/api/products')
      .then(res => res.json())
      .then(data => {
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load products')
        setLoading(false)
      })
  }, [])

  const filteredProducts = useMemo(() => {
    return products.filter(p => 
      p.name.toLowerCase().includes(search.toLowerCase()) || 
      p.sku.toLowerCase().includes(search.toLowerCase())
    )
  }, [products, search])

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1, subTotal: (item.quantity + 1) * item.unitPrice }
            : item
        )
      }
      const unitPrice = product.costPrice ? product.costPrice * RETAIL_MARKUP : 0 // Adding 20% margin for sale if no retail price defined
      return [...prev, { product, quantity: 1, unitPrice, subTotal: unitPrice }]
    })
  }

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(item => item.product.id !== productId))
      return
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, quantity, subTotal: quantity * item.unitPrice }
        : item
    ))
  }

  const updatePrice = (productId: string, unitPrice: number) => {
    if (unitPrice <= 0) {
      toast.error('Unit price must be greater than zero')
      return
    }
    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, unitPrice, subTotal: item.quantity * unitPrice }
        : item
    ))
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.subTotal, 0)
  const cartItems = cart.reduce((sum, item) => sum + item.quantity, 0)
  const lowStockCount = products.filter((product) => Number(product.totalStock || 0) <= 5).length

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
      return
    }

    if (paymentMode === 'CREDIT' && !customerPhone.trim()) {
      toast.error('Customer phone is required for credit sales')
      return
    }
    
    setIsProcessing(true)
    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          customerPhone,
          paymentMode,
          totalAmount,
          items: cart.map(item => ({
            productId: item.product.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subTotal: item.subTotal
          })),
          isCreditEligible
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Checkout failed')

      toast.success('Sale completed successfully!')
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setIsCreditEligible(false)
      setPaymentMode('CASH')
      
      // Optionally trigger receipt printing here
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <section className="rounded-4xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">Point of sale</p>
            <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Fast checkout with stock-aware product picking and clear payment flow.</h1>
            <p className="text-sm leading-7 text-slate-600">This layout is built for speed: search or scan products, build the cart, collect customer info only when needed, and complete the sale with fewer clicks.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-136">
            {[
              ['Products', String(products.length)],
              ['Cart items', String(cartItems)],
              ['Low stock', String(lowStockCount)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
        <div className="flex min-h-136 flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
          <div className="flex flex-col gap-4 border-b border-slate-100 bg-slate-50 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-950">Products</h2>
              <p className="text-sm text-slate-500">Tap a product to add it to the active sale.</p>
            </div>
            <input
              type="text"
              placeholder="Search products or SKU..."
              className="input max-w-md"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-auto p-4">
            {loading ? (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => <div key={i} className="h-36 animate-pulse rounded-3xl bg-slate-100" />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="group flex flex-col items-start rounded-3xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-1 hover:border-indigo-300 hover:shadow-[0_18px_60px_rgba(79,70,229,0.14)]"
                  >
                    <span className="w-full truncate font-semibold text-slate-950">{p.name}</span>
                    <span className="mt-1 text-xs text-slate-500">{p.sku}</span>
                    <div className="mt-5 flex w-full items-center justify-between">
                      <span className="text-sm font-bold text-indigo-600">
                        Rs. {p.costPrice ? (p.costPrice * RETAIL_MARKUP).toLocaleString() : '0'}
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">/{p.unit}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <aside className="flex flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-100 bg-slate-50 p-4">
            <h2 className="text-lg font-black text-slate-950">Current sale</h2>
            <p className="text-sm text-slate-500">Build the cart and finish checkout from this panel.</p>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-3">
            {cart.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-slate-400">
                <span className="mb-3 text-4xl">🛒</span>
                <p>Cart is empty</p>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-950">{item.product.name}</h4>
                      <p className="text-xs text-slate-500">{item.product.sku}</p>
                    </div>
                    <button
                      onClick={() => updateQuantity(item.product.id, 0)}
                      className="rounded-full px-2 py-1 text-sm text-red-600 transition hover:bg-red-50"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                      className="input h-9 w-20 px-3 py-1 text-sm"
                      min="0"
                      step="0.1"
                    />
                    <span className="text-xs text-slate-500">x</span>
                    <input
                      type="number"
                      value={item.unitPrice}
                      onChange={(e) => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                      className="input h-9 w-24 px-3 py-1 text-sm"
                      min="0.01"
                    />
                    <span className="ml-auto text-sm font-bold text-slate-950">
                      Rs. {item.subTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4">
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Customer name (optional)"
                className="input h-10 text-sm"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
              <div className="grid gap-2 sm:grid-cols-[1fr_9.5rem]">
                <input
                  type="text"
                  placeholder="Phone (required for credit)"
                  className="input h-10 text-sm"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                />
                <select
                  className="input h-10 text-sm"
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CHEQUE">Cheque</option>
                  <option value="CREDIT" disabled={!customerPhone.trim()}>
                    Credit {!customerPhone.trim() ? '(phone required)' : ''}
                  </option>
                </select>
              </div>
              {customerPhone ? (
                <label className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={isCreditEligible}
                    onChange={(e) => setIsCreditEligible(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Customer is eligible for credit</span>
                </label>
              ) : null}
            </div>

            <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200">
              <span className="font-medium text-slate-600">Total</span>
              <span className="text-2xl font-black text-indigo-600">
                Rs. {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={isProcessing || cart.length === 0}
              className="btn-primary h-12 w-full justify-center text-base disabled:opacity-50"
            >
              {isProcessing ? 'Processing...' : 'Charge & Checkout'}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
