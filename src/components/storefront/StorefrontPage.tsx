'use client'

import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Globe2,
  Heart,
  Eye,
  PackageCheck,
  Search,
  ShoppingBag,
  Sparkles,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { parseImages } from '@/lib/utils'
import { formatCurrency } from '@/lib/tax'
import {
  resolveStorefrontLanguage,
  STOREFRONT_LANGUAGES,
  STOREFRONT_LANGUAGE_LABELS,
  storefrontDictionary,
  type StorefrontLanguage,
} from '@/lib/i18n'

type CategoryItem = {
  id: string
  name: string
  slug: string
  color: string
}

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
  costPrice?: number | null
  stocks?: Array<{ quantity: number }>
  category?: CategoryItem | null
}

type OrderFormState = {
  customerName: string
  customerEmail: string
  customerPhone: string
  quantity: string
  colorPreference: string
  note: string
}

type CartItem = {
  product: ProductItem
  quantity: string
  colorPreference: string
  note: string
}

const ORDER_FORM_INITIAL: OrderFormState = {
  customerName: '',
  customerEmail: '',
  customerPhone: '',
  quantity: '1',
  colorPreference: '',
  note: '',
}

const pageIn = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const } },
}

export default function StorefrontPage() {
  const [products, setProducts] = useState<ProductItem[]>([])
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<ProductItem | null>(null)
  const [orderForm, setOrderForm] = useState<OrderFormState>(ORDER_FORM_INITIAL)
  const [ordered, setOrdered] = useState(false)
  const [cart, setCart] = useState<CartItem[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [language, setLanguage] = useState<StorefrontLanguage>('en')
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favoriteIds, setFavoriteIds] = useState<string[]>([])

  const t = storefrontDictionary[language]

  const visibleProducts = useMemo(() => {
    if (!favoritesOnly) return products
    return products.filter((product) => favoriteIds.includes(product.id))
  }, [favoriteIds, favoritesOnly, products])

  const productCountLabel = useMemo(() => `${visibleProducts.length} ${t.productsLabel}`, [t.productsLabel, visibleProducts.length])

  function productStock(product: ProductItem) {
    const total = (product.stocks || []).reduce((sum, item) => sum + (item.quantity || 0), 0)
    const lowAt = Math.max(0, product.lowStockAt || 0)

    if (total <= 0) {
      return { total, label: 'Out of stock', badgeClass: 'badge-red' }
    }

    if (total <= lowAt) {
      return { total, label: 'Low stock', badgeClass: 'badge-amber' }
    }

    return { total, label: 'In stock', badgeClass: 'badge-green' }
  }

  function estimatedUnitPrice(product: ProductItem) {
    const base = product.costPrice && product.costPrice > 0 ? product.costPrice * 1.25 : 0
    return formatCurrency(base)
  }

  async function load() {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search) params.set('search', search)

      const response = await fetch(`/api/gallery${params.toString() ? `?${params.toString()}` : ''}`)
      const data = await response.json()

      setProducts(data.products || [])
      setCategories(data.categories || [])
    } catch {
      toast.error(t.toastLoadFailed)
    } finally {
      setLoading(false)
    }
  }

  function resetOrderFlow(product?: ProductItem | null) {
    setSelected(product ?? null)
    setOrdered(false)
    setOrderForm(ORDER_FORM_INITIAL)
  }

  function addToCart(product: ProductItem, quantity = '1', colorPreference = '', note = '') {
    setCart((current) => {
      const existing = current.find((item) => item.product.id === product.id)
      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: String(Math.max(0.01, Number(item.quantity || '0') + Number(quantity || '0'))),
                colorPreference: colorPreference || item.colorPreference,
                note: note || item.note,
              }
            : item
        )
      }

      return [...current, { product, quantity, colorPreference, note }]
    })

    toast.success('Added to cart.')
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.product.id !== productId))
  }

  function toggleFavorite(productId: string) {
    setFavoriteIds((current) => {
      const exists = current.includes(productId)
      if (exists) {
        toast.success('Removed from favorites')
        return current.filter((id) => id !== productId)
      }

      toast.success('Saved to favorites')
      return [...current, productId]
    })
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault()

    if (!selected) return
    if (!orderForm.customerName.trim()) {
      toast.error(t.validationName)
      return
    }

    if (!orderForm.customerEmail.includes('@')) {
      toast.error(t.validationEmail)
      return
    }

    if (Number(orderForm.quantity) < 0.01) {
      toast.error(t.validationQuantity)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...orderForm,
          productId: selected.id,
          language,
        }),
      })

      if (!response.ok) {
        throw new Error('Order request failed')
      }

      setOrdered(true)
      toast.success(t.toastOrderPlaced)
    } catch {
      toast.error(t.toastOrderFailed)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitCartOrder(event: React.FormEvent) {
    event.preventDefault()

    if (cart.length === 0) {
      toast.error('Cart is empty.')
      return
    }

    if (!orderForm.customerName.trim()) {
      toast.error(t.validationName)
      return
    }

    if (!orderForm.customerEmail.includes('@')) {
      toast.error(t.validationEmail)
      return
    }

    setSubmitting(true)

    try {
      const response = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: orderForm.customerName,
          customerEmail: orderForm.customerEmail,
          customerPhone: orderForm.customerPhone,
          language,
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: Number(item.quantity),
            colorPreference: item.colorPreference || orderForm.colorPreference,
            note: item.note || orderForm.note,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error('Order request failed')
      }

      setCart([])
      setCartOpen(false)
      setOrdered(true)
      toast.success('Cart order requests sent successfully.')
    } catch {
      toast.error(t.toastOrderFailed)
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    load()
  }, [category, search, language])

  useEffect(() => {
    const saved = resolveStorefrontLanguage(window.localStorage.getItem('storefront-language'))
    if (saved !== 'en') {
      setLanguage(saved)
      return
    }

    const browserLanguage = window.navigator.language.toLowerCase()
    if (browserLanguage.startsWith('si')) setLanguage('si')
    if (browserLanguage.startsWith('ta')) setLanguage('ta')
  }, [])

  useEffect(() => {
    window.localStorage.setItem('storefront-language', language)
  }, [language])

  useEffect(() => {
    const raw = window.localStorage.getItem('storefront-favorites')
    if (!raw) return
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        setFavoriteIds(parsed.filter((value) => typeof value === 'string'))
      }
    } catch {
      setFavoriteIds([])
    }
  }, [])

  useEffect(() => {
    window.localStorage.setItem('storefront-favorites', JSON.stringify(favoriteIds))
  }, [favoriteIds])

  const catalogSummary = [
    { label: t.catalogLabel, value: productCountLabel },
    { label: t.categoriesLabel, value: `${categories.length}` },
    { label: t.followUpLabel, value: '24/7' },
  ]

  return (
    <motion.main variants={pageIn} initial="hidden" animate="visible" className="relative min-h-screen overflow-hidden text-slate-900">
      <div
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.08),transparent_30%),radial-gradient(circle_at_18%_16%,rgba(212,175,55,0.14),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ffffff_44%,#eef4ff_100%)]"
        aria-hidden
      />

      <section className="page-shell pt-6">
        <div className="surface-card-soft flex flex-col gap-4 px-5 py-4 backdrop-blur-xl lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-navy-700 to-slate-900 text-lg font-black text-white shadow-navy">
              M
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">Madeena Tex</p>
              <p className="text-sm text-slate-600">{t.brandTag}</p>
            </div>
            <span className="hidden rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-500 lg:inline-flex">
              v2.1.0
            </span>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-[0_10px_24px_rgba(15,23,42,0.04)]">
              <Globe2 className="ml-2 h-4 w-4 text-slate-500" />
              {STOREFRONT_LANGUAGES.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setLanguage(option)}
                  className={`rounded-full px-3 py-2 text-xs font-semibold transition ${language === option ? 'bg-navy-700 text-white' : 'text-slate-500 hover:bg-slate-100'}`}
                >
                  {STOREFRONT_LANGUAGE_LABELS[option]}
                </button>
              ))}
            </div>

            <Link href="/signup" className="btn-secondary">
              {t.customerSignup}
            </Link>
            <Link href="/login" className="btn-primary">
              {t.staffLogin}
            </Link>
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-8 pb-10 pt-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-start lg:pb-14 lg:pt-12">
        <motion.div variants={fadeUp} className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <Sparkles className="h-4 w-4 text-gold-500" />
            {t.requestOrder}
          </div>

          <h1 className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            {t.heroTitle}
          </h1>

          <p className="max-w-2xl text-lg leading-8 text-slate-600">{t.heroBody}</p>
          <p className="text-sm font-medium text-slate-500">{t.heroHint}</p>

          <div className="flex flex-col gap-3 sm:flex-row">
            <a href="#catalog" className="btn-primary btn-lg">
              {t.heroPrimary}
              <ArrowRight className="h-4 w-4" />
            </a>
            <a href="#workflow" className="btn-secondary btn-lg">
              {t.heroSecondary}
            </a>
          </div>
        </motion.div>

        <div className="grid gap-4">
          {catalogSummary.map((item) => (
            <div key={item.label} className="surface-card p-5">
              <p className="section-label">{item.label}</p>
              <p className="mt-2 text-3xl font-black tracking-tight text-slate-950">{item.value}</p>
            </div>
          ))}

          <div className="surface-card bg-[linear-gradient(180deg,#0f172a_0%,#152a63_100%)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-300">{t.flowLabel}</p>
            <div className="mt-4 space-y-3">
              {[t.stepOneTitle, t.stepTwoTitle, t.stepThreeTitle].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-gold-300">
                    0{index + 1}
                  </div>
                  <p className="font-medium text-white">{step}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="catalog" className="page-shell pb-8">
        <div className="surface-card p-5 lg:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-2">
              <p className="section-label">{t.catalogLabel}</p>
              <h2 className="section-title">{productCountLabel}</h2>
              <p className="section-copy">{search ? `${t.matchingLabel} “${search}”` : t.exploreCatalog}</p>
            </div>

            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={t.searchPlaceholder}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="input pl-11"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setCategory('')}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${!category ? 'bg-navy-700 text-white shadow-navy' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              {t.allProducts}
            </button>
            {categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.slug)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${category === item.slug ? 'text-slate-950 shadow-[0_12px_30px_rgba(15,23,42,0.08)]' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                style={category === item.slug ? { backgroundColor: item.color } : undefined}
              >
                {item.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setFavoritesOnly((current) => !current)}
              className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition ${favoritesOnly ? 'bg-rose-600 text-white shadow-[0_10px_22px_rgba(225,29,72,0.3)]' : 'border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
            >
              <Heart className="h-4 w-4" />
              Favorites
            </button>
          </div>
        </div>
      </section>

      <section className="page-shell pb-10">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="gallery-card flex flex-col h-96 animate-pulse bg-surface">
                <div className="h-52 bg-slate-200 dark:bg-slate-800" />
                <div className="p-5 space-y-4 mt-2">
                  <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-1/4" />
                  <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : visibleProducts.length === 0 ? (
          <div className="surface-card px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-navy-50 text-navy-700">
              <Search className="h-6 w-6" />
            </div>
            <h3 className="text-2xl font-black text-slate-950">{favoritesOnly ? 'No favorite products yet' : t.noProductsTitle}</h3>
            <p className="mx-auto mt-3 max-w-xl text-base leading-7 text-slate-600">
              {favoritesOnly ? 'Save products to favorites and they will appear here for quick repeat ordering.' : t.noProductsBody}
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {visibleProducts.map((product) => {
              const images = parseImages(product.images)
              const stock = productStock(product)
              const isFavorite = favoriteIds.includes(product.id)

              return (
                <article key={product.id} className="gallery-card flex flex-col">
                  <button type="button" onClick={() => resetOrderFlow(product)} className="group block w-full text-left">
                    <div className="relative aspect-4/3 overflow-hidden bg-[linear-gradient(135deg,#e2e8f0_0%,#eff6ff_52%,#f8fafc_100%)]">
                      {images[0] ? (
                        <img src={images[0]} alt={product.name} className="h-full w-full object-cover transition duration-500" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-7xl">🧶</div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/80 to-transparent px-5 py-4 text-white">
                        <div className="mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: product.category?.color || '#1e3a8a' }}>
                          {product.category?.name || t.categoriesLabel}
                        </div>
                        <p className="text-lg font-bold">{product.name}</p>
                        <p className="text-sm text-slate-200">{product.design}</p>
                      </div>

                      <div className="absolute left-3 top-3 flex flex-wrap gap-2">
                        <span className={`badge ${stock.badgeClass}`}>{stock.label}</span>
                        <span className="badge bg-white/95 text-slate-700">{stock.total.toFixed(0)} {product.unit}</span>
                      </div>

                      <div className="absolute right-3 top-3 flex items-center gap-2">
                        <button
                          type="button"
                          aria-label={isFavorite ? 'Remove from favorites' : 'Save to favorites'}
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            toggleFavorite(product.id)
                          }}
                          className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur ${isFavorite ? 'border-rose-200 bg-rose-50 text-rose-600' : 'border-white/70 bg-white/80 text-slate-600 hover:text-rose-600'}`}
                        >
                          <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
                        </button>
                        <button
                          type="button"
                          aria-label="Quick view"
                          onClick={(event) => {
                            event.preventDefault()
                            event.stopPropagation()
                            resetOrderFlow(product)
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/80 text-slate-600 backdrop-blur hover:text-navy-700"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{product.unit}</p>
                          <p className="mt-1 text-sm font-semibold text-slate-950">{product.sku}</p>
                        </div>
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50">
                          <ArrowRight className="h-4 w-4 text-slate-500" />
                        </div>
                      </div>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Estimated unit price</p>
                        <p className="mt-1 text-lg font-black text-slate-950">{estimatedUnitPrice(product)}</p>
                      </div>

                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="h-3.5 w-3.5 rounded-full border border-slate-200" style={{ backgroundColor: product.colorHex }} />
                        <span>{product.color}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="h-5 w-5 rounded-full border border-slate-200" title={product.color} style={{ backgroundColor: product.colorHex }} />
                        <span className="h-5 w-5 rounded-full border border-slate-200" title={product.category?.name || 'Category'} style={{ backgroundColor: product.category?.color || '#1e3a8a' }} />
                        <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                          <PackageCheck className="h-3.5 w-3.5" />
                          live stock
                        </span>
                      </div>
                    </div>
                  </button>

                  <div className="mt-auto border-t border-slate-200 bg-slate-50 px-5 py-4">
                    <div className="flex gap-3">
                      <button type="button" onClick={() => resetOrderFlow(product)} className="btn-secondary flex-1">
                        {t.requestOrder}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          addToCart(product)
                          setCartOpen(true)
                        }}
                        className="btn-primary flex-1"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Add
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section id="workflow" className="page-shell grid gap-6 pb-16 lg:grid-cols-[1fr_0.9fr]">
        <div className="surface-card p-6 lg:p-8">
          <p className="section-label">{t.flowLabel}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">{t.howItWorksTitle}</h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {[
              { title: t.stepOneTitle, body: t.stepOneBody, marker: '01' },
              { title: t.stepTwoTitle, body: t.stepTwoBody, marker: '02' },
              { title: t.stepThreeTitle, body: t.stepThreeBody, marker: '03' },
            ].map((step) => (
              <div key={step.marker} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">{step.marker}</p>
                <h3 className="mt-3 text-lg font-bold text-slate-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="surface-card bg-[linear-gradient(180deg,#0f172a_0%,#152a63_100%)] p-6 lg:p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
          <p className="section-label text-gold-300">{t.operationsLabel}</p>
          <h2 className="mt-3 text-3xl font-black text-white">{t.supportTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-200/90">{t.supportBody}</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="font-semibold text-white">{t.adminLabel}</p>
              <p className="mt-1 text-sm leading-6 text-slate-200/90">{t.supportAdmin}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="font-semibold text-white">{t.shopLabel}</p>
              <p className="mt-1 text-sm leading-6 text-slate-200/90">{t.supportShop}</p>
            </div>
            <div className="rounded-2xl bg-white/5 p-4">
              <p className="font-semibold text-white">{t.customerLabel}</p>
              <p className="mt-1 text-sm leading-6 text-slate-200/90">{t.supportCustomer}</p>
            </div>
          </div>
        </div>
      </section>

      <AnimatePresence>
        {selected && (
          <motion.div
            className="modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) resetOrderFlow(null)
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal max-w-5xl overflow-hidden p-0"
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              {ordered ? (
                <div className="grid gap-0 lg:grid-cols-2">
                  <div className="bg-[linear-gradient(180deg,#0f172a_0%,#152a63_100%)] px-8 py-12 text-white">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
                      <CheckCircle2 className="h-8 w-8" />
                    </div>
                    <h2 className="mt-6 text-3xl font-black">{t.orderSuccessTitle}</h2>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-slate-200/90">{t.orderSuccessBody}</p>
                    <button type="button" onClick={() => resetOrderFlow(null)} className="btn-primary mt-8 bg-gold-500 text-navy-950 hover:bg-gold-400">
                      {t.browseMore}
                    </button>
                  </div>

                  <div className="p-8">
                    <p className="section-label">Request submitted</p>
                    <h3 className="mt-2 text-2xl font-black text-slate-950">Your order has been captured cleanly.</h3>
                    <p className="mt-4 text-sm leading-7 text-slate-600">You can continue browsing or submit another request.</p>
                    <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                      <a href="#catalog" className="btn-secondary">
                        Back to catalog
                      </a>
                      <Link href="/customer/login" className="btn-primary">
                        Customer portal
                      </Link>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                  <div className="bg-slate-950 p-6 text-white lg:p-8">
                    {(() => {
                      const images = parseImages(selected.images)
                      return images[0] ? (
                        <img src={images[0]} alt={selected.name} className="h-80 w-full rounded-3xl object-cover" />
                      ) : (
                        <div className="flex h-80 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#1e3a8a_0%,#0f172a_100%)] text-7xl">
                          🧶
                        </div>
                      )
                    })()}

                    <div className="mt-6 space-y-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-300">{t.orderModalTitle}</p>
                        <h2 className="mt-2 text-3xl font-black">{selected.name}</h2>
                        <p className="mt-2 text-sm text-slate-300">{selected.design}</p>
                      </div>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="badge text-white" style={{ backgroundColor: selected.category?.color || '#1e3a8a' }}>
                          {selected.category?.name || t.categoriesLabel}
                        </span>
                        <span className="badge badge-gray">{selected.unit}</span>
                        <span className="badge badge-gray font-mono">{selected.sku}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="h-4 w-4 rounded-full border border-white/20" style={{ backgroundColor: selected.colorHex }} />
                        <span>{selected.color}</span>
                      </div>
                      {selected.description ? <p className="text-sm leading-7 text-slate-300">{selected.description}</p> : null}
                    </div>
                  </div>

                  <div className="p-6 sm:p-8">
                    <div className="mb-6 flex items-start justify-between gap-4">
                      <div>
                        <p className="section-label">{t.requestOrder}</p>
                        <h3 className="mt-2 text-2xl font-black text-slate-950">{t.orderFormTitle}</h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => resetOrderFlow(null)}
                        className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                        aria-label="Close order form"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    <form onSubmit={submitOrder} className="space-y-4">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="form-group sm:col-span-2">
                          <label className="label">{t.yourName} *</label>
                          <input required className="input" value={orderForm.customerName} onChange={(event) => setOrderForm((current) => ({ ...current, customerName: event.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="label">{t.email} *</label>
                          <input required type="email" className="input" value={orderForm.customerEmail} onChange={(event) => setOrderForm((current) => ({ ...current, customerEmail: event.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="label">{t.phone}</label>
                          <input className="input" value={orderForm.customerPhone} onChange={(event) => setOrderForm((current) => ({ ...current, customerPhone: event.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="label">{t.quantity} ({selected.unit})</label>
                          <input type="number" min="0.01" step="0.01" className="input" value={orderForm.quantity} onChange={(event) => setOrderForm((current) => ({ ...current, quantity: event.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label className="label">{t.colorPreference}</label>
                          <input className="input" value={orderForm.colorPreference} onChange={(event) => setOrderForm((current) => ({ ...current, colorPreference: event.target.value }))} />
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="label">{t.specialRequirements}</label>
                        <textarea className="input min-h-28" value={orderForm.note} onChange={(event) => setOrderForm((current) => ({ ...current, note: event.target.value }))} />
                      </div>

                      <button type="submit" disabled={submitting} className="btn-primary w-full">
                        {submitting ? t.submitting : t.submitOrder}
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          addToCart(selected, orderForm.quantity, orderForm.colorPreference, orderForm.note)
                          resetOrderFlow(null)
                          setCartOpen(true)
                        }}
                        className="btn-secondary w-full"
                      >
                        <ShoppingBag className="h-4 w-4" />
                        Add this item to cart
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cart.length > 0 && !cartOpen && (
          <motion.button
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-2 rounded-full bg-navy-700 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_50px_rgba(30,64,175,0.2)]"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
          >
            <ShoppingBag className="h-4 w-4" />
            Cart ({cart.length})
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <motion.div
            className="modal-overlay"
            onClick={(event) => {
              if (event.target === event.currentTarget) setCartOpen(false)
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="modal max-w-4xl overflow-hidden"
              initial={{ opacity: 0, y: 20, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.98 }}
              transition={{ duration: 0.25 }}
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="section-label">Cart</p>
                  <h3 className="mt-2 text-2xl font-black text-slate-950">Your selected items</h3>
                  <p className="text-sm text-slate-500">Review quantities and submit all order requests together.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
                  aria-label="Close cart"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <form onSubmit={submitCartOrder} className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{item.product.name}</p>
                          <p className="text-xs text-slate-500">
                            {item.product.sku} · {item.product.unit}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.product.id)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 sm:grid-cols-3">
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          className="input"
                          value={item.quantity}
                          onChange={(event) => {
                            const quantity = event.target.value
                            setCart((current) =>
                              current.map((currentItem) =>
                                currentItem.product.id === item.product.id ? { ...currentItem, quantity } : currentItem
                              )
                            )
                          }}
                        />
                        <input
                          className="input"
                          value={item.colorPreference}
                          placeholder={t.colorPreference}
                          onChange={(event) => {
                            const value = event.target.value
                            setCart((current) =>
                              current.map((currentItem) =>
                                currentItem.product.id === item.product.id ? { ...currentItem, colorPreference: value } : currentItem
                              )
                            )
                          }}
                        />
                        <input
                          className="input"
                          value={item.note}
                          placeholder={t.specialRequirements}
                          onChange={(event) => {
                            const value = event.target.value
                            setCart((current) =>
                              current.map((currentItem) =>
                                currentItem.product.id === item.product.id ? { ...currentItem, note: value } : currentItem
                              )
                            )
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_14px_40px_rgba(15,23,42,0.06)]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="form-group sm:col-span-2">
                      <label className="label">{t.yourName} *</label>
                      <input required className="input" value={orderForm.customerName} onChange={(event) => setOrderForm((current) => ({ ...current, customerName: event.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="label">{t.email} *</label>
                      <input required type="email" className="input" value={orderForm.customerEmail} onChange={(event) => setOrderForm((current) => ({ ...current, customerEmail: event.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="label">{t.phone}</label>
                      <input className="input" value={orderForm.customerPhone} onChange={(event) => setOrderForm((current) => ({ ...current, customerPhone: event.target.value }))} />
                    </div>
                    <div className="form-group sm:col-span-2">
                      <label className="label">{t.specialRequirements}</label>
                      <textarea className="input min-h-24" value={orderForm.note} onChange={(event) => setOrderForm((current) => ({ ...current, note: event.target.value }))} />
                    </div>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 text-sm leading-7 text-slate-600">
                    <p className="font-semibold text-slate-950">{t.supportTitle}</p>
                    <p className="mt-1">{t.supportBody}</p>
                  </div>

                  <button type="submit" disabled={submitting} className="btn-primary w-full">
                    {submitting ? t.submitting : 'Submit all order requests'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.main>
  )
}