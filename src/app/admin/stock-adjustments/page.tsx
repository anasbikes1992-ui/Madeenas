'use client'

import { useEffect, useMemo, useState } from 'react'

type ProductOption = {
  id: string
  name: string
  sku: string
  unit: string
}

type LocationOption = {
  id: string
  name: string
  type: string
}

type AdjustmentRow = {
  id: string
  previousQuantity: number
  countedQuantity: number
  delta: number
  reason: string | null
  note: string | null
  createdAt: string
  adjustedByUser: { name: string }
  product: { name: string; sku: string; unit: string }
  location: { name: string; type: string }
}

export default function StockAdjustmentsPage() {
  const [products, setProducts] = useState<ProductOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [rows, setRows] = useState<AdjustmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const [form, setForm] = useState({
    productId: '',
    locationId: '',
    countedQuantity: '',
    reason: '',
    note: '',
  })

  const selectedProduct = useMemo(
    () => products.find((product) => product.id === form.productId) ?? null,
    [products, form.productId]
  )

  async function loadData() {
    setLoading(true)
    const [productsRes, locationsRes, adjustmentsRes] = await Promise.all([
      fetch('/api/products?limit=300'),
      fetch('/api/locations'),
      fetch('/api/stock-adjustments?limit=100'),
    ])

    const productsData = await productsRes.json()
    const locationsData = await locationsRes.json()
    const adjustmentsData = await adjustmentsRes.json()

    setProducts(productsData.products || [])
    setLocations(locationsData || [])
    setRows(adjustmentsData.adjustments || [])
    setLoading(false)
  }

  useEffect(() => {
    void loadData()
  }, [])

  async function submitAdjustment(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setMessage(null)

    const response = await fetch('/api/stock-adjustments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId: form.productId,
        locationId: form.locationId,
        countedQuantity: Number(form.countedQuantity),
        reason: form.reason || undefined,
        note: form.note || undefined,
      }),
    })

    const payload = await response.json().catch(() => ({}))
    if (!response.ok) {
      setMessage(payload.error || 'Failed to save adjustment')
      setSaving(false)
      return
    }

    setMessage('Stock adjustment saved successfully.')
    setForm({ productId: '', locationId: '', countedQuantity: '', reason: '', note: '' })
    await loadData()
    setSaving(false)
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Stock Balancing & Adjustments</h1>
        <p className="text-sm text-slate-500 mt-1">Record physical count corrections and keep a clean audit trail.</p>
      </div>

      <form onSubmit={submitAdjustment} className="card space-y-4">
        <h2 className="font-semibold text-slate-900">New Adjustment</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Product *</label>
            <select
              className="input"
              value={form.productId}
              required
              onChange={(event) => setForm((current) => ({ ...current, productId: event.target.value }))}
            >
              <option value="">Select product</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Location *</label>
            <select
              className="input"
              value={form.locationId}
              required
              onChange={(event) => setForm((current) => ({ ...current, locationId: event.target.value }))}
            >
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>[{location.type}] {location.name}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="label">Counted Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={form.countedQuantity}
              required
              onChange={(event) => setForm((current) => ({ ...current, countedQuantity: event.target.value }))}
              placeholder="0"
            />
            {selectedProduct ? (
              <p className="text-xs text-slate-400 mt-1">Unit: {selectedProduct.unit}</p>
            ) : null}
          </div>

          <div className="form-group">
            <label className="label">Reason</label>
            <input
              className="input"
              value={form.reason}
              onChange={(event) => setForm((current) => ({ ...current, reason: event.target.value }))}
              placeholder="Cycle count, shrinkage, recount..."
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Note</label>
          <textarea
            className="input"
            rows={2}
            value={form.note}
            onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
            placeholder="Optional internal note"
          />
        </div>

        {message ? (
          <div className="text-sm rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-700">{message}</div>
        ) : null}

        <button type="submit" disabled={saving} className="btn-primary">
          {saving ? 'Saving...' : 'Save Adjustment'}
        </button>
      </form>

      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">Recent Adjustments</h2>
        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, index) => (
              <div key={index} className="h-10 rounded bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No adjustments recorded yet.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Location</th>
                  <th>Prev</th>
                  <th>Counted</th>
                  <th>Delta</th>
                  <th>Reason</th>
                  <th>By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="text-sm font-medium text-slate-900">{row.product.name}</div>
                      <div className="text-xs text-slate-400">{row.product.sku}</div>
                    </td>
                    <td className="text-sm text-slate-700">{row.location.name}</td>
                    <td className="text-sm">{row.previousQuantity}</td>
                    <td className="text-sm">{row.countedQuantity}</td>
                    <td className={row.delta >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                      {row.delta > 0 ? '+' : ''}{row.delta}
                    </td>
                    <td className="text-sm text-slate-600">{row.reason || row.note || '-'}</td>
                    <td className="text-sm text-slate-700">{row.adjustedByUser.name}</td>
                    <td className="text-sm text-slate-500">{new Date(row.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
