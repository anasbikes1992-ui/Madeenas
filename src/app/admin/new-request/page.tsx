'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface ProductStock {
  locationId: string
  quantity: number
}

interface ProductOption {
  id: string
  name: string
  sku: string
  unit: string
  category?: { name?: string | null } | null
  stocks?: ProductStock[]
}

interface LocationOption {
  id: string
  name: string
  type: string
}

interface RequestFormState {
  productId: string
  fromLocationId: string
  toLocationId: string
  quantityRequested: string
  referenceInvoice: string
  invoiceDate: string
  note: string
}

export default function NewRequestPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [form, setForm] = useState<RequestFormState>({
    productId: '', fromLocationId: '', toLocationId: '',
    quantityRequested: '', referenceInvoice: '', invoiceDate: '', note: ''
  })
  const [selectedProduct, setSelectedProduct] = useState<ProductOption | null>(null)
  const [stockLevel, setStockLevel] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const role = session?.user?.role || ''
  const userLocationId = session?.user?.locationId || ''
  const isShopRequester = role === 'SHOP_STAFF' && Boolean(userLocationId)
  const warehouseLocations = locations.filter((location) => location.type === 'WAREHOUSE')
  const effectiveToLocationId = isShopRequester ? userLocationId : form.toLocationId
  const requestDestination = locations.find((location) => location.id === effectiveToLocationId)

  useEffect(() => {
    fetch('/api/products?limit=200').then(r => r.json()).then(d => setProducts(d.products || []))
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d))
  }, [])

  function onProductChange(productId: string) {
    const product = products.find((option) => option.id === productId) ?? null
    setSelectedProduct(product)
    setForm((currentForm) => ({ ...currentForm, productId, fromLocationId: '' }))
    setStockLevel(null)
  }

  function onLocationChange(locationId: string) {
    setForm((currentForm) => ({ ...currentForm, fromLocationId: locationId }))
    if (selectedProduct) {
      const stock = selectedProduct.stocks?.find((entry) => entry.locationId === locationId)
      setStockLevel(stock?.quantity ?? 0)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const payload = {
      ...form,
      toLocationId: effectiveToLocationId || undefined,
    }

    const res = await fetch('/api/stock-out', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
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
        <p className="text-slate-500 mb-8">Your stock transfer request has been submitted. It may dispatch immediately or await approval based on policy thresholds.</p>
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
        <h1 className="text-2xl font-bold text-slate-900">New Stock Movement Request</h1>
        <p className="text-slate-500 text-sm mt-0.5">
          {isShopRequester
            ? 'Request stock from a warehouse to your assigned shop. Warehouse staff dispatch it, then your shop acknowledges receipt.'
            : 'Create a stock movement request between warehouse and shop locations.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="card space-y-5">
        {/* Product */}
        <div className="form-group">
          <label className="label">Product *</label>
          <select required id="product-select" aria-label="Select product" className="input" value={form.productId} onChange={e => onProductChange(e.target.value)}>
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name} — {product.sku}</option>
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
          <label className="label">{isShopRequester ? 'Fulfill From Warehouse *' : 'From Location (Source) *'}</label>
          <select required id="from-location" aria-label="Source location" className="input" value={form.fromLocationId} onChange={e => onLocationChange(e.target.value)}>
            <option value="">{isShopRequester ? 'Select warehouse' : 'Select source location'}</option>
            {(isShopRequester ? warehouseLocations : locations).map((location) => (
              <option key={location.id} value={location.id}>[{location.type}] {location.name}</option>
            ))}
          </select>
          {stockLevel !== null && (
            <div className={`mt-2 text-sm font-medium px-3 py-2 rounded-lg ${stockLevel <= 0 ? 'text-red-700 bg-red-50' : 'text-emerald-700 bg-emerald-50'}`}>
              Available at this location: <strong>{stockLevel} {selectedProduct?.unit}</strong>
            </div>
          )}
        </div>

        {/* To Location */}
        {isShopRequester ? (
          <div className="form-group">
            <label className="label">Requesting Location</label>
            <div className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
              <div className="font-semibold">{requestDestination?.name || session?.user?.locationName || 'Your assigned shop'}</div>
              <div className="mt-1 text-indigo-700">This request will be delivered here and must be acknowledged by your shop account.</div>
            </div>
          </div>
        ) : (
          <div className="form-group">
            <label className="label">Destination Location *</label>
            <select required id="to-location" aria-label="Destination location" className="input" value={form.toLocationId} onChange={e => setForm({ ...form, toLocationId: e.target.value })}>
              <option value="">Select destination location</option>
              {locations.filter((location) => location.id !== form.fromLocationId).map((location) => (
                <option key={location.id} value={location.id}>[{location.type}] {location.name}</option>
              ))}
            </select>
          </div>
        )}

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
          <button
            type="submit"
            disabled={saving || !form.fromLocationId || (!isShopRequester && !form.toLocationId)}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? 'Submitting…' : '📤 Submit Request'}
          </button>
          <a href="/admin/stock-out" className="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  )
}
