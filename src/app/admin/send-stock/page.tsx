'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { formatDate } from '@/lib/utils'
import { HierarchicalProductSelector, type SelectedItem } from '@/components/stock/HierarchicalProductSelector'

type SendLine = {
  id: string
  transferNo: string | null
  status: string
  product: {
    id: string
    name: string
    sku: string
    unit: string
    category?: { id: string; name: string } | null
  }
  productColor?: {
    id: string
    sku: string
    variant?: { code: string; design?: string | null } | null
    color?: { code: string; name?: string | null; hexValue?: string | null } | null
  } | null
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
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
  }

  async function load() {
    setLoading(true)
    const [sendRes, locationRes] = await Promise.all([
      fetch('/api/stock-send?limit=100').then((r) => r.json()),
      fetch('/api/locations').then((r) => r.json()),
    ])

    setRows(sendRes.requests || [])
    setLocations(locationRes || [])
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

  const lineLabel = (line: SendLine) => {
    const qty = line.quantityDispatched ?? line.quantityApproved ?? line.quantityRequested
    const category = line.product.category?.name || 'Uncategorized'
    const product = line.product.name
    const colorCode = line.productColor?.color?.code
    const shadeCode = line.productColor?.variant?.code
    const shadeDesign = line.productColor?.variant?.design

    const hierarchy = [
      category,
      product,
      colorCode || '—',
      shadeCode || '—',
    ].join(' > ')

    const design = shadeDesign ? ` (${shadeDesign})` : ''
    return `${hierarchy}${design} (${qty} ${line.product.unit})`
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

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    if (selectedItems.length === 0) {
      setSaving(false)
      showToast('Please add at least one product')
      return
    }

    // Use stock-send-v2 API for hierarchical products
    const payload = {
      fromLocationId: header.fromLocationId,
      toLocationId: header.toLocationId,
      note: header.note,
      referenceInvoice: header.referenceInvoice,
      invoiceDate: header.invoiceDate,
      items: selectedItems.map((item) => ({
        productColorId: item.productColorId,
        quantityDispatched: item.quantity,
      })),
    }

    const response = await fetch('/api/stock-send-v2', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    setSaving(false)

    if (!response.ok) {
      let errorMsg = 'Failed to create send'
      try {
        const error = await response.json()
        errorMsg = error.error || errorMsg
      } catch {
        errorMsg = `Server error (${response.status})`
      }
      showToast(errorMsg)
      return
    }

    showToast('Stock send created and dispatched')
    setShowForm(false)
    setHeader({ fromLocationId: '', toLocationId: '', note: '', referenceInvoice: '', invoiceDate: '' })
    setSelectedItems([])
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
      let errorMsg = 'Failed to acknowledge'
      try {
        const error = await response.json()
        errorMsg = error.error || errorMsg
      } catch {
        errorMsg = `Server error (${response.status})`
      }
      showToast(errorMsg)
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Direct Send Form</h1>
          <p className="text-sm text-slate-500">Send stock from warehouse/location to another location with mandatory acknowledgement.</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary w-full sm:w-auto">+ New Send</button>
      </div>

      <div className="hidden md:block table-container">
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
                        <span>{lineLabel(line)}</span>
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

      <div className="md:hidden space-y-3">
        {loading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="card h-24 bg-slate-100 animate-pulse" />
          ))
        ) : groupedRows.length === 0 ? (
          <div className="card text-center py-8 text-slate-400">No sends yet.</div>
        ) : (
          groupedRows.map((group) => (
            <div key={group.transferNo} className="card space-y-2">
              <div className="flex items-start justify-between gap-3">
                <code className="text-xs bg-slate-100 px-2 py-0.5 rounded break-all">{group.transferNo}</code>
                <span className={STATUS_BADGE[group.status] || 'badge-gray'}>{group.status}</span>
              </div>
              <p className="text-xs text-slate-600">From: {group.source}</p>
              <p className="text-xs text-slate-600">To: {group.destination}</p>
              <p className="text-xs text-slate-500">{formatDate(group.createdAt)}</p>
              <div className="space-y-2 pt-1 border-t border-slate-100">
                {group.lines.map((line) => (
                  <div key={line.id} className="rounded-lg bg-slate-50 p-2">
                    <p className="text-xs text-slate-700">
                      {lineLabel(line)}
                    </p>
                    {line.status === 'IN_TRANSIT' && canAcknowledge(line) ? (
                      <button
                        onClick={() => {
                          setAckModal(line)
                          setAckQty(String(line.quantityDispatched || line.quantityApproved || line.quantityRequested || ''))
                          setAckReason('')
                          setAckNote('')
                        }}
                        className="btn-success btn-sm mt-2 w-full"
                      >
                        Acknowledge
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {showForm ? (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <div className="modal max-w-3xl max-h-[90vh] overflow-y-auto">
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
                <h3 className="text-sm font-semibold text-slate-800 mb-2">Select Products</h3>
                {!header.fromLocationId ? (
                  <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                    ⚠ Select a source location first to see available stock.
                  </p>
                ) : (
                  <HierarchicalProductSelector
                    locationId={header.fromLocationId}
                    selectedItems={selectedItems}
                    onSelectionChange={setSelectedItems}
                  />
                )}
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
          <div className="modal max-w-lg max-h-[90vh] overflow-y-auto">
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
