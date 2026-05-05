'use client'
import { useEffect, useState } from 'react'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'badge-amber',
  MATCHED: 'badge-green',
  DISCREPANCY: 'badge-red',
}

export default function FinanceDashboardPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [pendingReviews, setPendingReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [selectedReview, setSelectedReview] = useState<any>(null)
  const [reviewForm, setReviewForm] = useState<any>({ externalInvoice: '', externalAmount: '', notes: '', status: 'MATCHED' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function load() {
    setLoading(true)
    const revRes = await fetch('/api/finance/reviews?limit=100')
    const revData = await revRes.json()
    const allReviews = revData.reviews || []
    setReviews(allReviews)
    setPendingReviews(allReviews.filter((review: any) => review.status === 'PENDING'))
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function submitReview(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedReview) return

    setSaving(true)
    const res = await fetch('/api/finance/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selectedReview.id,
        ...reviewForm,
      }),
    })
    setSaving(false)

    if (res.ok) {
      setShowReviewForm(false)
      setSelectedReview(null)
      load()
      showToast('Finance review submitted!')
      return
    }

    const data = await res.json().catch(() => null)
    showToast(data?.error || 'Failed to submit finance review')
  }

  const matched = reviews.filter(r => r.status === 'MATCHED').length
  const discrepancies = reviews.filter(r => r.status === 'DISCREPANCY').length

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl p-6 text-white">
        <h1 className="text-2xl font-bold mb-1">Finance Department</h1>
        <p className="text-teal-100 text-sm">Tally stock movements with your external invoicing system</p>
        <div className="grid grid-cols-3 gap-4 mt-5">
          {[
            { label: 'To Review', value: pendingReviews.length, icon: '🧾' },
            { label: 'Matched', value: matched, icon: '✅' },
            { label: 'Discrepancies', value: discrepancies, icon: '⚠️' },
          ].map(s => (
            <div key={s.label} className="bg-white/20 rounded-xl p-4 text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-2xl font-bold">{s.value}</div>
              <div className="text-teal-100 text-xs">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Acknowledged stock-outs needing review */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">📋 Needs Finance Review</h2>
            <span className="badge badge-amber">{pendingReviews.length} pending</span>
          </div>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : pendingReviews.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">✅ All pending finance reviews are complete</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {pendingReviews.map((review: any) => {
                const stockOut = review.stockOut

                return (
                <div key={review.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{stockOut.product.name}</p>
                    <p className="text-xs text-slate-500">
                      {stockOut.fromLocation.name} | Qty: {stockOut.quantityApproved || stockOut.quantityRequested} {stockOut.product.unit}
                    </p>
                    <p className="text-xs text-slate-400">Invoice: {stockOut.referenceInvoice || '—'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedReview(review)
                      setReviewForm({
                        externalInvoice: review.externalInvoice || stockOut.referenceInvoice || '',
                        externalAmount: review.externalAmount?.toString() || '',
                        notes: review.notes || '',
                        status: review.status || 'MATCHED',
                      })
                      setShowReviewForm(true)
                    }}
                    className="btn-primary btn-sm shrink-0 ml-3"
                  >
                    Review
                  </button>
                </div>
              )})}
            </div>
          )}
        </div>

        {/* Review history */}
        <div className="card">
          <h2 className="font-semibold text-slate-900 mb-4">🧾 Review History</h2>
          {loading ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-xl animate-pulse" />)}</div>
          ) : reviews.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No reviews yet</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {reviews.map((r: any) => (
                <div key={r.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-slate-900">{r.stockOut.product.name}</p>
                    <span className={STATUS_BADGE[r.status] || 'badge-gray'}>{r.status}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Stock Invoice: {r.stockOut.referenceInvoice || '—'}</span>
                    <span>External: {r.externalInvoice || '—'}</span>
                    {r.externalAmount && <span>Amount: {formatCurrency(r.externalAmount)}</span>}
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-slate-400">By {r.reviewer.name} • {formatDate(r.createdAt)}</span>
                  </div>
                  {r.notes && <p className="text-xs text-slate-600 mt-1 italic">"{r.notes}"</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Review modal */}
      {showReviewForm && selectedReview && (
        <div className="modal-overlay" onClick={e => {
          if (e.target === e.currentTarget) {
            setShowReviewForm(false)
            setSelectedReview(null)
          }
        }}>
          <div className="modal">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold">Finance Review</h2>
              <button onClick={() => { setShowReviewForm(false); setSelectedReview(null) }} className="text-slate-400 hover:text-slate-700 text-2xl">&times;</button>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 mb-5 text-sm">
              <p className="font-medium text-slate-900">{selectedReview.stockOut.product.name}</p>
              <div className="grid grid-cols-2 gap-2 mt-2 text-slate-600">
                <span>From: {selectedReview.stockOut.fromLocation.name}</span>
                <span>Qty: {selectedReview.stockOut.quantityApproved || selectedReview.stockOut.quantityRequested} {selectedReview.stockOut.product.unit}</span>
                <span>Stock Invoice: <strong>{selectedReview.stockOut.referenceInvoice || '—'}</strong></span>
                <span>Dispatched: {formatDate(selectedReview.stockOut.dispatchedAt)}</span>
              </div>
            </div>

            <form onSubmit={submitReview} className="space-y-4">
              <div className="form-group">
                <label className="label">External Invoice Number</label>
                <input className="input font-mono" value={reviewForm.externalInvoice} onChange={e => setReviewForm({ ...reviewForm, externalInvoice: e.target.value })} placeholder="From your invoicing system" />
              </div>
              <div className="form-group">
                <label className="label">Invoice Amount</label>
                <input type="number" step="0.01" className="input" value={reviewForm.externalAmount} onChange={e => setReviewForm({ ...reviewForm, externalAmount: e.target.value })} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label className="label">Tally Status</label>
                <div className="flex gap-3">
                  {['MATCHED', 'DISCREPANCY', 'PENDING'].map(s => (
                    <button key={s} type="button" onClick={() => setReviewForm({ ...reviewForm, status: s })}
                      className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${reviewForm.status === s ? 'bg-teal-600 text-white border-teal-600' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >{s}</button>
                  ))}
                </div>
              </div>
              <div className="form-group">
                <label className="label">Notes</label>
                <textarea className="input" rows={2} value={reviewForm.notes} onChange={e => setReviewForm({ ...reviewForm, notes: e.target.value })} placeholder="Observations or remarks..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : '✅ Submit Review'}
                </button>
                <button type="button" onClick={() => setShowReviewForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast-success">✅ {toast}</div>}
    </div>
  )
}
