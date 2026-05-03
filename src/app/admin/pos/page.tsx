'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { toast } from 'react-hot-toast'

interface CartItem {
  product: any
  quantity: number
  unitPrice: number
  subTotal: number
}

export default function POSPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<any[]>([])
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

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.product.id === product.id 
            ? { ...item, quantity: item.quantity + 1, subTotal: (item.quantity + 1) * item.unitPrice }
            : item
        )
      }
      const unitPrice = product.costPrice ? product.costPrice * 1.2 : 0 // Adding 20% margin for sale if no retail price defined
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
    if (unitPrice < 0) return
    setCart(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, unitPrice, subTotal: item.quantity * unitPrice }
        : item
    ))
  }

  const totalAmount = cart.reduce((sum, item) => sum + item.subTotal, 0)

  const handleCheckout = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty')
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
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="flex h-[calc(100vh-6rem)] gap-6 fade-in -mx-4 sm:mx-0">
      {/* Product Selection Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="font-semibold text-slate-800">Products</h2>
          <input 
            type="text" 
            placeholder="Search products or SKU..." 
            className="input max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-xl" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredProducts.map(p => (
                <button 
                  key={p.id} 
                  onClick={() => addToCart(p)}
                  className="flex flex-col items-start p-4 bg-white border border-slate-200 rounded-xl hover:border-indigo-300 hover:shadow-md transition-all text-left"
                >
                  <span className="font-medium text-slate-900 truncate w-full">{p.name}</span>
                  <span className="text-xs text-slate-500 mt-1">{p.sku}</span>
                  <div className="mt-4 flex items-center justify-between w-full">
                    <span className="text-sm font-semibold text-indigo-600">
                      Rs. {p.costPrice ? (p.costPrice * 1.2).toLocaleString() : '0'}
                    </span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600">/{p.unit}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Cart & Checkout Area */}
      <div className="w-96 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden shrink-0">
        <div className="p-4 border-b border-slate-100 bg-slate-50">
          <h2 className="font-semibold text-slate-800">Current Sale</h2>
        </div>
        
        <div className="flex-1 overflow-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <span className="text-4xl mb-3">🛒</span>
              <p>Cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.product.id} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-medium text-sm text-slate-900">{item.product.name}</h4>
                    <p className="text-xs text-slate-500">{item.product.sku}</p>
                  </div>
                  <button 
                    onClick={() => updateQuantity(item.product.id, 0)}
                    className="text-red-500 hover:bg-red-50 p-1 rounded transition-colors"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <input 
                    type="number" 
                    value={item.quantity}
                    onChange={(e) => updateQuantity(item.product.id, parseFloat(e.target.value) || 0)}
                    className="input py-1 px-2 h-8 w-20 text-sm"
                    min="0"
                    step="0.1"
                  />
                  <span className="text-xs text-slate-500">x</span>
                  <input 
                    type="number" 
                    value={item.unitPrice}
                    onChange={(e) => updatePrice(item.product.id, parseFloat(e.target.value) || 0)}
                    className="input py-1 px-2 h-8 w-24 text-sm"
                    min="0"
                  />
                  <span className="font-semibold text-sm ml-auto text-slate-900">
                    Rs. {item.subTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 space-y-4">
          <div className="space-y-3">
            <input 
              type="text" 
              placeholder="Customer Name (Optional)" 
              className="input w-full text-sm h-9"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Phone (Req for Credit)" 
                className="input flex-1 text-sm h-9"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              <select 
                className="input w-32 text-sm h-9"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
              >
                <option value="CASH">Cash</option>
                <option value="CARD">Card</option>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CREDIT">Credit</option>
              </select>
            </div>
            
            {customerPhone && (
              <label className="flex items-center space-x-2 text-sm text-slate-700 bg-slate-100 p-2 rounded border border-slate-200">
                <input 
                  type="checkbox" 
                  checked={isCreditEligible}
                  onChange={(e) => setIsCreditEligible(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Customer is eligible for Credit limit</span>
              </label>
            )}
          </div>
          
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <span className="font-medium text-slate-600">Total</span>
            <span className="text-2xl font-bold text-indigo-600">
              Rs. {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={isProcessing || cart.length === 0}
            className="btn-primary w-full justify-center h-12 text-lg disabled:opacity-50"
          >
            {isProcessing ? 'Processing...' : 'Charge & Checkout'}
          </button>
        </div>
      </div>
    </div>
  )
}
