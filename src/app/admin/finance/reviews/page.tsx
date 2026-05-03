'use client'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'

export default function FinanceReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)
  const [form, setForm] = useState({ tallyInvoiceNumber: '', tallyAmount: '', notes: '' })

  async function load() {
    setLoading(true)
    const res = await fetch('/api/finance/reviews')
    const data = await res.json()
    setReviews(data.reviews || [])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleMatch(e: React.FormEvent) {
    e.preventDefault()
    const res = await fetch('/api/finance/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: selected.id,
        status: 'MATCHED',
        ...form
      })
    })
    if (res.ok) {
      setSelected(null)
      setForm({ tallyInvoiceNumber: '', tallyAmount: '', notes: '' })
      load()
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 text-premium">Finance Reconciliation</h1>
          <p className="text-slate-500">Match internal stock movements with external Tally invoices.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Product</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qty</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Route</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="px-6 py-4"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                </tr>
              ))
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-slate-400">No pending reviews found.</td>
              </tr>
            ) : (
              reviews.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-600">
                    {format(new Date(r.createdAt), 'MMM d, HH:mm')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm font-medium text-slate-900">{r.stockOut.product.name}</div>
                    <div className="text-xs text-slate-500">{r.stockOut.product.sku}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-slate-600 font-mono">
                    {r.stockOut.quantityApproved || r.stockOut.quantityRequested} {r.stockOut.product.unit}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <span className="truncate max-w-[100px]">{r.stockOut.fromLocation.name}</span>
                      <span>→</span>
                      <span className="truncate max-w-[100px] text-indigo-600">{r.stockOut.toLocation?.name || 'Customer'}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${r.status === 'MATCHED' ? 'badge-success' : 'badge-warning'}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {r.status === 'PENDING' && (
                      <button 
                        onClick={() => setSelected(r)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Match Tally
                      </button>
                    )}
                    {r.status === 'MATCHED' && (
                      <div className="text-xs text-slate-400">
                        Inv: {r.tallyInvoiceNumber}<br/>
                        ₹{r.tallyAmount}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setSelected(null)}>
          <div className="modal max-w-md">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-slate-900">Reconcile with Tally</h2>
              <button onClick={() => setSelected(null)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            
            <div className="bg-indigo-50 rounded-xl p-4 mb-6 border border-indigo-100">
              <div className="text-xs text-indigo-600 font-bold uppercase mb-1">Internal Reference</div>
              <div className="text-sm text-indigo-900 font-medium">
                {selected.stockOut.product.name} — {selected.stockOut.quantityApproved} {selected.stockOut.product.unit}
              </div>
              <div className="text-xs text-indigo-500 mt-1">
                Requested by {selected.stockOut.requestedByUser.name}
              </div>
            </div>

            <form onSubmit={handleMatch} className="space-y-4">
              <div className="form-group">
                <label className="label">Tally Invoice Number *</label>
                <input 
                  required 
                  className="input" 
                  value={form.tallyInvoiceNumber} 
                  onChange={e => setForm({...form, tallyInvoiceNumber: e.target.value})}
                  placeholder="e.g. TLY-2024-001"
                />
              </div>
              <div className="form-group">
                <label className="label">Amount in Tally (₹)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  className="input" 
                  value={form.tallyAmount} 
                  onChange={e => setForm({...form, tallyAmount: e.target.value})}
                  placeholder="0.00"
                />
              </div>
              <div className="form-group">
                <label className="label">Notes / Discrepancies</label>
                <textarea 
                  className="input" 
                  rows={3}
                  value={form.notes} 
                  onChange={e => setForm({...form, notes: e.target.value})}
                  placeholder="Any differences between internal qty and invoice qty..."
                />
              </div>
              <button type="submit" className="btn-primary w-full justify-center py-3">
                ✅ Confirm Reconciliation
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
