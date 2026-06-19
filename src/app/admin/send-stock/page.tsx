'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { formatDate } from '@/lib/utils'

type SendLine = {
  id: string
  transferNo: string | null
  status: string
  product: { id: string; name: string; sku: string; unit: string }
  fromLocation: { id: string; name: string }
  toLocation: { id: string; name: string } | null
  quantityDispatched: number | null
  quantityApproved: number | null
  quantityRequested: number
  quantityReceived: number | null
  discrepancyQty: number | null
  discrepancyReason: string | null
  acknowledgeNote: string | null
  createdAt: string
}

const STATUS_BADGE: Record<string, string> = {
  IN_TRANSIT: 'badge-indigo',
  RECEIVED: 'badge-green',
  DISPATCHED: 'badge-blue',
}

export default function SendStockPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<SendLine[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [ackModal, setAckModal] = useState<SendLine | null>(null)
  const [ackQty, setAckQty] = useState('')
  const [ackReason, setAckReason] = useState('')
  const [ackNote, setAckNote] = useState('')

  const [header, setHeader] = useState({
    fromLocationId: '',
    toLocationId: '',
    note: '',
    referenceInvoice: '',
    invoiceDate: '',
  })
  const [items, setItems] = useState([{ productId: '', quantityDispatched: '' }])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    setLoading(true)
    const [sendRes, locationRes, productRes] = await Promise.all([
      fetch('/api/stock-send?limit=100').then((r) => r.json()),
      fetch('/api/locations').then((r) => r.json()),
      fetch('/api/products?limit=200').then((r) => r.json()),
    ])

    setRows(sendRes.requests || [])
    setLocations(locationRes || [])
    setProducts(productRes.products || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  const userLocationId = session?.user?.locationId || null
  const role = session?.user?.role || ''

  const canAcknowledge = (row: SendLine) => {
    if (['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) return true
    return Boolean(userLocationId && row.toLocation?.id === userLocationId)
  }

  const groupedRows = useMemo(() => {
    const map = new Map<string, SendLine[]>()
    for (const row of rows) {
      const key = row.transferNo || row.id
      const current = map.get(key) || []
      current.push(row)
      map.set(key, current)
    }

    return Array.from(map.entries()).map(([transferNo, lines]) => ({
      transferNo,
      lines,
      source: lines[0]?.fromLocation?.name || '—',
      destination: lines[0]?.toLocation?.name || '—',
      status: lines.some((line) => line.status === 'IN_TRANSIT') ? 'IN_TRANSIT' : 'RECEIVED',
      createdAt: lines[0]?.createdAt,
    }))
  }, [rows])

  function addItem() {
    setItems((current) => [...current, { productId: '', quantityDispatched: '' }])
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, currentIndex) => currentIndex !== index))
  }

  function updateItem(index: number, patch: Record<string, string>) {
    setItems((current) => current.map((item, currentIndex) => (currentIndex === index ? { ...item, ...patch } : item)))
  }

  function getAvailableQty(productId: string): number | null {
    if (!header.fromLocationId || !productId) return null
    const product = products.find((p: any) => p.id === productId)
    if (!product) return null
    return product.stocks?.find((s: any) => s.locationId === header.fromLocationId)?.quantity ?? 0
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const payload = {
      ...header,
      items: items
        .filter((item) => item.productId && item.quantityDispatched)
        .map((item) => ({ productId: item.productId, quantityDispatched: Number(item.quantityDispatched) })),
    }

    if (payload.items.length === 0) {
      setSaving(false)
      showToast('Please add at least one item line')
      return
    }

    const overStockItem = payload.items.find((item) => {
      const avail = getAvailableQty(item.productId)
      return avail !== null && item.quantityDispatched > avail
    })
    if (overStockItem) {
      setSaving(false)
      const product = products.find((p: any) => p.id === overStockItem.productId)
      const avail = getAvailableQty(overStockItem.productId) ?? 0
      showToast(`Insufficient stock for ${product?.name ?? 'item'}. Available: ${avail}`)
      return
    }

    const response = await fetch('/api/stock-send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (!response.ok) {
      const error = await response.json()
      showToast(error.error || 'Failed to create send')
      return
    }

    showToast('Stock send created and dispatched')
    setShowForm(false)
    setHeader({ fromLocationId: '', toLocationId: '', note: '', referenceInvoice: '', invoiceDate: '' })
    setItems([{ productId: '', quantityDispatched: '' }])
    await load()
  }

  async function acknowledgeLine() {
    if (!ackModal) return

    const response = await fetch(`/api/stock-send/${ackModal.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'acknowledge',
        quantityReceived: Number(ackQty),
        discrepancyReason: ackReason || null,
        acknowledgeNote: ackNote || null,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      showToast(error.error || 'Failed to acknowledge')
      return
    }

    showToast('Send acknowledged successfully')
    setAckModal(null)
    setAckQty('')
    setAckReason('')
    setAckNote('')
    await load()
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Direct Send Form</h1>
          <p className="text-sm text-slate-500">Send stock from warehouse/location to another location with mandatory acknowledgement.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ New Send</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Transfer #</th>
              <th>From</th>
              <th>To</th>
              <th>Lines</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(6)].map((__, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : groupedRows.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-10 text-slate-400">No sends yet.</td></tr>
            ) : groupedRows.map((group) => (
              <tr key={group.transferNo}>
                <td>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{group.transferNo}</code>
                </td>
                <td>{group.source}</td>
                <td>{group.destination}</td>
                <td>
                  <div className="space-y-1">
                    {group.lines.map((line) => (
                      <div key={line.id} className="flex items-center gap-2 text-xs">
                        <span>{line.product.name} ({line.quantityDispatched ?? line.quantityApproved ?? line.quantityRequested} {line.product.unit})</span>
                        {line.status === 'IN_TRANSIT' && canAcknowledge(line) ? (
                          <button
                            onClick={() => {
                              setAckModal(line)
                              setAckQty(String(line.quantityDispatched || line.quantityApproved || line.quantityRequested || ''))
                              setAckReason('')
                              setAckNote('')
                            }}
                            className="btn-success btn-sm"
                          >
                            Acknowledge
                          </button>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </td>
                <td><span className={STATUS_BADGE[group.status] || 'badge-gray'}>{group.status}</span></td>
                <td className="text-sm text-slate-500">{formatDate(group.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm ? (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <div className="modal max-w-3xl">
            <h2 className="text-xl font-bold mb-4">Create Direct Send</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">From Location *</label>
                  <select title="From location" required className="input" value={header.fromLocationId} onChange={(event) => setHeader({ ...header, fromLocationId: event.target.value })}>
                    <option value="">Select source</option>
                    {locations.map((location) => <option key={location.id} value={location.id}>[{location.type}] {location.name}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="label">To Location *</label>
                  <select title="To location" required className="input" value={header.toLocationId} onChange={(event) => setHeader({ ...header, toLocationId: event.target.value })}>
                    <option value="">Select destination</option>
                    {locations.filter((location) => location.id !== header.fromLocationId).map((location) => <option key={location.id} value={location.id}>[{location.type}] {location.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="label">Reference Invoice</label>
                  <input title="Reference invoice" placeholder="Invoice number" className="input" value={header.referenceInvoice} onChange={(event) => setHeader({ ...header, referenceInvoice: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Invoice Date</label>
                  <input title="Invoice date" type="date" className="input" value={header.invoiceDate} onChange={(event) => setHeader({ ...header, invoiceDate: event.target.value })} />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Note</label>
                <textarea title="Send note" placeholder="Optional note" className="input" rows={2} value={header.note} onChange={(event) => setHeader({ ...header, note: event.target.value })} />
              </div>

              <div className="rounded-xl border border-slate-200 p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">Send Lines</h3>
                  <button type="button" className="btn-secondary btn-sm" onClick={addItem}>+ Add Line</button>
                </div>
                {!header.fromLocationId && (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    ⚠ Select a source location first to see available stock quantities.
                  </p>
                )}
                {items.map((item, index) => {
                  const selectedProductIds = new Set(
                    items.filter((_, i) => i !== index).map((it) => it.productId).filter(Boolean)
                  )
                  const selectedProduct = products.find((p: any) => p.id === item.productId) as any
                  const availableQty = getAvailableQty(item.productId)
                  const enteredQty = Number(item.quantityDispatched)
                  const isOverStock = availableQty !== null && enteredQty > 0 && enteredQty > availableQty

                  return (
                    <div key={index} className="space-y-1">
                      <div className="grid md:grid-cols-[1fr_180px_auto] gap-3 items-start">
                        <select
                          title={`Product ${index + 1}`}
                          className="input"
                          value={item.productId}
                          onChange={(event) => updateItem(index, { productId: event.target.value, quantityDispatched: '' })}
                        >
                          <option value="">Select product</option>
                          {products.map((product: any) => (
                            <option key={product.id} value={product.id} disabled={selectedProductIds.has(product.id)}>
                              {product.name} ({product.sku})
                            </option>
                          ))}
                        </select>
                        <div>
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            className={`input w-full ${isOverStock ? 'border-red-400 focus:ring-red-300' : ''}`}
                            placeholder={selectedProduct ? `Qty (${selectedProduct.unit})` : 'Qty'}
                            value={item.quantityDispatched}
                            onChange={(event) => updateItem(index, { quantityDispatched: event.target.value })}
                          />
                          {item.productId && header.fromLocationId && (
                            <p className={`text-xs mt-1 ${isOverStock ? 'text-red-600 font-medium' : 'text-slate-500'}`}>
                              {isOverStock
                                ? `⚠ Exceeds available — `
                                : 'Available: '}
                              <span className="font-semibold">{availableQty ?? 0}</span>
                              {selectedProduct ? ` ${selectedProduct.unit}` : ''}
                            </p>
                          )}
                        </div>
                        <button type="button" className="btn-secondary btn-sm mt-1" onClick={() => removeItem(index)} disabled={items.length === 1}>
                          Remove
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : 'Send Now'}</button>
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {ackModal ? (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setAckModal(null) }}>
          <div className="modal max-w-lg">
            <h2 className="text-xl font-bold mb-2">Acknowledge Send</h2>
            <p className="text-sm text-slate-600 mb-4">{ackModal.product.name} | Dispatched: {ackModal.quantityDispatched ?? ackModal.quantityApproved ?? ackModal.quantityRequested}</p>

            <div className="space-y-3">
              <div className="form-group">
                <label className="label">Quantity Received *</label>
                <input title="Quantity received" placeholder="Received qty" type="number" min="0.01" step="0.01" className="input" value={ackQty} onChange={(event) => setAckQty(event.target.value)} />
              </div>

              <div className="form-group">
                <label className="label">Discrepancy Reason (required if partial)</label>
                <textarea title="Discrepancy reason" placeholder="Required for partial receipt" className="input" rows={2} value={ackReason} onChange={(event) => setAckReason(event.target.value)} />
              </div>

              <div className="form-group">
                <label className="label">Acknowledge Note</label>
                <textarea title="Acknowledge note" placeholder="Optional acknowledgement note" className="input" rows={2} value={ackNote} onChange={(event) => setAckNote(event.target.value)} />
              </div>
            </div>

            <div className="flex gap-3 mt-4">
              <button className="btn-primary flex-1 justify-center" onClick={acknowledgeLine}>Confirm Acknowledge</button>
              <button className="btn-secondary" onClick={() => setAckModal(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast-success">{toast}</div> : null}
    </div>
  )
}
