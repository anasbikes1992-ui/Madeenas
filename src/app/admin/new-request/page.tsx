'use client'
import { useEffect, useState } from 'react'
import { generateSKU } from '@/lib/utils'

export default function NewRequestPage() {
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [form, setForm] = useState<any>({
    productId: '', fromLocationId: '', toLocationId: '',
    quantityRequested: '', referenceInvoice: '', invoiceDate: '', note: ''
  })
  const [selectedProduct, setSelectedProduct] = useState<any>(null)
  const [stockLevel, setStockLevel] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/products?limit=200').then(r => r.json()).then(d => setProducts(d.products || []))
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d))
  }, [])

  function onProductChange(productId: string) {
    const p = products.find((x: any) => x.id === productId)
    setSelectedProduct(p)
    setForm((f: any) => ({ ...f, productId, fromLocationId: '' }))
    setStockLevel(null)
  }

  function onLocationChange(locationId: string) {
    setForm((f: any) => ({ ...f, fromLocationId: locationId }))
    if (selectedProduct) {
      const stock = selectedProduct.stocks?.find((s: any) => s.locationId === locationId)
      setStockLevel(stock?.quantity ?? 0)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)
    const res = await fetch('/api/stock-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setSuccess(true)
    } else {
      const data = await res.json()
      setError(data.error || 'Failed to submit request')
    }
  }

  if (success) {
    return (
      <div className="max-w-lg mx-auto text-center py-20">
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Request Submitted!</h2>
        <p className="text-slate-500 mb-8">Your stock-out request has been submitted and is awaiting approval.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={() => setSuccess(false)} className="btn-secondary">New Request</button>
          <a href="/admin/my-requests" className="btn-primary">View My Requests</a>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">New Stock Request</h1>
        <p className="text-slate-500 text-sm mt-0.5">Request goods from a warehouse or shop location</p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Product */}
        <div className="form-group">
          <label className="label">Product *</label>
          <select required id="product-select" aria-label="Select product" className="input" value={form.productId} onChange={e => onProductChange(e.target.value)}>
            <option value="">Select a product</option>
            {products.map((p: any) => (
              <option key={p.id} value={p.id}>{p.name} — {p.sku}</option>
            ))}
          </select>
          {selectedProduct && (
            <div className="mt-2 p-3 bg-indigo-50 rounded-xl flex items-center gap-3 text-sm">
              <div>
                <span className="font-medium text-indigo-900">{selectedProduct.name}</span>
                <span className="text-indigo-600 ml-2">({selectedProduct.category?.name})</span>
              </div>
            </div>
          )}
        </div>

        {/* From Location */}
        <div className="form-group">
          <label className="label">From Location (Source) *</label>
          <select required id="from-location" aria-label="Source location" className="input" value={form.fromLocationId} onChange={e => onLocationChange(e.target.value)}>
            <option value="">Select source location</option>
            {locations.map((l: any) => (
              <option key={l.id} value={l.id}>[{l.type}] {l.name}</option>
            ))}
          </select>
          {stockLevel !== null && (
            <div className={`mt-2 text-sm font-medium px-3 py-2 rounded-lg ${stockLevel <= 0 ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50'}`}>
              Available at this location: <strong>{stockLevel} {selectedProduct?.unit}</strong>
            </div>
          )}
        </div>

        {/* To Location */}
        <div className="form-group">
          <label className="label">Destination (optional)</label>
          <select id="to-location" aria-label="Destination location (optional)" className="input" value={form.toLocationId} onChange={e => setForm({ ...form, toLocationId: e.target.value })}>
            <option value="">Select destination (optional)</option>
            {locations.filter(l => l.id !== form.fromLocationId).map((l: any) => (
              <option key={l.id} value={l.id}>[{l.type}] {l.name}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Quantity */}
          <div className="form-group">
            <label className="label">Quantity Requested *</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              required
              className="input"
              value={form.quantityRequested}
              onChange={e => setForm({ ...form, quantityRequested: e.target.value })}
              placeholder="0"
            />
            {stockLevel !== null && form.quantityRequested && parseFloat(form.quantityRequested) > stockLevel && (
              <p className="text-red-600 text-xs mt-1">⚠️ Exceeds available stock ({stockLevel})</p>
            )}
          </div>

          {/* Invoice Date */}
          <div className="form-group">
            <label className="label">Invoice Date</label>
            <input
              type="date"
              className="input"
              value={form.invoiceDate}
              onChange={e => setForm({ ...form, invoiceDate: e.target.value })}
            />
          </div>
        </div>

        {/* Invoice Reference */}
        <div className="form-group">
          <label className="label">Invoice Number / Reference *</label>
          <input
            required
            id="invoice-ref"
            aria-label="Invoice number or reference"
            className="input font-mono"
            value={form.referenceInvoice}
            onChange={e => setForm({ ...form, referenceInvoice: e.target.value })}
            placeholder="e.g. INV-2024-00123"
          />
          <p className="text-xs text-slate-400 mt-1">Enter the invoice number from your external invoicing system</p>
        </div>

        {/* Note */}
        <div className="form-group">
          <label className="label">Notes / Remarks</label>
          <textarea
            className="input"
            rows={3}
            value={form.note}
            onChange={e => setForm({ ...form, note: e.target.value })}
            placeholder="Additional notes for this request..."
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
            ❌ {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
            {saving ? 'Submitting…' : '📤 Submit Request'}
          </button>
          <a href="/admin/stock-out" className="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  )
}
