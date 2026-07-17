/**
 * Enhanced Premium Gallery Component
 * Luxury textile showcase with sophisticated grid and animations
 */

'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Heart, Eye, ShoppingBag, Sparkles, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { parseImages, cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/tax'
import { GlassCard } from '@/components/ui/GlassCard'
import { LuxuryButton } from '@/components/ui/LuxuryButton'
import { pageTransition, staggerContainer, gridItem, fadeUp, modalBackdrop, modalContent } from '@/lib/animations'

type ProductItem = {
  id: string
  name: string
  design: string
  color: string
  colorHex: string
  sku: string
  unit: string
  description?: string | null
  images: string
  lowStockAt: number
  /** Server-computed retail price; null means the item is not priced. */
  retailPrice?: number | null
  stocks?: Array<{ quantity: number }>
  category?: { id: string; name: string; color: string } | null
}

type CategoryItem = {
  id: string
  name: string
  slug: string
  color: string
}

export default function EnhancedGallery() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [search, setSearch] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [favorites, setFavorites] = useState<Set<string>>(new Set())
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false)

  const filteredProducts = useMemo(() => {
    let result = products

    if (showFavoritesOnly) {
      result = result.filter(p => favorites.has(p.id))
    }

    if (selectedCategory) {
      result = result.filter(p => p.category?.id === selectedCategory)
    }

    if (search) {
      const searchLower = search.toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(searchLower) ||
        p.sku.toLowerCase().includes(searchLower) ||
        p.design.toLowerCase().includes(searchLower)
      )
    }

    return result
  }, [products, selectedCategory, search, showFavoritesOnly, favorites])

  async function loadProducts() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      const response = await fetch(`/api/gallery?${params.toString()}`)
      const data = await response.json()
      setProducts(data.products || [])
      setCategories(data.categories || [])
    } catch {
      toast.error('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadProducts() }, [])

  function toggleFavorite(productId: string) {
    setFavorites(prev => {
      const next = new Set(prev)
      if (next.has(productId)) {
        next.delete(productId)
        toast.success('Removed from favorites')
      } else {
        next.add(productId)
        toast.success('Added to favorites')
      }
      return next
    })
  }

  function getStockStatus(product: ProductItem) {
    const total = (product.stocks || []).reduce((sum, item) => sum + item.quantity, 0)
    if (total <= 0) return { label: 'Out of Stock', variant: 'rose' as const, available: false }
    if (total <= product.lowStockAt) return { label: 'Low Stock', variant: 'saffron' as const, available: true }
    return { label: 'In Stock', variant: 'emerald' as const, available: true }
  }

  function estimatePrice(product: ProductItem) {
    if (product.retailPrice == null) return 'Price on request'
    return formatCurrency(product.retailPrice)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-base">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
          className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent"
        />
      </div>
    )
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageTransition}
      className="min-h-screen bg-gradient-to-br from-surface-base via-surface-elevated to-surface-base"
    >
      {/* Header */}
      <div className="border-b border-border-base bg-surface-card/50 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-8">
          <div className="mb-6">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-accent-saffron" />
              <h1 className="font-heading text-4xl font-bold tracking-tight text-text-primary">
                Textile Gallery
              </h1>
            </div>
            <p className="text-text-secondary">
              Explore our premium collection of {products.length} exquisite fabrics
            </p>
          </div>

          {/* Search & Filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Search by name, SKU, or design..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-border-base bg-surface-elevated/50 py-3 pl-12 pr-4 text-text-primary placeholder:text-text-muted focus:border-border-accent focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-secondary"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Favorites Toggle */}
            <LuxuryButton
              variant={showFavoritesOnly ? 'accent' : 'secondary'}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Heart className={cn('h-4 w-4', showFavoritesOnly && 'fill-current')} />
              Favorites ({favorites.size})
            </LuxuryButton>
          </div>

          {/* Category Pills */}
          <motion.div variants={staggerContainer} className="mt-6 flex flex-wrap gap-2">
            <motion.button
              variants={fadeUp}
              onClick={() => setSelectedCategory('')}
              className={cn(
                'rounded-full border px-4 py-2 text-sm font-medium transition-all',
                !selectedCategory
                  ? 'border-primary bg-primary text-white shadow-glow-indigo'
                  : 'border-border-base bg-surface-elevated text-text-secondary hover:border-border-accent hover:text-text-primary'
              )}
            >
              All Categories
            </motion.button>
            {categories.map((cat) => (
              <motion.button
                key={cat.id}
                variants={fadeUp}
                onClick={() => setSelectedCategory(cat.id)}
                className={cn(
                  'rounded-full border px-4 py-2 text-sm font-medium transition-all',
                  selectedCategory === cat.id
                    ? 'border-primary bg-primary text-white shadow-glow-indigo'
                    : 'border-border-base bg-surface-elevated text-text-secondary hover:border-border-accent hover:text-text-primary'
                )}
              >
                {cat.name}
              </motion.button>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="container mx-auto px-6 py-12">
        <AnimatePresence mode="wait">
          {filteredProducts.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="mb-4 rounded-full bg-surface-card p-6">
                <Filter className="h-12 w-12 text-text-muted" />
              </div>
              <h3 className="mb-2 font-heading text-2xl font-bold text-text-primary">
                No products found
              </h3>
              <p className="text-text-secondary">
                Try adjusting your filters or search query
              </p>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              variants={staggerContainer}
              className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {filteredProducts.map((product) => {
                const stockStatus = getStockStatus(product)
                const imageUrls = parseImages(product.images)
                const mainImage = imageUrls[0] || '/placeholder-fabric.jpg'
                
                return (
                  <motion.div key={product.id} variants={gridItem}>
                    <GlassCard
                      padding="none"
                      hover
                      onClick={() => setSelectedProduct(product)}
                      className="group overflow-hidden"
                    >
                      {/* Image */}
                      <div className="relative aspect-square overflow-hidden bg-surface-elevated">
                        <img
                          src={mainImage}
                          alt={product.name}
                          className="h-full w-full object-cover transition-transform duration-slow group-hover:scale-110"
                        />
                        
                        {/* Favorite Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleFavorite(product.id)
                          }}
                          className="absolute right-3 top-3 rounded-full bg-surface-base/80 p-2 backdrop-blur-sm transition-all hover:bg-surface-card hover:scale-110"
                        >
                          <Heart
                            className={cn(
                              'h-4 w-4 transition-colors',
                              favorites.has(product.id)
                                ? 'fill-semantic-error text-semantic-error'
                                : 'text-text-secondary'
                            )}
                          />
                        </button>

                        {/* Stock Badge */}
                        <div className="absolute bottom-3 left-3">
                          <span className={cn(
                            'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm',
                            stockStatus.variant === 'emerald' && 'border-semantic-success/30 bg-semantic-success/10 text-semantic-success',
                            stockStatus.variant === 'saffron' && 'border-semantic-warning/30 bg-semantic-warning/10 text-semantic-warning',
                            stockStatus.variant === 'rose' && 'border-semantic-error/30 bg-semantic-error/10 text-semantic-error'
                          )}>
                            {stockStatus.label}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-5">
                        <h3 className="mb-1 font-heading text-lg font-bold text-text-primary line-clamp-1 group-hover:text-primary transition-colors">
                          {product.name}
                        </h3>
                        <p className="mb-3 text-sm text-text-secondary line-clamp-1">
                          {product.design} • {product.color}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <span className="font-heading text-xl font-bold text-accent-saffron">
                            {estimatePrice(product)}
                          </span>
                          <span className="text-xs text-text-muted">
                            SKU: {product.sku}
                          </span>
                        </div>
                      </div>
                    </GlassCard>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product Detail Modal */}
      <AnimatePresence>
        {selectedProduct && (
          <motion.div
            initial="hidden"
            animate="visible"
            exit="exit"
            variants={modalBackdrop}
            onClick={() => setSelectedProduct(null)}
            className="fixed inset-0 z-50 flex items-center justify-center bg-surface-overlay p-4 backdrop-blur-md"
          >
            <motion.div
              variants={modalContent}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] overflow-auto"
            >
              <GlassCard padding="lg" variant="glow">
                <div className="grid gap-8 md:grid-cols-2">
                  {/* Image Gallery */}
                  <div className="space-y-4">
                    {parseImages(selectedProduct.images).map((img, idx) => (
                      <img
                        key={idx}
                        src={img}
                        alt={`${selectedProduct.name} ${idx + 1}`}
                        className="w-full rounded-lg"
                      />
                    ))}
                  </div>

                  {/* Details */}
                  <div>
                    <div className="mb-6">
                      <h2 className="font-heading text-3xl font-bold text-text-primary mb-2">
                        {selectedProduct.name}
                      </h2>
                      <p className="text-text-secondary">
                        {selectedProduct.design} • {selectedProduct.color}
                      </p>
                    </div>

                    {selectedProduct.description && (
                      <p className="mb-6 text-text-secondary">
                        {selectedProduct.description}
                      </p>
                    )}

                    <div className="mb-6 space-y-3">
                      <div className="flex justify-between">
                        <span className="text-text-secondary">SKU</span>
                        <span className="font-medium text-text-primary">{selectedProduct.sku}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Unit</span>
                        <span className="font-medium text-text-primary">{selectedProduct.unit}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-text-secondary">Estimated Price</span>
                        <span className="font-heading text-xl font-bold text-accent-saffron">
                          {estimatePrice(selectedProduct)}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <LuxuryButton variant="primary" className="flex-1">
                        <ShoppingBag className="h-4 w-4" />
                        Request Quote
                      </LuxuryButton>
                      <LuxuryButton
                        variant="secondary"
                        onClick={() => toggleFavorite(selectedProduct.id)}
                      >
                        <Heart
                          className={cn(
                            'h-4 w-4',
                            favorites.has(selectedProduct.id) && 'fill-current text-semantic-error'
                          )}
                        />
                      </LuxuryButton>
                    </div>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="absolute right-4 top-4 rounded-full bg-surface-elevated p-2 text-text-secondary transition-all hover:bg-surface-hover hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </GlassCard>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
