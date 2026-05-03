'use client'
import { useEffect, useState } from 'react'
import { parseImages } from '@/lib/utils'

export default function GalleryPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<any>(null)
  const [orderForm, setOrderForm] = useState({ customerName: '', customerEmail: '', customerPhone: '', quantity: '1', colorPreference: '', note: '' })
  const [ordered, setOrdered] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (search) params.set('search', search)
    const res = await fetch('/api/gallery?' + params)
    const data = await res.json()
    setProducts(data.products || [])
    setCategories(data.categories || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [category, search])

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...orderForm, productId: selected.id }),
    })
    setSubmitting(false)
    setOrdered(true)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white">
        <div className="max-w-7xl mx-auto px-6 py-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="text-xl font-bold">Madeena Tex</span>
            <div className="ml-auto">
              <a href="/login" className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
                Staff Login →
              </a>
            </div>
          </div>
          <h1 className="text-5xl font-bold leading-tight mb-4">
            Premium Textile<br/>Raw Materials
          </h1>
          <p className="text-indigo-200 text-lg max-w-xl">
            Browse our curated collection of high-quality textile raw materials. Submit an order request and our team will get in touch.
          </p>
          {/* Search */}
          <div className="mt-8 max-w-lg">
            <div className="relative">
              <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search fabrics, designs, colors..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full bg-white/20 backdrop-blur text-white placeholder:text-indigo-300 border border-white/30 rounded-2xl pl-12 pr-5 py-4 focus:outline-none focus:ring-2 focus:ring-white/50"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button
            onClick={() => setCategory('')}
            className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${!category ? 'bg-indigo-600 text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}
          >
            All Products
          </button>
          {categories.map((c: any) => (
            <button
              key={c.id}
              onClick={() => setCategory(c.slug)}
              className={`px-5 py-2.5 rounded-2xl text-sm font-medium transition-all ${category === c.slug ? 'text-white shadow-md' : 'bg-white text-slate-600 border border-slate-200 hover:border-indigo-300'}`}
              style={category === c.slug ? { backgroundColor: c.color } : {}}
            >
              {c.name}
              {c._count && <span className="ml-2 opacity-70">({c._count.products})</span>}
            </button>
          ))}
        </div>

        {/* Results count */}
        <p className="text-sm text-slate-500 mb-6">
          {loading ? 'Loading…' : `${products.length} products`}
          {search && ` matching "${search}"`}
        </p>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[...Array(12)].map((_, i) => <div key={i} className="gallery-card h-72 bg-slate-200 animate-pulse" />)}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">No products found</h2>
            <p className="text-slate-500">Try a different search or category</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((p: any) => {
              const imgs = parseImages(p.images)
              return (
                <div key={p.id} className="gallery-card" onClick={() => { setSelected(p); setOrdered(false) }}>
                  <div className="relative">
                    {imgs[0] ? (
                      <img src={imgs[0]} alt={p.name} className="gallery-img" />
                    ) : (
                      <div className="gallery-img bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                        <span className="text-6xl">🧵</span>
                      </div>
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="badge text-white text-[10px]" style={{ backgroundColor: p.category?.color }}>
                        {p.category?.name}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-slate-900 text-sm mb-1 truncate">{p.name}</h3>
                    <p className="text-xs text-slate-500 mb-2 truncate">{p.design}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full border border-slate-200" style={{ background: p.colorHex }} />
                        <span className="text-xs text-slate-500">{p.color}</span>
                      </div>
                      <button className="text-xs text-indigo-600 font-medium hover:underline">Request →</button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Product Modal */}
      {selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) { setSelected(null); setOrdered(false) } }}>
          <div className="modal max-w-2xl max-h-[90vh] overflow-y-auto">
            {ordered ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">✅</div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Order Request Sent!</h2>
                <p className="text-slate-500 mb-2">Thank you! We'll contact you shortly regarding <strong>{selected.name}</strong>.</p>
                <p className="text-slate-400 text-sm mb-8">Check your email for confirmation.</p>
                <div className="flex gap-3 justify-center">
                  <button onClick={() => { setSelected(null); setOrdered(false) }} className="btn-secondary">Browse More</button>
                </div>
              </div>
            ) : (
              <>
                {/* Product images */}
                {(() => {
                  const imgs = parseImages(selected.images)
                  return imgs.length > 0 ? (
                    <img src={imgs[0]} alt={selected.name} className="w-full h-64 object-cover rounded-xl mb-5" />
                  ) : (
                    <div className="w-full h-40 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-xl mb-5 flex items-center justify-center">
                      <span className="text-6xl">🧵</span>
                    </div>
                  )
                })()}

                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{selected.name}</h2>
                    <p className="text-slate-500 text-sm">{selected.design}</p>
                  </div>
                  <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
                </div>

                <div className="flex flex-wrap gap-3 mb-5">
                  <span className="badge badge-indigo">{selected.category?.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: selected.colorHex }} />
                    <span className="text-sm text-slate-600">{selected.color}</span>
                  </div>
                  <code className="badge badge-gray font-mono">{selected.sku}</code>
                  <span className="badge badge-gray">Unit: {selected.unit}</span>
                </div>

                {selected.description && (
                  <p className="text-slate-600 text-sm mb-5 leading-relaxed">{selected.description}</p>
                )}

                <div className="border-t border-slate-100 pt-5">
                  <h3 className="font-semibold text-slate-900 mb-4">📋 Order Request</h3>
                  <form onSubmit={submitOrder} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="form-group col-span-2 sm:col-span-1">
                        <label className="label">Your Name *</label>
                        <input required className="input" value={orderForm.customerName} onChange={e => setOrderForm({ ...orderForm, customerName: e.target.value })} placeholder="Full name" />
                      </div>
                      <div className="form-group col-span-2 sm:col-span-1">
                        <label className="label">Email *</label>
                        <input required type="email" className="input" value={orderForm.customerEmail} onChange={e => setOrderForm({ ...orderForm, customerEmail: e.target.value })} placeholder="email@example.com" />
                      </div>
                      <div className="form-group">
                        <label className="label">Phone</label>
                        <input type="tel" className="input" value={orderForm.customerPhone} onChange={e => setOrderForm({ ...orderForm, customerPhone: e.target.value })} placeholder="+1 234 567 8900" />
                      </div>
                      <div className="form-group">
                        <label className="label">Quantity ({selected.unit})</label>
                        <input type="number" min="1" className="input" value={orderForm.quantity} onChange={e => setOrderForm({ ...orderForm, quantity: e.target.value })} />
                      </div>
                    </div>
                    <div className="form-group">
                      <label className="label">Color Preference</label>
                      <input className="input" value={orderForm.colorPreference} onChange={e => setOrderForm({ ...orderForm, colorPreference: e.target.value })} placeholder="e.g. Navy Blue, Ivory, any variation..." />
                    </div>
                    <div className="form-group">
                      <label className="label">Special Requirements</label>
                      <textarea className="input" rows={2} value={orderForm.note} onChange={e => setOrderForm({ ...orderForm, note: e.target.value })} placeholder="Any special notes or requirements..." />
                    </div>
                    <button type="submit" disabled={submitting} className="btn-primary w-full justify-center">
                      {submitting ? 'Submitting…' : '✉️ Send Order Request'}
                    </button>
                  </form>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
