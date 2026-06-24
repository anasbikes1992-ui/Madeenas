'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { HierarchicalProductSelector, type SelectedItem } from '@/components/stock/HierarchicalProductSelector'

interface LocationOption {
  id: string
  name: string
  type: string
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
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [header, setHeader] = useState<RequestHeaderState>({
    fromLocationId: '',
    toLocationId: '',
    referenceInvoice: '',
    invoiceDate: '',
    note: '',
  })
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
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
    fetch('/api/locations').then(r => r.json()).then(d => setLocations(d))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSaving(true)

    if (selectedItems.length === 0) {
      setError('You must select at least 1 product.')
      setSaving(false)
      return
    }

    const payload = {
      fromLocationId: header.fromLocationId,
      toLocationId: effectiveToLocationId || undefined,
      referenceInvoice: header.referenceInvoice || undefined,
      invoiceDate: header.invoiceDate || undefined,
      note: header.note || undefined,
      items: selectedItems.map((item) => ({
        productColorId: item.productColorId,
        quantityRequested: item.quantity,
      })),
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

        <div className="space-y-3">
          <HierarchicalProductSelector
            locationId={header.fromLocationId}
            selectedItems={selectedItems}
            onSelectionChange={setSelectedItems}
            disabled={!header.fromLocationId}
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
