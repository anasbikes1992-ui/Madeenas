'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'react-hot-toast'
import { formatCurrency } from '@/lib/tax'
import { ProductCardSkeleton } from '@/components/shared/LoadingSkeleton'

interface Product {
  id: string
  name: string
  sku: string
  costPrice: number
  unit: string
  description?: string
  category?: { name: string }
  isActive: boolean
}

export default function ProductsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/customer/login')
    }
  }, [status, router])

  useEffect(() => {
    fetch('/api/products?isActive=true')
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

  const handleAddToCart = async (productId: string) => {
    setAddingToCart(productId)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 })
      })

      if (!res.ok) throw new Error('Failed to add to cart')

      toast.success('Added to cart!')
    } catch (error) {
      toast.error('Failed to add to cart')
    } finally {
      setAddingToCart(null)
    }
  }

  const filteredProducts = products.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.sku.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.name.toLowerCase().includes(search.toLowerCase())
  )

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
          <h1 className="text-3xl font-bold text-slate-900 mb-4">Product Catalog</h1>
          <input
            type="text"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-lg p-12 text-center">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-slate-600">No products found</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
                <div className="h-48 bg-slate-200 flex items-center justify-center">
                  <span className="text-6xl">📦</span>
                </div>
                <div className="p-4">
                  <h3 className="font-bold text-slate-900 mb-1">{product.name}</h3>
                  <p className="text-xs text-slate-500 mb-2">{product.sku}</p>
                  {product.category && (
                    <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 text-xs rounded-full mb-3">
                      {product.category.name}
                    </span>
                  )}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-lg font-bold text-indigo-600">
                      {formatCurrency(product.costPrice * 1.2)}
                    </span>
                    <span className="text-xs text-slate-500">per {product.unit}</span>
                  </div>
                  <button
                    onClick={() => handleAddToCart(product.id)}
                    disabled={addingToCart === product.id}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {addingToCart === product.id ? 'Adding...' : 'Add to Cart'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
