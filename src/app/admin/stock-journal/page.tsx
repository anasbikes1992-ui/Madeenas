'use client'

import { useEffect, useState } from 'react'

type JournalEntry = {
  id: string
  type: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_ADJUSTMENT'
  productName: string
  unit: string
  fromLocation: string | null
  toLocation: string | null
  quantity: number
  actor: string
  date: string
  note: string | null
}

const TYPE_BADGES: Record<JournalEntry['type'], string> = {
  STOCK_IN: 'badge-green',
  STOCK_OUT: 'badge-indigo',
  STOCK_ADJUSTMENT: 'badge-amber',
}

export default function StockJournalPage() {
  const [rows, setRows] = useState<JournalEntry[]>([])
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    const response = await fetch('/api/stock-journal?limit=150')
    const payload = await response.json()
    setRows(payload.entries || [])
    setLoading(false)
  }

  useEffect(() => {
    void load()
  }, [])

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Stock Journal</h1>
        <p className="text-sm text-slate-500 mt-1">Unified ledger for stock-in, dispatches, acknowledgements, and adjustments.</p>
      </div>

      <div className="card">
        {loading ? (
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="h-10 rounded bg-slate-100 animate-pulse" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-slate-500">No journal entries found.</p>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Route</th>
                  <th>Qty</th>
                  <th>By</th>
                  <th>Date</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <span className={TYPE_BADGES[row.type] || 'badge-gray'}>{row.type}</span>
                    </td>
                    <td>
                      <div className="text-sm font-medium text-slate-900">{row.productName}</div>
                    </td>
                    <td className="text-sm text-slate-700">
                      {row.fromLocation || '-'}
                      {' -> '}
                      {row.toLocation || '-'}
                    </td>
                    <td className={row.quantity >= 0 ? 'text-emerald-600 font-medium' : 'text-red-600 font-medium'}>
                      {row.quantity > 0 ? '+' : ''}{row.quantity} {row.unit}
                    </td>
                    <td className="text-sm text-slate-700">{row.actor}</td>
                    <td className="text-sm text-slate-500">{new Date(row.date).toLocaleString()}</td>
                    <td className="text-sm text-slate-600">{row.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
