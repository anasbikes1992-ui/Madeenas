'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { parseImages } from '@/lib/utils'
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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [language, setLanguage] = useState<StorefrontLanguage>('en')
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const t = storefrontDictionary[language]

  const productCountLabel = useMemo(() => `${products.length} ${t.productsLabel}`, [products.length, t.productsLabel])

  function queueToast(type: 'success' | 'error', message: string) {
    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current)
    }

    setToast({ type, message })
    toastTimerRef.current = setTimeout(() => setToast(null), 3500)
  }

  async function load() {
    setLoading(true)

    try {
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (search) params.set('search', search)

      const response = await fetch(`/api/gallery?${params.toString()}`)
      const data = await response.json()

      setProducts(data.products || [])
      setCategories(data.categories || [])
    } catch {
      queueToast('error', t.toastLoadFailed)
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
    queueToast('success', 'Added to cart.')
  }

  function removeFromCart(productId: string) {
    setCart((current) => current.filter((item) => item.product.id !== productId))
  }

  async function submitOrder(event: React.FormEvent) {
    event.preventDefault()

    if (!selected) return
    if (!orderForm.customerName.trim()) {
      queueToast('error', t.validationName)
      return
    }

    if (!orderForm.customerEmail.includes('@')) {
      queueToast('error', t.validationEmail)
      return
    }

    if (Number(orderForm.quantity) < 0.01) {
      queueToast('error', t.validationQuantity)
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
      queueToast('success', t.toastOrderPlaced)
    } catch {
      queueToast('error', t.toastOrderFailed)
    } finally {
      setSubmitting(false)
    }
  }

  async function submitCartOrder(event: React.FormEvent) {
    event.preventDefault()

    if (cart.length === 0) {
      queueToast('error', 'Cart is empty.')
      return
    }

    if (!orderForm.customerName.trim()) {
      queueToast('error', t.validationName)
      return
    }

    if (!orderForm.customerEmail.includes('@')) {
      queueToast('error', t.validationEmail)
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
      queueToast('success', 'Cart order requests sent successfully.')
    } catch {
      queueToast('error', t.toastOrderFailed)
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
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [])

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(212,175,55,0.2),transparent_30%),radial-gradient(circle_at_90%_15%,rgba(99,102,241,0.18),transparent_24%),linear-gradient(180deg,#0a1128_0%,#0e1b3d_48%,#12224b_100%)]">
      <section className="relative overflow-hidden border-b border-indigo-100/60 bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(56,189,248,0.22),transparent_24%),radial-gradient(circle_at_20%_10%,rgba(99,102,241,0.28),transparent_30%),linear-gradient(135deg,#020617_0%,#172554_55%,#312e81_100%)]" />
        <div className="relative mx-auto flex max-w-7xl flex-col gap-10 px-6 py-8 lg:px-10 lg:py-12">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 text-2xl shadow-lg shadow-indigo-900/40">🧵</div>
              <div>
                <p className="text-lg font-semibold tracking-wide">Madeena Tex</p>
                <p className="text-sm text-indigo-200">{t.brandTag}</p>
              </div>
              <div className="text-xs text-indigo-300/60">v2.1.0</div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-2xl border border-white/15 bg-white/10 p-1 backdrop-blur">
                {STOREFRONT_LANGUAGES.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setLanguage(option)}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${language === option ? 'bg-white text-slate-900 shadow-sm' : 'text-indigo-100 hover:bg-white/10'}`}
                  >
                    {STOREFRONT_LANGUAGE_LABELS[option]}
                  </button>
                ))}
              </div>

              <a href="/signup" className="btn-secondary border-white/15 bg-white/5 text-white hover:bg-white/10">
                {t.customerSignup}
              </a>

              <a href="/login" className="btn-secondary border-white/15 bg-white/10 text-white hover:bg-white/20">
                {t.staffLogin}
              </a>
            </div>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-6">
              <div className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-cyan-100">
                {t.requestOrder}
              </div>
              <div className="max-w-3xl space-y-4">
                <h1 className="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
                  {t.heroTitle}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-indigo-100 sm:text-lg">
                  {t.heroBody}
                </p>
                <p className="text-sm text-cyan-100/90">{t.heroHint}</p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <a href="#catalog" className="btn-primary btn-lg justify-center bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  {t.heroPrimary}
                </a>
                <a href="#workflow" className="btn-secondary btn-lg justify-center border-white/15 bg-white/5 text-white hover:bg-white/10">
                  {t.heroSecondary}
                </a>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t.catalogLabel}</p>
                <p className="mt-3 text-3xl font-black">{products.length || '—'}</p>
                <p className="mt-2 text-sm text-indigo-100">{t.productsLabel}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t.categoriesLabel}</p>
                <p className="mt-3 text-3xl font-black">{categories.length || '—'}</p>
                <p className="mt-2 text-sm text-indigo-100">{t.categoriesBody}</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-md">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-200">{t.followUpLabel}</p>
                <p className="mt-3 text-3xl font-black">24/7</p>
                <p className="mt-2 text-sm text-indigo-100">{t.followUpBody}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="catalog" className="mx-auto max-w-7xl px-6 py-10 lg:px-10 lg:py-12">
        <div className="mb-8 grid gap-4 rounded-4xl border border-indigo-200/25 bg-white/10 p-5 shadow-[0_24px_90px_rgba(2,6,23,0.45)] backdrop-blur-xl lg:grid-cols-[1fr_auto] lg:items-end">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-gold-300">{t.catalogLabel}</p>
            <h2 className="text-3xl font-black text-white">{productCountLabel}</h2>
            <p className="text-sm text-slate-200/85">{search ? `${t.matchingLabel} “${search}”` : t.exploreCatalog}</p>
          </div>

          <div className="relative min-w-full lg:min-w-104">
            <input
              type="text"
              placeholder={t.searchPlaceholder}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="input rounded-3xl border-indigo-200/40 bg-slate-950/40 py-4 pl-12 pr-5 text-slate-100 placeholder:text-slate-400"
            />
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300">⌕</span>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setCategory('')}
            className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${!category ? 'bg-gold-500 text-slate-950 shadow-lg shadow-gold-900/40' : 'bg-white/10 text-slate-100 shadow-sm ring-1 ring-white/20 hover:ring-gold-400/70'}`}
          >
            {t.allProducts}
          </button>
          {categories.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setCategory(item.slug)}
              className={`rounded-full px-5 py-2.5 text-sm font-semibold transition ${category === item.slug ? 'text-slate-950 shadow-lg' : 'bg-white/10 text-slate-100 shadow-sm ring-1 ring-white/20 hover:ring-gold-400/70'}`}
              style={category === item.slug ? { backgroundColor: item.color } : undefined}
            >
              {item.name}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="gallery-card h-88 animate-pulse bg-slate-200" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-4xl border border-dashed border-white/30 bg-white/10 px-6 py-20 text-center shadow-sm backdrop-blur">
            <div className="mb-4 text-6xl">🔎</div>
            <h3 className="text-2xl font-black text-white">{t.noProductsTitle}</h3>
            <p className="mt-3 text-slate-200">{t.noProductsBody}</p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {products.map((product) => {
              const images = parseImages(product.images)

              return (
                <article
                  key={product.id}
                  className="group overflow-hidden rounded-3xl border border-white/20 bg-white/95 shadow-[0_18px_60px_rgba(2,6,23,0.35)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_24px_80px_rgba(212,175,55,0.25)]"
                >
                  <button type="button" className="w-full text-left" onClick={() => resetOrderFlow(product)}>
                    <div className="relative h-64 overflow-hidden bg-[linear-gradient(135deg,#dbeafe_0%,#e0e7ff_55%,#ede9fe_100%)]">
                      {images[0] ? (
                        <img src={images[0]} alt={product.name} className="gallery-img h-full w-full transition duration-500 group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-7xl">🧶</div>
                      )}
                      <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-slate-950/75 to-transparent px-5 py-4 text-white">
                        <div className="mb-2 inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]" style={{ backgroundColor: product.category?.color || '#4f46e5' }}>
                          {product.category?.name || t.categoriesLabel}
                        </div>
                        <p className="text-lg font-bold">{product.name}</p>
                        <p className="text-sm text-slate-200">{product.design}</p>
                      </div>
                    </div>

                    <div className="space-y-4 p-5">
                      <div className="flex items-center justify-between text-sm text-slate-500">
                        <div className="flex items-center gap-2">
                          <span className="h-3.5 w-3.5 rounded-full border border-slate-200" style={{ backgroundColor: product.colorHex }} />
                          <span>{product.color}</span>
                        </div>
                        <code className="rounded-full bg-slate-100 px-2.5 py-1 font-mono text-xs text-slate-600">{product.sku}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">{product.unit}</p>
                        <span className="text-sm font-semibold text-indigo-600">{t.requestOrder} →</span>
                      </div>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation()
                          addToCart(product)
                          setCartOpen(true)
                        }}
                        className="btn-primary w-full justify-center text-sm font-semibold"
                      >
                        🛒 Add to Cart
                      </button>
                    </div>
                  </button>
                </article>
              )
            })}
          </div>
        )}
      </section>

      <section id="workflow" className="mx-auto grid max-w-7xl gap-6 px-6 pb-14 lg:grid-cols-[1fr_0.9fr] lg:px-10">
        <div className="rounded-4xl border border-white/20 bg-white/10 p-8 shadow-[0_22px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">{t.flowLabel}</p>
          <h2 className="mt-3 text-3xl font-black text-white">{t.howItWorksTitle}</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {[
              { title: t.stepOneTitle, body: t.stepOneBody, marker: '01' },
              { title: t.stepTwoTitle, body: t.stepTwoBody, marker: '02' },
              { title: t.stepThreeTitle, body: t.stepThreeBody, marker: '03' },
            ].map((step) => (
              <div key={step.marker} className="rounded-3xl bg-slate-950/35 p-5 ring-1 ring-white/15">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-500">{step.marker}</p>
                <h3 className="mt-3 text-lg font-bold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-200/85">{step.body}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-4xl border border-cyan-200/60 bg-[linear-gradient(160deg,#ecfeff_0%,#ffffff_40%,#eff6ff_100%)] p-8 shadow-[0_20px_70px_rgba(8,145,178,0.12)]">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-700">{t.operationsLabel}</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">{t.supportTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">{t.supportBody}</p>
          <div className="mt-6 space-y-4">
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="font-semibold text-slate-900">{t.adminLabel}</p>
              <p className="mt-1 text-sm text-slate-600">{t.supportAdmin}</p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="font-semibold text-slate-900">{t.shopLabel}</p>
              <p className="mt-1 text-sm text-slate-600">{t.supportShop}</p>
            </div>
            <div className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
              <p className="font-semibold text-slate-900">{t.customerLabel}</p>
              <p className="mt-1 text-sm text-slate-600">{t.supportCustomer}</p>
            </div>
          </div>
        </div>
      </section>

      {selected && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) resetOrderFlow(null) }}>
          <div className="modal max-w-3xl max-h-[92vh] overflow-y-auto p-0">
            {ordered ? (
              <div className="bg-[linear-gradient(180deg,#0f172a_0%,#1e1b4b_100%)] px-8 py-14 text-center text-white">
                <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/20 text-5xl">✓</div>
                <h2 className="text-3xl font-black">{t.orderSuccessTitle}</h2>
                <p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-indigo-100">{t.orderSuccessBody}</p>
                <button type="button" onClick={() => resetOrderFlow(null)} className="btn-primary mt-8 bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  {t.browseMore}
                </button>
              </div>
            ) : (
              <div className="grid lg:grid-cols-[0.95fr_1.05fr]">
                <div className="bg-slate-950 p-6 text-white">
                  {(() => {
                    const images = parseImages(selected.images)
                    return images[0] ? (
                      <img src={images[0]} alt={selected.name} className="h-72 w-full rounded-3xl object-cover" />
                    ) : (
                      <div className="flex h-72 items-center justify-center rounded-3xl bg-[linear-gradient(135deg,#1e3a8a_0%,#312e81_100%)] text-7xl">🧶</div>
                    )
                  })()}

                  <div className="mt-6 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-200">{t.orderModalTitle}</p>
                      <h2 className="mt-2 text-3xl font-black">{selected.name}</h2>
                      <p className="mt-2 text-sm text-slate-300">{selected.design}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm">
                      <span className="badge text-white" style={{ backgroundColor: selected.category?.color || '#4f46e5' }}>{selected.category?.name || t.categoriesLabel}</span>
                      <span className="badge badge-gray">{selected.unit}</span>
                      <code className="badge badge-gray font-mono">{selected.sku}</code>
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
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">{t.requestOrder}</p>
                      <h3 className="mt-2 text-2xl font-black text-slate-950">{t.orderFormTitle}</h3>
                    </div>
                    <button type="button" onClick={() => resetOrderFlow(null)} className="text-3xl text-slate-400 hover:text-slate-700">&times;</button>
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
                    <button type="submit" disabled={submitting} className="btn-primary w-full justify-center bg-slate-950 hover:bg-indigo-700">
                      {submitting ? t.submitting : t.submitOrder}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        addToCart(selected, orderForm.quantity, orderForm.colorPreference, orderForm.note)
                        resetOrderFlow(null)
                        setCartOpen(true)
                      }}
                      className="btn-secondary w-full justify-center"
                    >
                      Add this item to cart
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {cart.length > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white shadow-xl shadow-slate-900/30 hover:bg-indigo-700"
        >
          Cart ({cart.length})
        </button>
      )}

      {cartOpen && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}>
          <div className="modal max-w-3xl max-h-[92vh] overflow-y-auto">
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-2xl font-black text-slate-900">Your cart</h3>
                <p className="text-sm text-slate-500">Review quantities and submit all order requests together.</p>
              </div>
              <button type="button" onClick={() => setCartOpen(false)} className="text-3xl text-slate-400 hover:text-slate-700">&times;</button>
            </div>

            <div className="space-y-3">
              {cart.map((item) => (
                <div key={item.product.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{item.product.name}</p>
                      <p className="text-xs text-slate-500">{item.product.sku} · {item.product.unit}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.product.id)}
                      className="text-sm text-red-600 hover:underline"
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
                        const value = event.target.value
                        setCart((current) => current.map((line) => line.product.id === item.product.id ? { ...line, quantity: value } : line))
                      }}
                    />
                    <input
                      className="input"
                      placeholder="Color preference"
                      value={item.colorPreference}
                      onChange={(event) => {
                        const value = event.target.value
                        setCart((current) => current.map((line) => line.product.id === item.product.id ? { ...line, colorPreference: value } : line))
                      }}
                    />
                    <input
                      className="input"
                      placeholder="Item note"
                      value={item.note}
                      onChange={(event) => {
                        const value = event.target.value
                        setCart((current) => current.map((line) => line.product.id === item.product.id ? { ...line, note: value } : line))
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={submitCartOrder} className="mt-6 space-y-4 border-t border-slate-200 pt-5">
              <h4 className="text-lg font-bold text-slate-900">Customer details</h4>
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
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full justify-center bg-slate-950 hover:bg-indigo-700">
                {submitting ? t.submitting : 'Submit cart orders'}
              </button>
            </form>
          </div>
        </div>
      )}

      {toast ? <div className={toast.type === 'success' ? 'toast-success' : 'toast-error'}>{toast.message}</div> : null}
    </div>
  )
}