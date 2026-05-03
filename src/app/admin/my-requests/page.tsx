'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-amber', APPROVED: 'badge-blue', DISPATCHED: 'badge-indigo',
  ACKNOWLEDGED: 'badge-green', REJECTED: 'badge-red', CANCELLED: 'badge-gray',
}

export default function MyRequestsPage() {
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/stock-out?limit=50')
      .then(r => r.json())
      .then(data => { setRequests(data.requests || []); setLoading(false) })
  }, [])

  async function acknowledge(id: string) {
    await fetch(`/api/stock-out/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'acknowledge' }),
    })
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'ACKNOWLEDGED', acknowledgedAt: new Date().toISOString() } : r))
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Stock Requests</h1>
          <p className="text-sm text-slate-500">Track all your stock-out requests</p>
        </div>
        <a href="/admin/new-request" className="btn-primary">+ New Request</a>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <div key={i} className="card h-20 animate-pulse bg-slate-100" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">📋</div>
          <h2 className="text-xl font-bold text-slate-700 mb-2">No Requests Yet</h2>
          <p className="text-slate-500 mb-6">Submit your first stock-out request.</p>
          <a href="/admin/new-request" className="btn-primary">Create Request</a>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((r: any) => (
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
                <div className="flex-shrink-0">
                  {r.status === 'DISPATCHED' && (
                    <button onClick={() => acknowledge(r.id)} className="btn-success btn-sm">
                      ✅ Acknowledge Receipt
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
