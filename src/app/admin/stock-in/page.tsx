'use client'
import { useEffect, useState, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function StockInPage() {
  const emptyItem = { productId: '', quantity: '', costPrice: '' }
  const emptyForm = { locationId: '', batchNumber: '', supplierId: '', note: '' }
  const [entries, setEntries] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)
  const [items, setItems] = useState<any[]>([emptyItem, emptyItem, emptyItem])
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

    const cleanedItems = items
      .filter((item) => item.productId.trim() && item.quantity.trim())
      .map((item) => ({
        productId: item.productId,
        quantity: Number(item.quantity),
        costPrice: item.costPrice ? Number(item.costPrice) : undefined,
      }))

    const filledCount = items.filter(item => item.productId.trim() && item.quantity.trim()).length

    if (filledCount < 3) {
      setSaving(false)
      showToast(`You must fill at least 3 item rows. Currently filled: ${filledCount}/3`)
      return
    }

    const uniqueProducts = new Set(cleanedItems.map(item => item.productId))
    if (uniqueProducts.size < 3) {
      setSaving(false)
      showToast(`Batch requires at least 3 distinct products. You have ${uniqueProducts.size} unique product(s).`)
      return
    }

    const res = await fetch('/api/stock-in', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        items: cleanedItems,
      }),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setForm(emptyForm)
      setItems([emptyItem, emptyItem, emptyItem])
      load()
      showToast('Batch stock receipt recorded successfully!')
    } else {
      const err = await res.json()
      showToast('Error: ' + (err.error || 'Unknown error'))
    }
  }

  function updateItem(index: number, patch: Record<string, string>) {
    setItems((currentItems) => currentItems.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item)))
  }

  function addItem() {
    setItems((currentItems) => [...currentItems, { ...emptyItem }])
  }

  function removeItem(index: number) {
    setItems((currentItems) => currentItems.filter((_, currentIndex) => currentIndex !== index))
  }

  const filledItemsCount = useMemo(
    () => items.filter(item => item.productId.trim() && item.quantity.trim()).length,
    [items]
  )

  const selectedProductIds = useMemo(
    () => items.filter(item => item.productId.trim()).map(item => item.productId),
    [items]
  )

  const duplicateProductIds = useMemo(() => {
    const counts = new Map<string, number>()
    selectedProductIds.forEach((id: string) => counts.set(id, (counts.get(id) || 0) + 1))
    return Array.from(counts.entries()).filter(([, count]) => count > 1).map(([id]) => id)
  }, [selectedProductIds])

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
                <td>{e.costPrice ? formatCurrency(e.costPrice) : '—'}</td>
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
          <div className="modal max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Record Stock In</h2>
                <p className="text-sm text-slate-500">Batch receipt mode: enter a destination first, then add 3 or more product lines.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-group">
                <label htmlFor="stockin-location" className="label">Destination Location *</label>
                <select id="stockin-location" required className="input" value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })}>
                  <option value="">Select location</option>
                  {warehouses.length > 0 && <optgroup label="Warehouses">{warehouses.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>}
                  {shops.length > 0 && <optgroup label="Shops">{shops.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</optgroup>}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Batch Number</label>
                <input className="input font-mono" value={form.batchNumber || ''} onChange={e => setForm({ ...form, batchNumber: e.target.value })} placeholder="e.g. BATCH-2024-001" />
              </div>
              <div className="form-group">
                <label htmlFor="stockin-supplier" className="label">Supplier</label>
                <select id="stockin-supplier" className="input" value={form.supplierId || ''} onChange={e => setForm({ ...form, supplierId: e.target.value })}>
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

              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800">Stock Lines</h3>
                    <p className="text-xs text-slate-500">
                      Batch requires 3+ distinct products. Currently filled: <strong>{filledItemsCount}/{items.length}</strong>
                    </p>
                  </div>
                  <button type="button" onClick={addItem} className="btn-secondary btn-sm">+ Add Item</button>
                </div>

                <div className="space-y-3">
                  {items.map((item, index) => {
                    const isDuplicate = item.productId && duplicateProductIds.includes(item.productId)
                    return (
                    <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_140px_140px_auto]">
                      <div className="form-group mb-0">
                        <label className="label">Product {index + 1}</label>
                        <select className={`input ${isDuplicate ? 'border-amber-400 bg-amber-50' : ''}`} required value={item.productId} onChange={(e) => updateItem(index, { productId: e.target.value })}>
                          <option value="">Select product</option>
                          {products.map((p: any) => <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>)}
                        </select>
                        {isDuplicate && (
                          <p className="mt-1 text-xs font-medium text-amber-600">
                            ⚠️ Duplicate product – batch needs distinct products
                          </p>
                        )}
                      </div>

                      <div className="form-group mb-0">
                        <label className="label">Quantity</label>
                        <input type="number" required min="0.01" step="0.01" className="input" value={item.quantity} onChange={(e) => updateItem(index, { quantity: e.target.value })} placeholder="0" />
                      </div>

                      <div className="form-group mb-0">
                        <label className="label">Cost Price</label>
                        <input type="number" step="0.01" className="input" value={item.costPrice || ''} onChange={(e) => updateItem(index, { costPrice: e.target.value })} placeholder="0.00" />
                      </div>

                      <div className="flex items-end">
                        <button type="button" onClick={() => removeItem(index)} className="btn-secondary btn-sm w-full md:w-auto">Remove</button>
                      </div>
                    </div>
                  )})}
                </div>

                {filledItemsCount < 3 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                    ⚠️ Need at least 3 filled rows to submit. Add {3 - filledItemsCount} more.
                  </div>
                )}

                {duplicateProductIds.length > 0 && (
                  <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-800">
                    ⚠️ Duplicate products detected. Each batch line should be a different product.
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving || !form.locationId} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : '⬇️ Record Batch Stock In'}
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
