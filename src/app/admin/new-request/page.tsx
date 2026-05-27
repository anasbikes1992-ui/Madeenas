'use client'
import { useEffect, useState, useMemo } from 'react'
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

interface RequestItemState {
  productId: string
  quantityRequested: string
}

interface RequestHeaderState {
  fromLocationId: string
  toLocationId: string
  referenceInvoice: string
  invoiceDate: string
  note: string
}

export default function NewRequestPage() {
  const { data: session } = useSession()
  const [products, setProducts] = useState<ProductOption[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [header, setHeader] = useState<RequestHeaderState>({
    fromLocationId: '',
    toLocationId: '',
    referenceInvoice: '',
    invoiceDate: '',
    note: '',
  })
  const [items, setItems] = useState<RequestItemState[]>([
    { productId: '', quantityRequested: '' },
    { productId: '', quantityRequested: '' },
    { productId: '', quantityRequested: '' },
  ])
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const role = session?.user?.role || ''
  const userLocationId = session?.user?.locationId || ''
  const isShopRequester = role === 'SHOP_STAFF' && Boolean(userLocationId)
  const warehouseLocations = locations.filter((location) => location.type === 'WAREHOUSE')
  const effectiveToLocationId = isShopRequester ? userLocationId : header.toLocationId
  const requestDestination = locations.find((location) => location.id === effectiveToLocationId)

  useEffect(() => {
    fetch('/api/products?limit=200').then(r => r.json()).then(d => setProducts(d.products || []))
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d))
  }, [])

  function updateItem(index: number, patch: Partial<RequestItemState>) {
    setItems((currentItems) =>
      currentItems.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item))
    )
  }

  function addItem() {
    setItems((currentItems) => [...currentItems, { productId: '', quantityRequested: '' }])
  }

  function removeItem(index: number) {
    setItems((currentItems) => currentItems.filter((_, currentIndex) => currentIndex !== index))
  }

  const filledItemsCount = useMemo(
    () => items.filter(item => item.productId.trim() && item.quantityRequested.trim()).length,
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    const cleanedItems = items
      .filter((item) => item.productId.trim() && item.quantityRequested.trim())
      .map((item) => ({
        productId: item.productId,
        quantityRequested: Number(item.quantityRequested),
      }))

    const filledCount = items.filter(item => item.productId.trim() && item.quantityRequested.trim()).length

    if (filledCount < 3) {
      setError(`You must fill at least 3 item rows. Currently filled: ${filledCount}/3`)
      setSaving(false)
      return
    }

    const uniqueProducts = new Set(cleanedItems.map(item => item.productId))
    if (uniqueProducts.size < 3) {
      setError(`Batch requires at least 3 distinct products. You have ${uniqueProducts.size} unique product(s).`)
      setSaving(false)
      return
    }

    const payload = {
      fromLocationId: header.fromLocationId,
      toLocationId: effectiveToLocationId || undefined,
      referenceInvoice: header.referenceInvoice || undefined,
      invoiceDate: header.invoiceDate || undefined,
      note: header.note || undefined,
      items: cleanedItems,
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
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Batch Request Submitted!</h2>
        <p className="text-slate-500 mb-8">Your batch of stock movement lines has been submitted. The system will still track each line item separately for approval and dispatch.</p>
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
        {/* Locations */}
        <div className="form-group">
          <label className="label">{isShopRequester ? 'Fulfill From Warehouse *' : 'From Location (Source) *'}</label>
          <select
            required
            id="from-location"
            aria-label="Source location"
            className="input"
            value={header.fromLocationId}
            onChange={e => setHeader({ ...header, fromLocationId: e.target.value })}
          >
            <option value="">{isShopRequester ? 'Select warehouse' : 'Select source location'}</option>
            {(isShopRequester ? warehouseLocations : locations).map((location) => (
              <option key={location.id} value={location.id}>[{location.type}] {location.name}</option>
            ))}
          </select>
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
            <select
              required
              id="to-location"
              aria-label="Destination location"
              className="input"
              value={header.toLocationId}
              onChange={e => setHeader({ ...header, toLocationId: e.target.value })}
            >
              <option value="">Select destination location</option>
              {locations.filter((location) => location.id !== header.fromLocationId).map((location) => (
                <option key={location.id} value={location.id}>[{location.type}] {location.name}</option>
              ))}
            </select>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="form-group">
            <label className="label">Invoice Date</label>
            <input
              type="date"
              className="input"
              value={header.invoiceDate}
              onChange={e => setHeader({ ...header, invoiceDate: e.target.value })}
            />
          </div>

          <div className="form-group">
            <label className="label">Invoice Number / Reference *</label>
            <input
              required
              id="invoice-ref"
              aria-label="Invoice number or reference"
              className="input font-mono"
              value={header.referenceInvoice}
              onChange={e => setHeader({ ...header, referenceInvoice: e.target.value })}
              placeholder="e.g. INV-2024-00123"
            />
          </div>
        </div>

        <div className="form-group">
          <label className="label">Notes / Remarks</label>
          <textarea
            className="input"
            rows={3}
            value={header.note}
            onChange={e => setHeader({ ...header, note: e.target.value })}
            placeholder="Additional notes for this batch..."
          />
        </div>

        <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-800">Movement Lines</h2>
              <p className="text-xs text-slate-500">
                Batch requires 3+ distinct products. Currently filled: <strong>{filledItemsCount}/{items.length}</strong>
              </p>
            </div>
            <button type="button" onClick={addItem} className="btn-secondary btn-sm">
              + Add Item
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => {
              const selectedProduct = products.find((product) => product.id === item.productId) ?? null
              const stockLevel =
                selectedProduct?.stocks?.find((entry) => entry.locationId === header.fromLocationId)?.quantity ?? null
              const isDuplicate = item.productId && duplicateProductIds.includes(item.productId)

              return (
                <div key={index} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 md:grid-cols-[minmax(0,1fr)_160px_auto]">
                  <div className="form-group mb-0">
                    <label className="label">Product {index + 1}</label>
                    <select
                      required
                      className={`input ${isDuplicate ? 'border-amber-400 bg-amber-50' : ''}`}
                      value={item.productId}
                      onChange={(e) => updateItem(index, { productId: e.target.value })}
                    >
                      <option value="">Select a product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} — {product.sku}
                        </option>
                      ))}
                    </select>
                    {selectedProduct && header.fromLocationId && (
                      <p className={`mt-2 text-xs font-medium ${stockLevel !== null && stockLevel < Number(item.quantityRequested || 0) ? 'text-red-600' : 'text-slate-500'}`}>
                        Available at source: <strong>{stockLevel ?? 0} {selectedProduct.unit}</strong>
                      </p>
                    )}
                    {isDuplicate && (
                      <p className="mt-1 text-xs font-medium text-amber-600">
                        ⚠️ Duplicate product – batch needs distinct products
                      </p>
                    )}
                  </div>

                  <div className="form-group mb-0">
                    <label className="label">Quantity</label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      required
                      className="input"
                      value={item.quantityRequested}
                      onChange={(e) => updateItem(index, { quantityRequested: e.target.value })}
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-end">
                    <button type="button" onClick={() => removeItem(index)} className="btn-secondary btn-sm w-full md:w-auto">
                      Remove
                    </button>
                  </div>
                </div>
              )
            })}
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

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-700 rounded-xl px-4 py-3 text-sm">
            ❌ {error}
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !header.fromLocationId || (!isShopRequester && !header.toLocationId)}
            className="btn-primary flex-1 justify-center"
          >
            {saving ? 'Submitting…' : '📤 Submit Batch Request'}
          </button>
          <a href="/admin/stock-out" className="btn-secondary">Cancel</a>
        </div>
      </form>
    </div>
  )
}
