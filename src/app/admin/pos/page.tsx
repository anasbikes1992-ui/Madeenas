'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import { calculateMultipleItemsTax, formatCurrency, formatTaxRate } from '@/lib/tax'
import { VATBreakdown } from '@/components/shared/VATBreakdown'
import { exportSaleInvoicePDF } from '@/lib/reports'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Category {
  id: string
  name: string
  color: string
  icon?: string | null
}

interface VariantStock {
  locationId: string
  quantity: number
}

interface ProductVariant {
  id: string
  sku: string
  colorName: string
  colorHex: string
  stockUnit: string
  stockUnitLabel: string
  saleUnit: string
  saleUnitLabel: string
  saleToStockFactor: number
  salePrice?: number | null
  costPrice?: number | null
  stocks: VariantStock[]
}

interface Product {
  id: string
  name: string
  category?: { id: string; name: string; color: string; icon?: string | null } | null
  variants: ProductVariant[]
}

interface CartItem {
  variantId: string
  variantSku: string
  colorName: string
  colorHex: string
  productName: string
  saleUnit: string
  saleUnitLabel: string
  saleToStockFactor: number
  quantity: number
  unitPrice: number
}

interface CompletedSale {
  id: string
  receiptNo: string
  createdAt: string
  customerName?: string | null
  customerPhone?: string | null
  paymentMode: string
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  whatsapp?: {
    enabled: boolean
    attempted: number
    delivered: number
    skipped: string[]
    failures: string[]
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_TAX_RATE = 18

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getTotalStockForVariant(variant: ProductVariant): number {
  return variant.stocks.reduce((sum, s) => sum + (s.quantity ?? 0), 0)
}

function getStockAtLocation(variant: ProductVariant, locationId: string | null): number {
  if (!locationId) return getTotalStockForVariant(variant)
  const s = variant.stocks.find((st) => st.locationId === locationId)
  return s ? s.quantity : 0
}

// ---------------------------------------------------------------------------
// Variant Selector Modal
// ---------------------------------------------------------------------------

interface VariantSelectorProps {
  product: Product
  userLocationId: string | null
  onSelect: (variant: ProductVariant) => void
  onClose: () => void
}

function VariantSelectorModal({ product, userLocationId, onSelect, onClose }: VariantSelectorProps) {
  const [selected, setSelected] = useState<ProductVariant | null>(
    product.variants.length === 1 ? product.variants[0] : null
  )

  const handleConfirm = () => {
    if (!selected) return
    onSelect(selected)
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label={`Select variant for ${product.name}`}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-[0_32px_100px_rgba(15,23,42,0.2)] fade-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">
              Choose variant
            </p>
            <h2 className="mt-0.5 text-xl font-black text-slate-950">{product.name}</h2>
            {product.category && (
              <span
                className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  backgroundColor: `${product.category.color}20`,
                  color: product.category.color,
                }}
              >
                {product.category.icon && <span>{product.category.icon}</span>}
                {product.category.name}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="mt-0.5 rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close variant selector"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Variants grid */}
        <div className="max-h-[60vh] overflow-y-auto p-6">
          <p className="mb-4 text-sm font-semibold text-slate-500">
            {product.variants.length} colour{product.variants.length !== 1 ? 's' : ''} available
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {product.variants.map((variant) => {
              const stock = getStockAtLocation(variant, userLocationId)
              const isOutOfStock = stock <= 0
              const isLowStock = stock > 0 && stock <= 10
              const isSelected = selected?.id === variant.id

              return (
                <button
                  key={variant.id}
                  onClick={() => !isOutOfStock && setSelected(variant)}
                  disabled={isOutOfStock}
                  className={[
                    'relative flex flex-col rounded-2xl border p-4 text-left transition-all',
                    isOutOfStock
                      ? 'cursor-not-allowed border-slate-100 bg-slate-50 opacity-50'
                      : isSelected
                      ? 'border-indigo-400 bg-indigo-50 ring-2 ring-indigo-300'
                      : 'border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md',
                  ].join(' ')}
                >
                  {/* Color swatch row */}
                  <div className="flex items-center gap-3">
                    <span
                      className="h-8 w-8 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-slate-200"
                      style={{ backgroundColor: variant.colorHex }}
                      title={variant.colorName}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-slate-900">{variant.colorName}</p>
                      <p className="truncate text-[11px] text-slate-500">{variant.sku}</p>
                    </div>
                    {isSelected && (
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                          <path
                            fillRule="evenodd"
                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </span>
                    )}
                  </div>

                  {/* Details row */}
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <div>
                      <p className="text-base font-black text-indigo-600">
                        {formatCurrency(variant.salePrice ?? 0)}
                      </p>
                      <p className="text-[10px] text-slate-500">per {variant.saleUnitLabel}</p>
                    </div>
                    <span
                      className={[
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        isOutOfStock
                          ? 'bg-red-100 text-red-700'
                          : isLowStock
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-emerald-100 text-emerald-700',
                      ].join(' ')}
                    >
                      {isOutOfStock
                        ? 'Out of stock'
                        : `${stock.toLocaleString()} ${variant.stockUnitLabel}`}
                    </span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-slate-100 px-6 py-4">
          <button
            onClick={onClose}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected}
            className="btn-primary disabled:opacity-50"
          >
            Add to cart
            {selected && (
              <span
                className="ml-2 inline-block h-3 w-3 rounded-full border border-white/40"
                style={{ backgroundColor: selected.colorHex }}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main POS Page
// ---------------------------------------------------------------------------

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [cart, setCart] = useState<CartItem[]>([])
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [paymentMode, setPaymentMode] = useState('CASH')
  const [isCreditEligible, setIsCreditEligible] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [taxRate, setTaxRate] = useState(DEFAULT_TAX_RATE)
  const [userLocationId, setUserLocationId] = useState<string | null>(null)

  // Variant selector modal state
  const [variantProduct, setVariantProduct] = useState<Product | null>(null)

  // ---------------------------------------------------------------------------
  // Data loading
  // ---------------------------------------------------------------------------

  useEffect(() => {
    fetch('/api/categories')
      .then((r) => r.json())
      .then((d) => setCategories(Array.isArray(d) ? d : []))
      .catch(() => {})

    fetch('/api/products?limit=500')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data.products || [])
        setLoading(false)
      })
      .catch(() => {
        toast.error('Failed to load products')
        setLoading(false)
      })

    // Try to get user's location from session
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((s) => {
        if (s?.user?.locationId) setUserLocationId(s.user.locationId)
      })
      .catch(() => {})
  }, [])

  // ---------------------------------------------------------------------------
  // Filtering
  // ---------------------------------------------------------------------------

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const searchLower = search.toLowerCase()
      const matchesSearch =
        !search ||
        p.name.toLowerCase().includes(searchLower) ||
        p.variants.some(
          (v) =>
            v.sku.toLowerCase().includes(searchLower) ||
            v.colorName.toLowerCase().includes(searchLower)
        )
      const matchesCategory =
        !selectedCategory || p.category?.id === selectedCategory
      return matchesSearch && matchesCategory
    })
  }, [products, search, selectedCategory])

