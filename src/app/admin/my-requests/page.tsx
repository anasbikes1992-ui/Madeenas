'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-amber', APPROVED: 'badge-blue', DISPATCHED: 'badge-indigo',
  IN_TRANSIT: 'badge-indigo', ACKNOWLEDGED: 'badge-green', RECEIVED: 'badge-green', REJECTED: 'badge-red', CANCELLED: 'badge-gray',
}

export default function MyRequestsPage() {
  const [sentRequests, setSentRequests] = useState<any[]>([])
  const [incomingRequests, setIncomingRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const [sentRes, incomingRes] = await Promise.all([
      fetch('/api/stock-out?mine=1&limit=50').then(r => r.json()),
      fetch('/api/stock-out?assignedToMe=1&status=DISPATCHED,IN_TRANSIT&limit=50').then(r => r.json()),
    ])
    setSentRequests(sentRes.requests || [])
    setIncomingRequests(incomingRes.requests || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function acknowledge(id: string) {
    const res = await fetch(`/api/stock-out/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge' }),
    })
    if (!res.ok) return

    setIncomingRequests(prev => prev.filter(r => r.id !== id))
    setSentRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'RECEIVED', receivedAt: new Date().toISOString() } : r))
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Stock Requests</h1>
          <p className="text-sm text-slate-500">Track what you sent and quickly acknowledge what is arriving to your location</p>
        </div>
        <a href="/admin/new-request" className="btn-primary">+ New Request</a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Sent By Me</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{sentRequests.length}</p>
        </div>
        <div className="card">
          <p className="text-xs text-slate-500 uppercase tracking-wide">Needs Receiver Acknowledgment</p>
          <p className="text-2xl font-bold text-indigo-700 mt-1">{incomingRequests.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : sentRequests.length === 0 && incomingRequests.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Requests Yet</h2>
          <p className="text-slate-500 mb-6">Submit your first stock-out request.</p>
          <a href="/admin/new-request" className="btn-primary">Create Request</a>
        </div>
      ) : (
        <div className="space-y-6">
          {incomingRequests.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Incoming To Your Location</h2>
              {incomingRequests.map((r: any) => (
                <div key={r.id} className="card border-indigo-100 bg-indigo-50/40">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="font-semibold text-slate-900">{r.product.name}</h3>
                      <p className="text-sm text-slate-600 mt-1">
                        {r.fromLocation.name} → {r.toLocation?.name || 'Destination'}
                      </p>
                      <p className="text-sm text-slate-700 mt-1">Qty: {r.quantityApproved || r.quantityRequested} {r.product.unit}</p>
                      <p className="text-xs text-slate-500 mt-2">Dispatched: {formatDate(r.dispatchedAt || r.updatedAt)}</p>
                    </div>
                    <button onClick={() => acknowledge(r.id)} className="btn-success btn-sm">
                      ✅ Acknowledge Receipt
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">My Submitted Requests</h2>
            {sentRequests.map((r: any) => (
            <div key={r.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{r.product.name}</h3>
                    <span className={STATUS_BADGE[r.status] || 'badge-gray'}>{r.status}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <span className="text-slate-400 text-xs">From</span>
                      <p className="text-slate-700 font-medium">{r.fromLocation.name}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Requested Qty</span>
                      <p className="text-slate-700 font-medium">{r.quantityRequested} {r.product.unit}</p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Approved Qty</span>
                      <p className={r.quantityApproved ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
                        {r.quantityApproved ? `${r.quantityApproved} ${r.product.unit}` : '—'}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400 text-xs">Invoice Ref</span>
                      <p className="font-mono text-slate-700 text-xs">{r.referenceInvoice || '—'}</p>
                    </div>
                  </div>
                  {r.rejectionReason && (
                    <div className="mt-3 p-2 bg-red-50 rounded-lg text-xs text-red-700">
                      ❌ Rejected: {r.rejectionReason}
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-2">Submitted: {formatDate(r.createdAt)}</p>
                </div>
                <div className="shrink-0">
                  {(r.status === 'DISPATCHED' || r.status === 'IN_TRANSIT') && incomingRequests.some(i => i.id === r.id) && (
                    <button onClick={() => acknowledge(r.id)} className="btn-success btn-sm">
                      ✅ Acknowledge Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
