'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/sales')
      .then(r => r.json())
      .then(data => {
        setSales(data.sales || [])
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales History</h1>
          <p className="text-sm text-slate-500 mt-0.5">{sales.length} transactions recorded</p>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Receipt No</th>
              <th>Date</th>
              <th>Location</th>
              <th>Customer</th>
              <th>Items</th>
              <th>Total Amount</th>
              <th>Payment Mode</th>
              <th>Sold By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : sales.length === 0 ? (
              <tr><td colSpan={8} className="text-center py-12 text-slate-400">No sales recorded yet</td></tr>
            ) : sales.map(sale => (
              <tr key={sale.id}>
                <td>
                  <code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-bold text-indigo-700">
                    {sale.receiptNo}
                  </code>
                </td>
                <td className="text-sm text-slate-500">{formatDate(sale.createdAt)}</td>
                <td className="text-sm text-slate-700">{sale.location.name}</td>
                <td>
                  <div className="text-sm">
                    <p className="font-medium text-slate-900">{sale.customerName || 'Walk-in'}</p>
                    <p className="text-xs text-slate-400">{sale.customerPhone || '—'}</p>
                  </div>
                </td>
                <td>
                  <div className="space-y-1">
                    {sale.items.map((item: any) => (
                      <div key={item.id} className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block mr-1 mb-1 border border-slate-100">
                        {item.product.name} ({item.quantity} {item.product.unit})
                      </div>
                    ))}
                  </div>
                </td>
                <td className="font-bold text-emerald-600">
                  Rs. {sale.totalAmount.toLocaleString()}
                </td>
                <td>
                  <span className={`text-xs px-2 py-0.5 rounded-full border ${
                    sale.paymentMode === 'CASH' ? 'bg-green-50 text-green-700 border-green-200' :
                    sale.paymentMode === 'CARD' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-purple-50 text-purple-700 border-purple-200'
                  }`}>
                    {sale.paymentMode}
                  </span>
                </td>
                <td className="text-sm text-slate-500">{sale.soldBy.name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
