'use client'

import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/tax'
import { ProductCardSkeleton } from '@/components/shared/LoadingSkeleton'
import { Pagination } from '@/components/shared/Pagination'
import { Search, SlidersHorizontal, X, ShoppingCart, Package } from 'lucide-react'

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
  description?: string | null
  category?: { name: string; color: string; icon?: string | null } | null
  isActive: boolean
}

// ---------------------------------------------------------------------------
// Product Detail Modal
// ---------------------------------------------------------------------------
function ProductModal({
  product,
  onClose,
  onAddToCart,
  adding,
}: {
  product: Product
  onClose: () => void
  onAddToCart: (productId: string, qty: number) => Promise<void>
  adding: boolean
}) {
  const [qty, setQty] = useState(1)
  const retailPrice = Number(product.costPrice) * RETAIL_MARKUP
  const hasPrice = retailPrice > 0

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Product image / hero */}
        <div
          className="h-48 flex items-center justify-center relative"
          style={{
            background: product.category?.color
              ? `linear-gradient(135deg, ${product.category.color}15, ${product.category.color}35)`
              : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
          }}
        >
          <span className="text-8xl select-none">{product.category?.icon ?? '🧵'}</span>
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shadow-sm transition"
            aria-label="Close"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Name + category */}
          <div>
            {product.category && (
              <span
                className="inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold mb-2"
                style={{
                  backgroundColor: `${product.category.color}20`,
                  color: product.category.color,
                }}
              >
                {product.category.icon ? `${product.category.icon} ` : ''}{product.category.name}
              </span>
            )}
            <h2 className="text-xl font-bold text-slate-900">{product.name}</h2>
            <p className="text-xs text-slate-400 font-mono mt-0.5">{product.sku}</p>
          </div>

          {product.description && (
            <p className="text-sm text-slate-600 leading-relaxed">{product.description}</p>
          )}

          {/* Price */}
          <div className="rounded-xl bg-slate-50 p-4 flex items-center justify-between">
            {hasPrice ? (
              <div>
                <p className="text-2xl font-black text-indigo-700">{formatCurrency(retailPrice)}</p>
                <p className="text-xs text-slate-500">per {product.unit} · incl. VAT</p>
              </div>
            ) : (
              <div>
                <p className="text-base font-semibold text-slate-500">Contact for price</p>
                <p className="text-xs text-slate-400">per {product.unit}</p>
              </div>
            )}
            {hasPrice && (
              <div className="text-right">
                <p className="text-xs text-slate-500 mb-1">Line total</p>
                <p className="text-lg font-bold text-slate-900">{formatCurrency(retailPrice * qty)}</p>
              </div>
            )}
          </div>

          {/* Quantity + add */}
          {hasPrice ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setQty(q => Math.max(1, q - 1))}
                  disabled={qty <= 1}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition text-lg font-bold"
                  aria-label="Decrease quantity"
                >
                  −
                </button>
                <input
                  type="number"
                  min={1}
                  value={qty}
                  onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-14 text-center border-x border-slate-300 h-10 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-indigo-400"
                  aria-label="Quantity"
                />
                <button
                  type="button"
                  onClick={() => setQty(q => q + 1)}
                  className="w-10 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition text-lg font-bold"
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => void onAddToCart(product.id, qty).then(onClose)}
                disabled={adding}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                {adding ? 'Adding…' : `Add ${qty} to Cart`}
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">This product is currently price-on-request. Please contact us to place an order.</p>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export default function ProductsPage() {
  const { status } = useSession()
  const router = useRouter()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [addingToCart, setAddingToCart] = useState<string | null>(null)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)

  const totalPages = Math.ceil(total / PAGE_LIMIT)

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: String(PAGE_LIMIT) })
      if (search) params.set('search', search)
      if (selectedCategory) params.set('categoryId', selectedCategory)

      const [productsRes, categoriesRes] = await Promise.all([
        fetch(`/api/products?${params}`),
        categories.length === 0 ? fetch('/api/categories/public') : Promise.resolve(null),
      ])

      const productsData = await productsRes.json()
      setProducts(productsData.products || productsData.data || [])
      setTotal(productsData.pagination?.total ?? productsData.total ?? 0)

      if (categoriesRes) {
        const catData = await categoriesRes.json()
        setCategories(catData.categories || catData.data || [])
      }
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }, [page, search, selectedCategory, categories.length])

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

  const handleAddToCart = async (productId: string, quantity = 1) => {
    setAddingToCart(productId)
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, quantity }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to add to cart')
      }
      toast.success('Added to cart!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to add to cart')
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
    <>
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
                onClick={() => { setSearchInput(''); setSearch(''); setSelectedCategory(''); setPage(1) }}
                className="mt-4 btn-secondary"
              >
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {products.map(product => {
              const retailPrice = Number(product.costPrice) * RETAIL_MARKUP
              const hasPrice = retailPrice > 0
              const isAdding = addingToCart === product.id

              return (
                <div key={product.id} className="card card-hover flex flex-col p-0 overflow-hidden group">
                  {/* Clickable image area → opens detail modal */}
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(product)}
                    className="h-40 flex items-center justify-center text-5xl relative focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
                    style={{
                      background: product.category?.color
                        ? `linear-gradient(135deg, ${product.category.color}15, ${product.category.color}30)`
                        : 'linear-gradient(135deg, #f1f5f9, #e2e8f0)',
                    }}
                    aria-label={`View details for ${product.name}`}
                  >
                    {product.category?.icon ?? '🧵'}
                    <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition bg-slate-900/10">
                      <span className="bg-white text-xs font-semibold px-3 py-1 rounded-full shadow text-slate-700">View details</span>
                    </span>
                  </button>

                  <div className="p-4 flex flex-col flex-1 gap-2">
                    <div>
                      {/* Clickable name → detail modal */}
                      <button
                        type="button"
                        onClick={() => setSelectedProduct(product)}
                        className="text-left font-semibold text-slate-900 leading-snug line-clamp-2 hover:text-indigo-700 transition-colors focus:outline-none focus-visible:underline"
                      >
                        {product.name}
                      </button>
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

                    <div className="mt-auto pt-3 border-t border-slate-100">
                      {/* Price */}
                      <div className="mb-3">
                        {hasPrice ? (
                          <>
                            <p className="text-base font-bold text-indigo-700">{formatCurrency(retailPrice)}</p>
                            <p className="text-xs text-slate-400">per {product.unit}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-medium text-slate-400">Contact for price</p>
                            <p className="text-xs text-slate-400">per {product.unit}</p>
                          </>
                        )}
                      </div>

                      {/* Quick add (qty=1) or open modal */}
                      {hasPrice ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void handleAddToCart(product.id, 1)}
                            disabled={isAdding}
                            className="btn-primary flex-1 py-1.5 text-xs flex items-center justify-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            {isAdding ? '…' : 'Add to Cart'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="btn-secondary py-1.5 px-2 text-xs"
                            aria-label="Choose quantity"
                            title="Choose quantity"
                          >
                            <Package className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(product)}
                          className="btn-secondary w-full py-1.5 text-xs"
                        >
                          View Details
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
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

      {/* Product detail modal */}
      {selectedProduct && (
        <ProductModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          onAddToCart={handleAddToCart}
          adding={addingToCart === selectedProduct.id}
        />
      )}
    </>
  )
}
