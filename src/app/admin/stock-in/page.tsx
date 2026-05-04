'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

export default function StockInPage() {
  const emptyForm = { productId: '', locationId: '', quantity: '', batchNumber: '', supplierId: '', costPrice: '', note: '' }
  const [entries, setEntries] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/stock-in')
    const data = await res.json()
    setEntries(data.entries || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    fetch('/api/products?limit=200').then(r => r.json()).then(d => setProducts(d.products || []))
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d))
    fetch('/api/suppliers')
      .then(r => r.json())
      .then(d => setSuppliers(d || []))
      .catch(() => showToast('Warning: Could not load suppliers'))
  }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/stock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setForm(emptyForm)
      load()
      showToast('Stock recorded successfully!')
    } else {
      const err = await res.json()
      showToast('Error: ' + (err.error || 'Unknown error'))
    }
  }

  const warehouses = locations.filter(l => l.type === 'WAREHOUSE')
  const shops = locations.filter(l => l.type === 'SHOP')

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock In — Goods Receipt</h1>
          <p className="text-sm text-slate-500">{entries.length} entries recorded</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">⬇️ Record Stock In</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Location</th>
              <th>Quantity</th>
              <th>Batch #</th>
              <th>Cost Price</th>
              <th>Supplier</th>
              <th>Received By</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(9)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : entries.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">No stock entries yet. <button onClick={() => setShowForm(true)} className="text-indigo-600 underline">Record first entry</button></td></tr>
            ) : entries.map((e: any) => (
              <tr key={e.id}>
                <td>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{e.product.name}</p>
                    <code className="text-xs text-slate-400">{e.product.sku}</code>
                  </div>
                </td>
                <td>
                  <span className="badge badge-indigo">{e.product.category?.name}</span>
                </td>
                <td>
                  <div>
                    <p className="text-sm text-slate-900">{e.location.name}</p>
                    <span className="text-xs text-slate-400">{e.location.type}</span>
                  </div>
                </td>
                <td><span className="font-bold text-emerald-600">+{e.quantity} {e.product.unit}</span></td>
                <td>{e.batchNumber ? <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{e.batchNumber}</code> : '—'}</td>
                <td>{e.costPrice ? `Rs. ${e.costPrice.toLocaleString()}` : '—'}</td>
                <td className="text-sm text-slate-600">{e.supplier?.name || '—'}</td>
                <td className="text-sm text-slate-600">{e.user?.name}</td>
                <td className="text-sm text-slate-500">{formatDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal max-w-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Record Stock In</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-group">
                <label className="label">Product *</label>
                <select required className="input" value={form.productId} onChange={e => setForm({ ...form, productId: e.target.value })}>
                  <option value="">Select product</option>
                  {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Destination Location *</label>
                <select required className="input" value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })}>
                  <option value="">Select location</option>
                  {warehouses.length > 0 && <optgroup label="Warehouses">{warehouses.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>}
                  {shops.length > 0 && <optgroup label="Shops">{shops.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Quantity *</label>
                  <input type="number" required min="0.01" step="0.01" className="input" value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })} placeholder="0" />
                </div>
                <div className="form-group">
                  <label className="label">Cost Price / Unit</label>
                  <input type="number" step="0.01" className="input" value={form.costPrice || ''} onChange={e => setForm({ ...form, costPrice: e.target.value })} placeholder="0.00" />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Batch Number</label>
                <input className="input font-mono" value={form.batchNumber || ''} onChange={e => setForm({ ...form, batchNumber: e.target.value })} placeholder="e.g. BATCH-2024-001" />
              </div>
              <div className="form-group">
                <label className="label">Supplier</label>
                <select className="input" value={form.supplierId || ''} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
                  <option value="">No supplier</option>
                  {suppliers.map((supplier: any) => (
                    <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={form.note || ''} onChange={e => setForm({ ...form, note: e.target.value })} placeholder="Optional notes..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : '⬇️ Record Stock In'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast-success">✅ {toast}</div>}
    </div>
  )
}
