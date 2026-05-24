'use client'

import { useEffect, useMemo, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { exportSaleInvoicePDF, type SaleInvoiceData } from '@/lib/reports'

interface SaleItem {
  id: string
  quantity: number
  unitPrice: number
  subTotal?: number
  total?: number
  product: {
    name: string
    sku: string
    unit: string
  }
}

interface SaleRecord extends SaleInvoiceData {
  id: string
  receiptNo: string
  createdAt: string
  location: { name: string }
  customerName?: string | null
  customerPhone?: string | null
  items: SaleItem[]
  totalAmount: number
  subTotal: number
  taxRate: number
  taxAmount: number
  grandTotal: number
  note?: string | null
  paymentMode: 'CASH' | 'CARD' | 'BANK_TRANSFER' | string
  soldBy: { name: string }
}

interface SalesResponse {
  sales?: SaleRecord[]
}

export default function SalesHistoryPage() {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [paymentFilter, setPaymentFilter] = useState('ALL')

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const matchesSearch = !search || [
        sale.receiptNo,
        sale.customerName || '',
        sale.customerPhone || '',
        sale.location?.name || '',
        sale.soldBy?.name || '',
      ].some((value) => value.toLowerCase().includes(search.toLowerCase()))

      const matchesPayment = paymentFilter === 'ALL' || sale.paymentMode === paymentFilter

      return matchesSearch && matchesPayment
    })
  }, [paymentFilter, sales, search])

  const summary = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + (Number(sale.grandTotal) || Number(sale.totalAmount) || 0), 0)
    const cashCount = filteredSales.filter((sale) => sale.paymentMode === 'CASH').length
    const creditCount = filteredSales.filter((sale) => sale.paymentMode === 'CREDIT').length
    const avgTicket = filteredSales.length ? totalRevenue / filteredSales.length : 0

    return {
      totalRevenue,
      cashCount,
      creditCount,
      avgTicket,
    }
  }, [filteredSales])

  useEffect(() => {
    fetch('/api/sales')
      .then(r => r.json())
      .then((data: SalesResponse) => {
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
            <h1 className="text-3xl font-black text-slate-950 sm:text-4xl">Sri Lanka sales ledger with instant invoice downloads.</h1>
            <p className="text-sm leading-7 text-slate-600">Track receipt activity, audit payment methods, and export a clean LKR tax invoice for any completed counter sale.</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-4 lg:min-w-160">
            {[
              ['Transactions', String(filteredSales.length)],
              ['Revenue', formatCurrency(summary.totalRevenue)],
              ['Cash count', String(summary.cashCount)],
              ['Credit sales', String(summary.creditCount)],
              ['Avg ticket', formatCurrency(summary.avgTicket)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
                <p className="mt-2 text-xl font-black text-slate-950">{value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-4xl border border-slate-200/70 bg-white p-5 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search receipt, customer, phone, location, or seller"
            className="input lg:max-w-xl"
          />
          <select
            value={paymentFilter}
            onChange={(event) => setPaymentFilter(event.target.value)}
            className="input lg:max-w-64"
          >
            <option value="ALL">All payment methods</option>
            <option value="CASH">Cash</option>
            <option value="CARD">Card</option>
            <option value="BANK_TRANSFER">Bank transfer</option>
            <option value="CHEQUE">Cheque</option>
            <option value="CREDIT">Credit</option>
          </select>
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
              <th>Invoice</th>
              <th>Sold By</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(9)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : filteredSales.length === 0 ? (
              <tr><td colSpan={9} className="text-center py-12 text-slate-400">No sales match the current filters</td></tr>
            ) : filteredSales.map(sale => (
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
                    {sale.items.map((item: SaleItem) => (
                      <div key={item.id} className="text-xs text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block mr-1 mb-1 border border-slate-100">
                        {item.product.name} ({item.quantity} {item.product.unit})
                      </div>
                    ))}
                  </div>
                </td>
                <td className="font-bold text-emerald-600">
                  {formatCurrency(Number(sale.grandTotal) || Number(sale.totalAmount) || 0)}
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
                <td>
                  <button
                    type="button"
                    onClick={() => exportSaleInvoicePDF(sale)}
                    className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700"
                  >
                    Download PDF
                  </button>
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
