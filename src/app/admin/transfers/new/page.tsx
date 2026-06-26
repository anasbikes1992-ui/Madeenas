'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ArrowRight, Plus, Trash2, Package, AlertCircle } from 'lucide-react'

interface Location {
  id: string
  name: string
  type: string
}

interface Variant {
  id: string
  sku: string
  colorName: string
  stockUnitLabel?: string
  productName: string
  stock?: { quantity: number; locationId: string }[]
}

interface TransferItem {
  variantId: string
  quantityRequested: string
}

const emptyItem = (): TransferItem => ({ variantId: '', quantityRequested: '' })

export default function NewTransferPage() {
  const router = useRouter()

  const [locations, setLocations] = useState<Location[]>([])
  const [variants, setVariants] = useState<Variant[]>([])
  const [loadingData, setLoadingData] = useState(true)

  const [fromLocationId, setFromLocationId] = useState('')
  const [toLocationId, setToLocationId] = useState('')
  const [note, setNote] = useState('')
  const [items, setItems] = useState<TransferItem[]>([emptyItem()])

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  useEffect(() => {
    Promise.all([
      fetch('/api/locations').then(r => r.json()),
      fetch('/api/products?limit=500').then(r => r.json()),
    ]).then(([locs, prodData]) => {
      setLocations(Array.isArray(locs) ? locs : [])
      const all: Variant[] = []
      ;(prodData.products || []).forEach((p: any) => {
        ;(p.variants || []).forEach((v: any) => {
          all.push({
            ...v,
            productName: p.name,
          })
        })
      })
      setVariants(all)
    }).catch(() => {
      showToast('Failed to load locations or products.', 'error')
    }).finally(() => {
      setLoadingData(false)
    })
  }, [])

  // Get available stock for a variant at the fromLocation
  function getAvailableStock(variantId: string): number | null {
    if (!variantId || !fromLocationId) return null
    const variant = variants.find(v => v.id === variantId)
    if (!variant?.stock) return null
    const s = variant.stock.find((s: any) => s.locationId === fromLocationId)
    return s ? s.quantity : 0
  }

  function updateItem(index: number, patch: Partial<TransferItem>) {
    setItems(current =>
      current.map((item, i) => (i === index ? { ...item, ...patch } : item))
    )
  }

  function addRow() {
    setItems(current => [...current, emptyItem()])
  }

  function removeRow(index: number) {
    setItems(current => current.filter((_, i) => i !== index))
  }

  // Variants used in other rows (to help flag duplicates)
  const usedVariantIds = useMemo(() => {
    const counts: Record<string, number> = {}
    items.forEach(item => {
      if (item.variantId) counts[item.variantId] = (counts[item.variantId] || 0) + 1
    })
    return counts
  }, [items])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    // Validate master fields
    if (!fromLocationId) { showToast('Please select a From Location.', 'error'); return }
    if (!toLocationId) { showToast('Please select a To Location.', 'error'); return }
    if (fromLocationId === toLocationId) { showToast('From and To locations cannot be the same.', 'error'); return }

    // Validate items
    const validItems = items.filter(item => item.variantId && item.quantityRequested)
    if (validItems.length === 0) { showToast('Add at least one item to transfer.', 'error'); return }

    // Check duplicates
    const seen = new Set<string>()
    for (const item of validItems) {
      if (seen.has(item.variantId)) {
        showToast('Duplicate variants detected. Each row must have a unique variant.', 'error')
        return
      }
      seen.add(item.variantId)
    }

    // Check qty
    for (const item of validItems) {
      if (Number(item.quantityRequested) <= 0) {
        showToast('All quantities must be greater than 0.', 'error')
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromLocationId,
          toLocationId,
          note: note.trim() || undefined,
          items: validItems.map(item => ({
            variantId: item.variantId,
            quantityRequested: Number(item.quantityRequested),
          })),
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed to create transfer')
      }

      showToast('Transfer request created successfully!', 'success')
      setTimeout(() => router.push('/admin/transfers'), 1200)
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSaving(false)
    }
  }

  const toastStyles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  }

  return (
    <div className="space-y-6 fade-in max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push('/admin/transfers')}
          className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Back"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Stock Transfer</h1>
          <p className="text-sm text-slate-500">Move stock between locations</p>
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-4 border rounded-xl text-sm font-medium flex items-start gap-2.5 ${toastStyles[toast.type]}`}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {toast.msg}
        </div>
      )}

      {loadingData ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
          <div className="inline-flex flex-col items-center gap-3 text-slate-400">
            <Package className="h-10 w-10 animate-pulse opacity-40" />
            <p className="text-sm animate-pulse">Loading locations and products...</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Master Section */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
              <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Transfer Details</h2>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* From Location */}
              <div>
                <label className="label">From Location *</label>
                <select
                  required
                  value={fromLocationId}
                  onChange={e => setFromLocationId(e.target.value)}
                  className="input"
                >
                  <option value="">Select source location...</option>
                  {locations.map(l => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>

              {/* To Location */}
              <div>
                <label className="label">To Location *</label>
                <select
                  required
                  value={toLocationId}
                  onChange={e => setToLocationId(e.target.value)}
                  className="input"
                >
                  <option value="">Select destination location...</option>
                  {locations
                    .filter(l => l.id !== fromLocationId)
                    .map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
              </div>

              {/* Route Preview */}
              {fromLocationId && toLocationId && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-3 px-4 py-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                    <span className="text-sm font-semibold text-indigo-800">
                      {locations.find(l => l.id === fromLocationId)?.name}
                    </span>
                    <ArrowRight className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-indigo-800">
                      {locations.find(l => l.id === toLocationId)?.name}
                    </span>
                  </div>
                </div>
              )}

              {/* Note */}
              <div className="md:col-span-2">
                <label className="label">Note (Optional)</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="input min-h-[80px] resize-none"
                  placeholder="Reason for transfer, special instructions..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          {/* Detail Section — Items */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <h2 className="font-semibold text-slate-800 text-sm uppercase tracking-wide">Transfer Items</h2>
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Row
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th className="px-4 py-3 font-medium w-1/2">Product Variant *</th>
                    <th className="px-4 py-3 font-medium">Qty to Transfer *</th>
                    <th className="px-4 py-3 font-medium">Available Stock</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {items.map((item, i) => {
                    const availableStock = getAvailableStock(item.variantId)
                    const variant = variants.find(v => v.id === item.variantId)
                    const isDuplicate = (usedVariantIds[item.variantId] || 0) > 1 && !!item.variantId
                    const isOverStock =
                      availableStock !== null &&
                      item.quantityRequested !== '' &&
                      Number(item.quantityRequested) > availableStock

                    return (
                      <tr key={i} className={`group hover:bg-slate-50/50 ${isDuplicate ? 'bg-red-50/30' : ''}`}>
                        {/* Variant Select */}
                        <td className="px-4 py-2.5">
                          <select
                            value={item.variantId}
                            onChange={e => updateItem(i, { variantId: e.target.value })}
                            className={`input text-sm py-1.5 ${isDuplicate ? 'border-red-400 ring-1 ring-red-300' : ''}`}
                          >
                            <option value="">Select variant...</option>
                            {variants.map(v => (
                              <option key={v.id} value={v.id}>
                                {v.productName} — {v.colorName} ({v.sku})
                              </option>
                            ))}
                          </select>
                          {isDuplicate && (
                            <p className="text-xs text-red-500 mt-1">Duplicate variant selected</p>
                          )}
                        </td>

                        {/* Quantity Input */}
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="1"
                              step="1"
                              value={item.quantityRequested}
                              onChange={e => updateItem(i, { quantityRequested: e.target.value })}
                              className={`input text-sm py-1.5 w-28 ${isOverStock ? 'border-orange-400 ring-1 ring-orange-300' : ''}`}
                              placeholder="Qty"
                            />
                            {variant?.stockUnitLabel && (
                              <span className="text-xs text-slate-400">{variant.stockUnitLabel}</span>
                            )}
                          </div>
                          {isOverStock && (
                            <p className="text-xs text-orange-500 mt-1">Exceeds available stock</p>
                          )}
                        </td>

                        {/* Available Stock */}
                        <td className="px-4 py-2.5">
                          {!item.variantId ? (
                            <span className="text-slate-300 text-xs">—</span>
                          ) : !fromLocationId ? (
                            <span className="text-slate-400 text-xs italic">Select from location</span>
                          ) : availableStock === null ? (
                            <span className="text-slate-400 text-xs italic">No data</span>
                          ) : (
                            <span className={`text-sm font-semibold ${availableStock === 0 ? 'text-red-500' : availableStock < 10 ? 'text-orange-600' : 'text-green-600'}`}>
                              {availableStock} {variant?.stockUnitLabel || ''}
                            </span>
                          )}
                        </td>

                        {/* Remove */}
                        <td className="px-4 py-2.5 text-center">
                          {items.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeRow(i)}
                              className="p-1 text-slate-300 hover:text-red-500 transition-colors rounded"
                              title="Remove row"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Row Footer */}
            <div className="px-4 py-3 border-t border-slate-50">
              <button
                type="button"
                onClick={addRow}
                className="text-sm text-slate-400 hover:text-indigo-600 flex items-center gap-1.5 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another item
              </button>
            </div>
          </div>

          {/* Submit / Cancel */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.push('/admin/transfers')}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary min-w-[180px] flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <ArrowRight className="h-4 w-4" />
                  Create Transfer Request
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
