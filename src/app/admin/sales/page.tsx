'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatDate } from '@/lib/utils'

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const summary = useMemo(() => {
    const totalRevenue = sales.reduce((sum, sale) => sum + (Number(sale.totalAmount) || 0), 0)
    const cashCount = sales.filter((sale) => sale.paymentMode === 'CASH').length
    const avgTicket = sales.length ? totalRevenue / sales.length : 0

    return {
      totalRevenue,
      cashCount,
      avgTicket,
    }
  }, [sales])

  useEffect(() => {
    fetch('/api/sales')
      .then(r => r.json())
      .then(data => {
        setSales(data.sales || [])
        setLoading(false)
      })
      .catch(() => {
        setSales([])
        setLoading(false)
      })
  }, [])

  return (
    <div className="space-y-6 fade-in">
      <section className="rounded-4xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">Sales operations</p>
            <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Sales history with the shape of a real operational dashboard.</h1>
            <p className="text-sm leading-7 text-slate-600">Track receipts, location activity, payment modes, and transaction totals without losing the speed of a working sales desk.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:min-w-136">
            {[
              ['Transactions', String(sales.length)],
              ['Cash count', String(summary.cashCount)],
              ['Avg ticket', `Rs. ${summary.avgTicket.toLocaleString(undefined, { maximumFractionDigits: 0 })}`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="table-container bg-white">
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
                  Rs. {(Number(sale.totalAmount) || 0).toLocaleString()}
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
