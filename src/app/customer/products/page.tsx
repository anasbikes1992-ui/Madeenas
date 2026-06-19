'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/tax'
import { ProductCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { Pagination } from '@/components/shared/Pagination'
import { Search, SlidersHorizontal } from 'lucide-react'

const RETAIL_MARKUP = 1.2
const PAGE_LIMIT = 12

interface Category {
  id: string
  name: string
  slug: string
  color: string
  icon?: string | null
  _count?: { products: number }
}

interface Product {
  id: string
  name: string
  sku: string
  costPrice: number
  unit: string
  description?: string
  category?: { name: string; color: string; icon?: string | null }
  isActive: boolean
}

export default function ProductsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)

  const totalPages = Math.ceil(total / PAGE_LIMIT)

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/customer/login')
  }, [status, router])

  useEffect(() => {
    if (status !== 'authenticated') return
    fetch('/api/customer/categories')
      .then(r => r.json())
      .then(d => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {})
  }, [status])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        isActive: 'true',
        page: String(page),
        limit: String(PAGE_LIMIT),
      })
      if (search) params.set('search', search)
      if (selectedCategory) params.set('category', selectedCategory)

      const res = await fetch(`/api/products?${params}`)
      const data = await res.json()
      setProducts(data.products || [])
      setTotal(data.total || 0)
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedCategory])

  useEffect(() => {
    if (status === 'authenticated') void loadProducts()
  }, [status, loadProducts])

  // Debounce search input → search state
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput)
      setPage(1)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchInput])

  const handleCategoryChange = (catId: string) => {
    setSelectedCategory(catId)
    setPage(1)
  }

  const handleAddToCart = async (productId: string) => {
    setAddingToCart(productId)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity: 1 }),
      })
      if (!res.ok) throw new Error('Failed')
      toast.success('Added to cart!')
    } catch {
      toast.error('Failed to add to cart')
    } finally {
      setAddingToCart(null)
    }
  }

  if (status === 'loading' || status === 'unauthenticated') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Product Catalog</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {total > 0 ? `${total} products available` : 'Browse our collection'}
          </p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search products…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="input pl-9"
          />
        </div>
      </div>

      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 shrink-0" />
          <button
            onClick={() => handleCategoryChange('')}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
              !selectedCategory
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => handleCategoryChange(cat.id)}
              className={`shrink-0 flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                selectedCategory === cat.id
                  ? 'text-white border-transparent shadow-sm'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
              style={
                selectedCategory === cat.id
                  ? { backgroundColor: cat.color, borderColor: cat.color }
                  : {}
              }
            >
              {cat.icon && <span className="text-xs">{cat.icon}</span>}
              {cat.name}
              <span className={`text-xs ${selectedCategory === cat.id ? 'opacity-75' : 'text-slate-400'}`}>
                ({cat._count?.products ?? 0})
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {loading ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {[...Array(PAGE_LIMIT)].map((_, i) => <ProductCardSkeleton key={i} />)}
        </div>
      ) : products.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">🔍</div>
          <h3 className="font-semibold text-slate-700 mb-1">No products found</h3>
          <p className="text-sm text-slate-500">
            {search || selectedCategory ? 'Try adjusting your search or filters.' : 'No products are available right now.'}
          </p>
          {(search || selectedCategory) && (
            <button
              onClick={() => {
                setSearchInput('')
                setSearch('')
                setSelectedCategory('')
                setPage(1)
              }}
              className="mt-4 btn-secondary"
            >
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {products.map(product => {
            const retailPrice = (product.costPrice ?? 0) * RETAIL_MARKUP
            return (
              <div key={product.id} className="card card-hover flex flex-col p-0 overflow-hidden">
                <div
                  className="h-40 flex items-center justify-center text-5xl"
                  style={{
                    background: product.category?.color
                      ? `linear-gradient(135deg, ${product.category.color}15, ${product.category.color}30)`
                      : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                  }}
                >
                  {product.category?.icon ?? '🧵'}
                </div>
                <div className="p-4 flex flex-col flex-1 gap-2">
                  <div>
                    <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">{product.sku}</p>
                  </div>
                  {product.category && (
                    <span
                      className="self-start px-2.5 py-0.5 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `${product.category.color}20`,
                        color: product.category.color,
                      }}
                    >
                      {product.category.icon ? `${product.category.icon} ` : ''}{product.category.name}
                    </span>
                  )}
                  <div className="mt-auto pt-3 border-t border-slate-100 flex items-end justify-between gap-2">
                    <div>
                      <p className="text-base font-bold text-indigo-700">{formatCurrency(retailPrice)}</p>
                      <p className="text-xs text-slate-400">per {product.unit}</p>
                    </div>
                    <button
                      onClick={() => void handleAddToCart(product.id)}
                      disabled={addingToCart === product.id}
                      className="btn-primary py-1.5 px-3 text-xs shrink-0"
                    >
                      {addingToCart === product.id ? '…' : '+ Cart'}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <Pagination
          page={page}
          totalPages={totalPages}
          onPageChange={p => {
            setPage(p)
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }}
          total={total}
          limit={PAGE_LIMIT}
          className="pt-4"
        />
      )}
    </div>
  )
}
