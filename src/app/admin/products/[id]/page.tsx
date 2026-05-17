'use client'
import { useEffect, useState, use } from 'react'
import { format } from 'date-fns'
import { parseImages } from '@/lib/utils'

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [product, setProduct] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [ledger, setLedger] = useState<any[]>([])

  async function load() {
    setLoading(true)
    const res = await fetch(`/api/products/${id}`)
    const data = await res.json()
    setProduct(data)

    // Build unified ledger
    const entries: any[] = []
    
    // Add Stock Ins
    data.stockIns?.forEach((si: any) => {
      entries.push({
        date: new Date(si.createdAt),
        type: 'IN',
        qty: si.quantity,
        location: si.location.name,
        ref: si.batchNumber || 'N/A',
        user: si.user.name,
        note: si.note
      })
    })

    // Add Stock Outs (only relevant ones)
    data.stockOutRequests?.forEach((so: any) => {
      if (['DISPATCHED', 'ACKNOWLEDGED'].includes(so.status)) {
        entries.push({
          date: new Date(so.dispatchedAt || so.createdAt),
          type: 'OUT',
          qty: -(so.quantityApproved || so.quantityRequested),
          location: so.fromLocation.name,
          toLocation: so.toLocation?.name || 'Customer',
          ref: so.status,
          user: so.requestedByUser.name,
          note: so.note
        })
      }
    })

    // Sort by date desc
    entries.sort((a, b) => b.date.getTime() - a.date.getTime())
    setLedger(entries)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  if (loading) return <div className="p-8 text-center animate-pulse text-slate-400">Loading product history...</div>
  if (!product) return <div className="p-8 text-center text-red-500">Product not found.</div>

  const images = parseImages(product.images)

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-48 h-48 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
          {images[0] ? (
            <img src={images[0]} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-6xl">🧵</div>
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <span className="badge badge-indigo">{product.category.name}</span>
            <code className="text-sm font-mono text-slate-500">{product.sku}</code>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">{product.name}</h1>
          <p className="text-slate-500 mb-4 max-w-2xl">{product.description || 'No description provided.'}</p>
          <div className="flex flex-wrap gap-4">
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Design</div>
              <div className="text-sm font-medium">{product.design || 'Plain'}</div>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm">
              <div className="text-[10px] uppercase font-bold text-slate-400">Color</div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full border" style={{ background: product.colorHex }} />
                <div className="text-sm font-medium">{product.color}</div>
              </div>
            </div>
            <div className="bg-white px-4 py-2 rounded-xl border border-slate-100 shadow-sm text-red-600">
              <div className="text-[10px] uppercase font-bold text-slate-400">Low Stock At</div>
              <div className="text-sm font-bold">{product.lowStockAt} {product.unit}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left: Stock per Location */}
        <div className="lg:col-span-1 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📍 Current Stock</span>
          </h2>
          <div className="space-y-3">
            {product.stocks?.map((s: any) => (
              <div key={s.locationId} className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-slate-900">{s.location.name}</div>
                  <div className="text-xs text-slate-500">{s.location.type}</div>
                </div>
                <div className="text-right">
                  <div className={`text-lg font-mono font-bold ${s.quantity <= product.lowStockAt ? 'text-red-600' : 'text-emerald-600'}`}>
                    {s.quantity}
                  </div>
                  <div className="text-[10px] text-slate-400 uppercase font-bold">{product.unit}</div>
                </div>
              </div>
            ))}
            {(!product.stocks || product.stocks.length === 0) && (
              <div className="text-center py-8 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                No stock in any location.
              </div>
            )}
          </div>
        </div>

        {/* Right: Unified Ledger */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>📜 Stock Ledger (Timeline)</span>
          </h2>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Type</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date / User</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Movement</th>
                  <th className="px-4 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Quantity</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {ledger.map((entry, i) => (
                  <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-4 py-4 text-center">
                      <span className={`w-8 h-8 rounded-lg flex items-center justify-center mx-auto text-xs font-bold ${entry.type === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
                        {entry.type === 'IN' ? '↓' : '↑'}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs font-medium text-slate-900">{format(entry.date, 'MMM d, yyyy')}</div>
                      <div className="text-[10px] text-slate-400">{entry.user}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-xs text-slate-600">
                        {entry.type === 'IN' ? (
                          <span>Received at <strong>{entry.location}</strong></span>
                        ) : (
                          <span>From <strong>{entry.location}</strong> to <strong>{entry.toLocation}</strong></span>
                        )}
                      </div>
                      {entry.note && <div className="text-[10px] text-slate-400 italic mt-0.5 truncate max-w-[200px]">"{entry.note}"</div>}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className={`text-sm font-mono font-bold ${entry.type === 'IN' ? 'text-emerald-600' : 'text-orange-600'}`}>
                        {entry.qty > 0 ? `+${entry.qty}` : entry.qty}
                      </div>
                      <div className="text-[10px] text-slate-400 font-bold uppercase">{product.unit}</div>
                    </td>
                  </tr>
                ))}
                {ledger.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-12 text-center text-slate-400">No transaction history available.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
