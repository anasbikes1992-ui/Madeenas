'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { useSession } from 'next-auth/react'

const STATUS_BADGE: Record<string, string> = {
  DRAFT: 'badge-gray',
  PENDING: 'badge-amber',
  APPROVED: 'badge-blue',
  DISPATCHED: 'badge-indigo',
  IN_TRANSIT: 'badge-indigo',
  ACKNOWLEDGED: 'badge-green',
  RECEIVED: 'badge-green',
  REJECTED: 'badge-red',
  CANCELLED: 'badge-gray',
}

export default function StockOutPage() {
  const { data: session } = useSession()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('PENDING')
  const [actionModal, setActionModal] = useState<{ req: any; action: string } | null>(null)
  const [actionNote, setActionNote] = useState('')
  const [actionQty, setActionQty] = useState('')
  const [processing, setProcessing] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter) params.set('status', statusFilter)
    const res = await fetch('/api/stock-out?' + params)
    const data = await res.json()
    setRequests(data.requests || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  async function doAction() {
    if (!actionModal) return
    setProcessing(true)
    const body: any = { action: actionModal.action }
    if (actionModal.action === 'approve') body.quantityApproved = actionQty
    if (actionModal.action === 'reject') body.rejectionReason = actionNote
    const res = await fetch(`/api/stock-out/${actionModal.req.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    setProcessing(false)
    setActionModal(null)
    if (res.ok) { load(); showToast(`Request ${actionModal.action}d successfully`) }
  }

  const actionLabel: Record<string, { label: string; cls: string }> = {
    approve: { label: 'Approve', cls: 'btn-success' },
    reject: { label: 'Reject', cls: 'btn-danger' },
    dispatch: { label: 'Dispatch', cls: 'btn-primary' },
    acknowledge: { label: 'Acknowledge', cls: 'btn-success' },
    cancel: { label: 'Cancel', cls: 'btn-danger' },
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Stock-Out Requests</h1>
          <p className="text-sm text-slate-500">{requests.length} total requests</p>
        </div>
        <a href="/admin/new-request" className="btn-primary">+ New Request</a>
      </div>

      {/* 3-Tab Filter Layout */}
      <div className="flex border-b border-slate-200 mb-6">
        {[
          { id: 'pending', label: 'Pending Requests', statuses: ['PENDING'] },
          { id: 'progress', label: 'In-Progress (Approved/Transit)', statuses: ['APPROVED', 'DISPATCHED', 'IN_TRANSIT'] },
          { id: 'history', label: 'Completed History', statuses: ['ACKNOWLEDGED', 'RECEIVED', 'REJECTED', 'CANCELLED'] },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.statuses.join(','))}
            className={`px-6 py-3 text-sm font-medium transition-all relative ${
              (statusFilter === tab.statuses.join(',') || (!statusFilter && tab.id === 'pending')) 
                ? 'text-indigo-600 border-b-2 border-indigo-600' 
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>From</th>
              <th>To</th>
              <th>Qty Requested</th>
              <th>Qty Approved</th>
              <th>Invoice Ref</th>
              <th>Requested By</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>{[...Array(10)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : requests.length === 0 ? (
              <tr><td colSpan={10} className="text-center py-12 text-slate-400">No requests found</td></tr>
            ) : requests.map((r: any) => (
              <tr key={r.id}>
                <td>
                  <div>
                    <p className="font-medium text-sm text-slate-900">{r.product.name}</p>
                    <p className="text-xs text-slate-400">{r.product.sku}</p>
                  </div>
                </td>
                <td className="text-sm text-slate-700">{r.fromLocation.name}</td>
                <td className="text-sm text-slate-500">{r.toLocation?.name || '—'}</td>
                <td className="font-medium">{r.quantityRequested} {r.product.unit}</td>
                <td className={r.quantityApproved ? 'font-medium text-emerald-600' : 'text-slate-400'}>
                  {r.quantityApproved ? `${r.quantityApproved} ${r.product.unit}` : '—'}
                </td>
                <td>
                  {r.referenceInvoice ? (
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{r.referenceInvoice}</code>
                  ) : '—'}
                </td>
                <td className="text-sm text-slate-700">{r.requestedByUser.name}</td>
                <td className="text-sm text-slate-500">{formatDate(r.createdAt)}</td>
                <td><span className={STATUS_BADGE[r.status] || 'badge-gray'}>{r.status}</span></td>
                <td>
                  <div className="flex gap-1">
                    {(() => {
                      const role = session?.user?.role || ''
                      const userLocationId = session?.user?.locationId || null
                      const canApprove = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)
                      const canDispatch =
                        ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role) ||
                        ((role === 'STORE_KEEPER' || role === 'SHOP_STAFF') && r.fromLocationId === userLocationId)
                      const canAcknowledge =
                        ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role) ||
                        (Boolean(userLocationId) && r.toLocationId === userLocationId)

                      return (
                        <>
                          {r.status === 'PENDING' && canApprove && (
                            <>
                              <button onClick={() => { setActionModal({ req: r, action: 'approve' }); setActionQty(String(r.quantityRequested)) }} className="btn-success btn-sm">✓</button>
                              <button onClick={() => { setActionModal({ req: r, action: 'reject' }); setActionNote('') }} className="btn-danger btn-sm">✗</button>
                            </>
                          )}
                          {(r.status === 'APPROVED' || r.status === 'PENDING') && canDispatch && (
                            <button onClick={() => setActionModal({ req: r, action: 'dispatch' })} className="btn-primary btn-sm">📤</button>
                          )}
                          {(r.status === 'DISPATCHED' || r.status === 'IN_TRANSIT') && canAcknowledge && (
                            <button onClick={() => setActionModal({ req: r, action: 'acknowledge' })} className="btn-success btn-sm">✅</button>
                          )}
                          {r.status === 'PENDING' && (r.requestedBy === session?.user?.id || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) && (
                            <button onClick={() => setActionModal({ req: r, action: 'cancel' })} className="btn-secondary btn-sm">✕</button>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action Modal */}
      {actionModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h2 className="text-xl font-bold mb-1 capitalize">{actionModal.action} Request</h2>
            <p className="text-slate-500 text-sm mb-6">
              Product: <strong>{actionModal.req.product.name}</strong> | Requested: {actionModal.req.quantityRequested} {actionModal.req.product.unit}
            </p>
            {actionModal.action === 'approve' && (
              <div className="form-group mb-4">
                <label className="label">Approved Quantity</label>
                <input type="number" className="input" value={actionQty} onChange={e => setActionQty(e.target.value)} max={actionModal.req.quantityRequested} />
              </div>
            )}
            {actionModal.action === 'reject' && (
              <div className="form-group mb-4">
                <label className="label">Rejection Reason</label>
                <textarea className="input" rows={3} value={actionNote} onChange={e => setActionNote(e.target.value)} placeholder="Reason for rejection..." />
              </div>
            )}
            {['dispatch', 'acknowledge', 'cancel'].includes(actionModal.action) && (
              <p className="text-slate-700 mb-6">Are you sure you want to <strong>{actionModal.action}</strong> this request?</p>
            )}
            <div className="flex gap-3">
              <button onClick={doAction} disabled={processing} className={`${actionLabel[actionModal.action]?.cls || 'btn-primary'} btn flex-1 justify-center`}>
                {processing ? 'Processing…' : actionLabel[actionModal.action]?.label}
              </button>
              <button onClick={() => setActionModal(null)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="toast-success">{toast}</div>}
    </div>
  )
}