  // ---------------------------------------------------------------------------
  // Product click => open variant selector (or direct-add for single variant)
  // ---------------------------------------------------------------------------

  const addVariantToCart = useCallback((variant: ProductVariant, productName: string) => {
    const unitPrice = variant.salePrice ?? variant.costPrice ?? 0
    setCart((prev) => {
      const existing = prev.find((item) => item.variantId === variant.id)
      if (existing) {
        return prev.map((item) =>
          item.variantId === variant.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      }
      const newItem: CartItem = {
        variantId: variant.id,
        variantSku: variant.sku,
        colorName: variant.colorName,
        colorHex: variant.colorHex,
        productName,
        saleUnit: variant.saleUnit,
        saleUnitLabel: variant.saleUnitLabel,
        saleToStockFactor: variant.saleToStockFactor,
        quantity: 1,
        unitPrice,
      }
      return [...prev, newItem]
    })
    toast.success(`Added ${productName} \u2013 ${variant.colorName}`)
  }, [])

  const handleProductClick = useCallback((product: Product) => {
    if (product.variants.length === 0) {
      toast.error('This product has no variants configured')
      return
    }

    // Single-variant products: check stock and add directly
    if (product.variants.length === 1) {
      const variant = product.variants[0]
      const stock = getStockAtLocation(variant, userLocationId)
      if (stock <= 0) {
        toast.error(`${product.name} is out of stock`)
        return
      }
      addVariantToCart(variant, product.name)
      return
    }

    // Multi-variant: show selector
    setVariantProduct(product)
  }, [userLocationId, addVariantToCart])

  // ---------------------------------------------------------------------------
  // Cart operations
  // ---------------------------------------------------------------------------

  const updateQuantity = (variantId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((item) => item.variantId !== variantId))
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, quantity } : item
      )
    )
  }

  const updatePrice = (variantId: string, unitPrice: number) => {
    if (unitPrice < 0) {
      toast.error('Unit price cannot be negative')
      return
    }
    setCart((prev) =>
      prev.map((item) =>
        item.variantId === variantId ? { ...item, unitPrice } : item
      )
    )
  }

  const removeFromCart = (variantId: string) => {
    setCart((prev) => prev.filter((item) => item.variantId !== variantId))
  }

  // ---------------------------------------------------------------------------
  // VAT breakdown
  // ---------------------------------------------------------------------------

  const taxBreakdown = useMemo(() => {
    if (cart.length === 0) {
      return { subTotal: 0, taxRate, taxAmount: 0, grandTotal: 0, items: [] }
    }
    return calculateMultipleItemsTax(
      cart.map((item) => ({ quantity: item.quantity, unitPrice: item.unitPrice })),
      taxRate
    )
  }, [cart, taxRate])

  // ---------------------------------------------------------------------------
  // Summary stats
  // ---------------------------------------------------------------------------

  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  const lowStockCount = useMemo(() => {
    return products.reduce((count, product) => {
      const hasLow = product.variants.some((v) => {
        const stock = getStockAtLocation(v, userLocationId)
        return stock > 0 && stock <= 10
      })
      return hasLow ? count + 1 : count
    }, 0)
  }, [products, userLocationId])

  // ---------------------------------------------------------------------------
  // Checkout
  // ---------------------------------------------------------------------------

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
    const cartSnapshot = cart.map((item) => ({ ...item }))

    try {
      const res = await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: customerName.trim() || undefined,
          customerPhone: customerPhone.trim() || undefined,
          paymentMode,
          grandTotal: taxBreakdown.grandTotal,
          isCreditEligible,
          items: cart.map((item) => ({
            variantId: item.variantId,
            saleUnit: item.saleUnit,
            saleQty: item.quantity,
            unitPrice: item.unitPrice,
            saleToStockFactor: item.saleToStockFactor,
            stockQtyDeducted: item.quantity * item.saleToStockFactor,
            subTotal: item.quantity * item.unitPrice,
          })),
        }),
      })

      const sale = (await res.json()) as CompletedSale & { error?: string }
      if (!res.ok) throw new Error(sale.error || 'Checkout failed')

      // Export invoice PDF
      await exportSaleInvoicePDF({
        id: sale.id,
        receiptNo: sale.receiptNo,
        createdAt: sale.createdAt,
        customerName: sale.customerName || customerName.trim() || undefined,
        customerPhone: sale.customerPhone || customerPhone.trim() || undefined,
        paymentMode: sale.paymentMode,
        subTotal: sale.subTotal,
        taxRate: sale.taxRate,
        taxAmount: sale.taxAmount,
        grandTotal: sale.grandTotal,
        items: cartSnapshot.map((item) => ({
          quantity: item.quantity,
          unit: item.saleUnitLabel,
          unitPrice: item.unitPrice,
          subTotal: item.quantity * item.unitPrice,
          product: {
            name: `${item.productName} \u2013 ${item.colorName}`,
            sku: item.variantSku,
          },
        })),
      })

      toast.success(`Sale completed \u00b7 ${sale.receiptNo}`)
      if (sale.whatsapp?.attempted && sale.whatsapp.delivered > 0) {
        toast.success('Invoice sent to customer via WhatsApp')
      } else if (sale.whatsapp?.enabled && sale.whatsapp.failures.length > 0) {
        toast.error('Sale completed, but WhatsApp delivery failed')
      }

      // Reset
      setCart([])
      setCustomerName('')
      setCustomerPhone('')
      setIsCreditEligible(false)
      setPaymentMode('CASH')
      setTaxRate(DEFAULT_TAX_RATE)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setIsProcessing(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <>
      {/* Variant selector modal */}
      {variantProduct && (
        <VariantSelectorModal
          product={variantProduct}
          userLocationId={userLocationId}
          onSelect={(variant) => addVariantToCart(variant, variantProduct.name)}
          onClose={() => setVariantProduct(null)}
        />
      )}

      <div className="space-y-6 fade-in">
        {/* Hero section */}
        <section className="rounded-4xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">
                Point of sale
              </p>
              <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">
                Fast checkout with stock-aware product picking and clear payment flow.
              </h1>
              <p className="text-sm leading-7 text-slate-600">
                Search or scan products, pick a colour variant, build the cart, collect customer
                info only when needed, and complete the sale with fewer clicks.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-136">
              {[
                ['Products', String(products.length)],
                ['Cart items', String(cartItemCount)],
                ['Low stock', String(lowStockCount)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    {label}
                  </p>
                  <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Two-column layout */}
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_26rem]">
          {/* Left: Product grid */}
          <div className="flex min-h-136 flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
            {/* Toolbar */}
            <div className="border-b border-slate-100 bg-slate-50 p-4 space-y-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-lg font-black text-slate-950">Products</h2>
                  <p className="text-sm text-slate-500">
                    {filteredProducts.length} of {products.length} &mdash; click to add to sale
                  </p>
                </div>
                <input
                  type="text"
                  placeholder="Search name, SKU or colour..."
                  className="input max-w-md"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              {/* Category filter tabs */}
              {categories.length > 0 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <button
                    onClick={() => setSelectedCategory('')}
                    className={`shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                      !selectedCategory
                        ? 'bg-slate-800 text-white border-slate-800'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    All ({products.length})
                  </button>
                  {categories.map((cat) => {
                    const count = products.filter((p) => p.category?.id === cat.id).length
                    if (count === 0) return null
                    return (
                      <button
                        key={cat.id}
                        onClick={() => setSelectedCategory(cat.id)}
                        className={`shrink-0 flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold transition-all border ${
                          selectedCategory === cat.id
                            ? 'text-white border-transparent'
                            : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}
                        style={
                          selectedCategory === cat.id
                            ? { backgroundColor: cat.color, borderColor: cat.color }
                            : {}
                        }
                      >
                        {cat.icon && <span>{cat.icon}</span>}
                        {cat.name} ({count})
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Product cards */}
            <div className="flex-1 overflow-auto p-4">
              {loading ? (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {[...Array(8)].map((_, i) => (
                    <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-100" />
                  ))}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-slate-400">
                  <span className="mb-3 text-4xl">&#128269;</span>
                  <p>No products match your search</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
                  {filteredProducts.map((product) => {
                    // Aggregate stock across all variants
                    const totalStock = product.variants.reduce(
                      (sum, v) => sum + getStockAtLocation(v, userLocationId),
                      0
                    )
                    const isOutOfStock = totalStock <= 0
                    const isLowStock = totalStock > 0 && totalStock <= 10
                    const variantCount = product.variants.length

                    // Colour swatches preview (up to 4)
                    const swatchVariants = product.variants.slice(0, 4)

                    return (
                      <button
                        key={product.id}
                        onClick={() => handleProductClick(product)}
                        disabled={isOutOfStock}
                        className={[
                          'group flex flex-col items-start rounded-3xl border bg-white p-4 text-left transition hover:-translate-y-1 hover:shadow-[0_18px_60px_rgba(79,70,229,0.14)]',
                          isOutOfStock
                            ? 'border-slate-100 opacity-50 cursor-not-allowed'
                            : isLowStock
                            ? 'border-amber-200 hover:border-amber-300'
                            : 'border-slate-200 hover:border-indigo-300',
                        ].join(' ')}
                      >
                        {/* Category badge */}
                        {product.category && (
                          <span
                            className="mb-2 inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[10px] font-semibold"
                            style={{
                              backgroundColor: `${product.category.color}20`,
                              color: product.category.color,
                            }}
                          >
                            {product.category.icon ? `${product.category.icon} ` : ''}
                            {product.category.name}
                          </span>
                        )}

                        {/* Product name */}
                        <span className="w-full truncate font-semibold text-slate-950">
                          {product.name}
                        </span>

                        {/* Colour swatches */}
                        {variantCount > 0 && (
                          <div className="mt-2 flex items-center gap-1.5">
                            {swatchVariants.map((v) => (
                              <span
                                key={v.id}
                                className="h-4 w-4 rounded-full border border-white shadow-sm ring-1 ring-slate-200"
                                style={{ backgroundColor: v.colorHex }}
                                title={v.colorName}
                              />
                            ))}
                            {variantCount > 4 && (
                              <span className="text-[10px] text-slate-400">
                                +{variantCount - 4}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Price row */}
                        <div className="mt-3 flex w-full items-center justify-between gap-1">
                          <span className="text-sm font-bold text-indigo-600">
                            {product.variants[0]?.salePrice != null
                              ? formatCurrency(product.variants[0].salePrice)
                              : '—'}
                          </span>
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-600">
                            /{product.variants[0]?.saleUnitLabel ?? ''}
                          </span>
                        </div>

                        {/* Stock badge */}
                        <div className="mt-2 w-full">
                          <span
                            className={[
                              'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                              isOutOfStock
                                ? 'bg-red-100 text-red-700'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-emerald-100 text-emerald-700',
                            ].join(' ')}
                          >
                            {isOutOfStock
                              ? 'Out of stock'
                              : `Stock: ${totalStock.toLocaleString()}`}
                          </span>
                          {variantCount > 1 && !isOutOfStock && (
                            <span className="ml-1.5 text-[10px] text-slate-400">
                              {variantCount} colours
                            </span>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right: Cart and checkout */}
          <aside className="flex flex-col overflow-hidden rounded-4xl border border-slate-200 bg-white shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
            <div className="border-b border-slate-100 bg-slate-50 p-4">
              <h2 className="text-lg font-black text-slate-950">Current sale</h2>
              <p className="text-sm text-slate-500">
                Build the cart and finish checkout from this panel.
              </p>
            </div>

            {/* Cart items */}
            <div className="flex-1 overflow-auto p-4 space-y-3">
              {cart.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 bg-slate-50 py-16 text-slate-400">
                  <span className="mb-3 text-4xl">&#128722;</span>
                  <p>Cart is empty</p>
                  <p className="mt-1 text-xs">Click a product to start</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.variantId}
                    className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 min-w-0">
                        {/* Colour swatch */}
                        <span
                          className="mt-0.5 h-5 w-5 shrink-0 rounded-full border border-white shadow ring-1 ring-slate-200"
                          style={{ backgroundColor: item.colorHex }}
                          title={item.colorName}
                        />
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-slate-950">
                            {item.productName}
                          </h4>
                          <p className="truncate text-xs text-slate-500">
                            {item.colorName} &middot; {item.variantSku}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.variantId)}
                        className="shrink-0 rounded-full px-2 py-1 text-sm text-red-500 transition hover:bg-red-50"
                        aria-label={`Remove ${item.productName} ${item.colorName} from cart`}
                      >
                        &#x2715;
                      </button>
                    </div>

                    {/* Qty + price inputs */}
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) =>
                          updateQuantity(item.variantId, parseFloat(e.target.value) || 0)
                        }
                        className="input h-9 w-20 px-3 py-1 text-sm"
                        min="0"
                        step="0.1"
                        aria-label="Quantity"
                      />
                      <span className="text-xs text-slate-500">{item.saleUnitLabel}</span>
                      <span className="text-xs text-slate-400">&times;</span>
                      <input
                        type="number"
                        value={item.unitPrice}
                        onChange={(e) =>
                          updatePrice(item.variantId, parseFloat(e.target.value) || 0)
                        }
                        className="input h-9 w-24 px-3 py-1 text-sm"
                        min="0"
                        step="0.01"
                        aria-label="Unit price"
                      />
                      <span className="ml-auto text-sm font-bold text-slate-950">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Footer: customer info + totals + checkout */}
            <div className="space-y-4 border-t border-slate-100 bg-slate-50 p-4">
              {/* Customer fields */}
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Customer name (optional)"
                  aria-label="Customer name"
                  className="input h-10 text-sm"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                <div className="grid gap-2 sm:grid-cols-[1fr_9.5rem]">
                  <input
                    type="text"
                    placeholder="Phone (required for credit)"
                    aria-label="Customer phone number"
                    className="input h-10 text-sm"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                  />
                  <select
                    aria-label="Payment mode"
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

              {/* Totals */}
              <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 space-y-3">
                <div className="flex items-center justify-between text-sm text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formatCurrency(taxBreakdown.subTotal)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm text-slate-600">VAT</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={taxRate}
                      aria-label="VAT tax rate percentage"
                      onChange={(e) =>
                        setTaxRate(parseFloat(e.target.value) || DEFAULT_TAX_RATE)
                      }
                      className="input h-8 w-16 px-2 text-sm text-right"
                      min="0"
                      max="100"
                      step="0.5"
                    />
                    <span className="text-sm text-slate-600">%</span>
                    <span className="min-w-[80px] text-right text-sm font-semibold text-slate-950">
                      {formatCurrency(taxBreakdown.taxAmount)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center justify-between border-t border-slate-200 pt-2">
                  <span className="font-semibold text-slate-900">Grand Total</span>
                  <span className="text-2xl font-black text-indigo-600">
                    {formatCurrency(taxBreakdown.grandTotal)}
                  </span>
                </div>
              </div>

              {/* Checkout button */}
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
    </>
  )
}
