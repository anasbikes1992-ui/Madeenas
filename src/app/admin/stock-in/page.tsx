'use client'
import { useEffect, useState, useMemo } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'

export default function StockInPage() {
  const emptyItem = { 
    variantId: '', 
    receivedQty: '', 
    receivedUnit: '', 
    conversionFactor: '1', 
    costPrice: '' 
  }
  const emptyForm = { locationId: '', batchNumber: '', supplierId: '', note: '' }
  const [entries, setEntries] = useState<any[]>([])
  const [variants, setVariants] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [suppliers, setSuppliers] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>(emptyForm)
  const [items, setItems] = useState<any[]>([emptyItem, emptyItem, emptyItem])
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 5000) }

  async function load() {
    setLoading(true)
    const res = await fetch('/api/stock-in')
    const data = await res.json()
    setEntries(data.entries || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
    // Fetch products and flatten to variants
    fetch('/api/products?limit=500')
      .then(r => r.json())
      .then(d => {
        const allVariants: any[] = []
        ;(d.products || []).forEach((p: any) => {
          (p.variants || []).forEach((v: any) => {
            allVariants.push({
              ...v,
              productName: p.name,
              categoryName: p.category?.name
            })
          })
        })
        setVariants(allVariants)
      })
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d))
    fetch('/api/settings/units').then(r => r.json()).then(d => setUnits(d || [])).catch(() => {})
    fetch('/api/suppliers')
      .then(r => r.json())
      .then(d => setSuppliers(d || []))
      .catch(() => showToast('Warning: Could not load suppliers'))
  }, [])

  function handleVariantChange(index: number, variantId: string) {
    const v = variants.find(x => x.id === variantId)
    if (v) {
      updateItem(index, { 
        variantId, 
        receivedUnit: v.altUnitLabel || v.stockUnitLabel || v.stockUnit,
        conversionFactor: v.altUnit ? '' : '1', // prompt them if using alt unit
        costPrice: v.costPrice ? String(v.costPrice) : ''
      })
    } else {
      updateItem(index, { variantId: '' })
    }
  }

  function handleUnitChange(index: number, unitName: string) {
    const item = items[index]
    const variant = variants.find(x => x.id === item.variantId)
    if (!variant || !unitName) {
      updateItem(index, { receivedUnit: unitName, conversionFactor: '1' })
      return
    }
    
    // Find unit object
    const selectedUnit = units.find(u => u.name === unitName || u.abbreviation === unitName)
    if (!selectedUnit) {
      updateItem(index, { receivedUnit: unitName })
      return
    }

    // Attempt to find a conversion from selectedUnit -> variant.stockUnit
    const conversion = selectedUnit.conversionsFrom?.find((c: any) => 
      c.toUnit?.name?.toLowerCase() === variant.stockUnit?.toLowerCase() || 
      c.toUnit?.abbreviation?.toLowerCase() === variant.stockUnit?.toLowerCase()
    )

    if (conversion) {
      updateItem(index, { receivedUnit: unitName, conversionFactor: String(conversion.factor) })
    } else {
      updateItem(index, { receivedUnit: unitName, conversionFactor: '' }) // blank so they enter it
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)

    const cleanedItems = items
      .filter((item) => item.variantId.trim() && item.receivedQty.trim())
      .map((item) => {
        const qty = Number(item.receivedQty)
        const factor = Number(item.conversionFactor)
        return {
          variantId: item.variantId,
          receivedQty: qty,
          receivedUnit: item.receivedUnit || 'units',
          conversionFactor: factor,
          quantityAddedToStock: qty * factor,
          costPrice: item.costPrice ? Number(item.costPrice) : undefined,
        }
      })

    const filledCount = items.filter(item => item.variantId.trim() && item.receivedQty.trim()).length

    if (filledCount === 0) {
      setSaving(false)
      showToast('You must fill at least 1 item row.')
      return
    }

    const uniqueVariants = new Set(cleanedItems.map(item => item.variantId))
    if (uniqueVariants.size !== cleanedItems.length) {
      setSaving(false)
      showToast('Duplicate variants detected. Each line must be a different variant.')
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

  const warehouses = locations.filter(l => l.type === 'WAREHOUSE')

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
              <th>Product / Variant</th>
              <th>Location</th>
              <th>Received</th>
              <th>Stock Added</th>
              <th>Batch #</th>
              <th>Cost Price</th>
              <th>Supplier</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(8)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : entries.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No stock entries yet. <button onClick={() => setShowForm(true)} className="text-indigo-600 underline">Record first entry</button></td></tr>
            ) : entries.map((e: any) => (
              <tr key={e.id}>
                <td>
                  <div className="font-medium text-slate-900">{e.variant?.product?.name || 'Unknown Product'}</div>
                  <div className="text-xs text-slate-500">{e.variant?.sku} | {e.variant?.colorName}</div>
                </td>
                <td>{e.location?.name}</td>
                <td><span className="font-medium">{e.receivedQty}</span> <span className="text-xs text-slate-500">{e.receivedUnit}</span></td>
                <td><span className="text-green-600 font-bold">+{e.quantityAddedToStock}</span> <span className="text-xs text-slate-500">{e.variant?.stockUnitLabel}</span></td>
                <td>{e.batchNumber || '-'}</td>
                <td>{e.costPrice ? formatCurrency(e.costPrice) : '-'}</td>
                <td>{e.supplier?.name || '-'}</td>
                <td>{formatDate(e.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-5xl my-auto animate-in fade-in zoom-in duration-200">
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <h2 className="text-xl font-bold text-slate-900">Record Stock Receipt</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            
            <form onSubmit={handleSave} className="p-6">
              {toast && <div className="mb-6 p-4 bg-indigo-50 text-indigo-700 rounded-xl text-sm font-medium border border-indigo-100">{toast}</div>}
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div>
                  <label className="label">Receiving Location *</label>
                  <select required value={form.locationId} onChange={(e) => setForm({ ...form, locationId: e.target.value })} className="input">
                    <option value="">Select Warehouse...</option>
                    {warehouses.map((l: any) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Supplier (Optional)</label>
                  <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })} className="input">
                    <option value="">Select Supplier...</option>
                    {suppliers.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Batch / Invoice #</label>
                  <input type="text" value={form.batchNumber} onChange={(e) => setForm({ ...form, batchNumber: e.target.value })} className="input" placeholder="e.g. INV-2024-001" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-slate-800">Received Items</h3>
                  <button type="button" onClick={addItem} className="text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg">+ Add Row</button>
                </div>
                
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                      <tr>
                        <th className="p-3 font-medium w-1/3">Product Variant *</th>
                        <th className="p-3 font-medium">Received Qty *</th>
                        <th className="p-3 font-medium">Unit Name *</th>
                        <th className="p-3 font-medium">Conv. Factor *</th>
                        <th className="p-3 font-medium">Total Stock</th>
                        <th className="p-3 font-medium">Unit Cost</th>
                        <th className="p-3 font-medium w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, i) => {
                        const variant = variants.find(v => v.id === item.variantId)
                        const stockAdded = (Number(item.receivedQty) || 0) * (Number(item.conversionFactor) || 0)
                        
                        return (
                          <tr key={i} className="group hover:bg-slate-50/50">
                            <td className="p-2">
                              <select 
                                value={item.variantId} 
                                onChange={(e) => handleVariantChange(i, e.target.value)}
                                className="input text-sm py-1.5"
                                required={i === 0 || !!item.receivedQty}
                              >
                                <option value="">Select Variant...</option>
                                {variants.map((v: any) => (
                                  <option key={v.id} value={v.id}>{v.productName} - {v.colorName} ({v.sku})</option>
                                ))}
                              </select>
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                min="0.01" 
                                step="0.01" 
                                value={item.receivedQty} 
                                onChange={(e) => updateItem(i, { receivedQty: e.target.value })} 
                                className="input text-sm py-1.5" 
                                placeholder="Qty"
                                required={!!item.variantId}
                              />
                            </td>
                            <td className="p-2">
                              <input 
                                type="text" 
                                list={`units-list-${i}`}
                                value={item.receivedUnit} 
                                onChange={(e) => handleUnitChange(i, e.target.value)} 
                                className="input text-sm py-1.5" 
                                placeholder="Unit"
                                required={!!item.variantId}
                              />
                              <datalist id={`units-list-${i}`}>
                                {units.map(u => <option key={u.id} value={u.name} />)}
                              </datalist>
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                min="0.0001" 
                                step="0.0001" 
                                value={item.conversionFactor} 
                                onChange={(e) => updateItem(i, { conversionFactor: e.target.value })} 
                                className="input text-sm py-1.5" 
                                placeholder="Multiplier"
                                title={`1 ${item.receivedUnit || 'Unit'} = X ${variant?.stockUnitLabel || 'Stock Units'}`}
                                required={!!item.variantId}
                              />
                            </td>
                            <td className="p-2 text-slate-600 font-medium">
                              {stockAdded > 0 ? `+${stockAdded} ${variant?.stockUnitLabel || ''}` : '-'}
                            </td>
                            <td className="p-2">
                              <input 
                                type="number" 
                                min="0" 
                                step="0.01" 
                                value={item.costPrice} 
                                onChange={(e) => updateItem(i, { costPrice: e.target.value })} 
                                className="input text-sm py-1.5" 
                                placeholder="Optional"
                              />
                            </td>
                            <td className="p-2 text-center">
                              {items.length > 1 && (
                                <button type="button" onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-500 transition-colors p-1" title="Remove Row">
                                  ✕
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={saving} className="btn-primary min-w-[140px]">
                  {saving ? 'Saving...' : 'Save Stock Receipt'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
