'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

export default function ReportsPage() {
  const [period, setPeriod] = useState('30')
  const [inventoryData, setInventoryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      fetch(`/api/reports?type=inventory`).then(r => r.json()),
      fetch(`/api/reports?type=movement&days=${period}`).then(r => r.json()),
    ]).then(([inv, mov]) => {
      setInventoryData({ inventory: inv, movement: mov })
      setLoading(false)
    })
  }, [period])

  const totalValue = inventoryData?.inventory?.inventoryMatrix?.reduce(
    (sum: number, s: any) => sum + (s.quantity * (s.product?.costPrice || 0)), 0
  ) || 0

  const totalUnits = inventoryData?.inventory?.inventoryMatrix?.reduce(
    (sum: number, s: any) => sum + s.quantity, 0
  ) || 0

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
          <p className="text-sm text-slate-500">Stock movement and inventory overview</p>
        </div>
        <select id="period-filter" aria-label="Report period" value={period} onChange={e => setPeriod(e.target.value)} className="input max-w-xs">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Stock Units', value: totalUnits.toLocaleString(), icon: '📦', color: 'bg-indigo-50 text-indigo-700' },
          { label: 'Estimated Stock Value', value: `$${totalValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, icon: '💰', color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Unique Products', value: new Set(inventoryData?.inventory?.inventoryMatrix?.map((s: any) => s.productId)).size, icon: '🏷️', color: 'bg-purple-50 text-purple-700' },
          { label: 'Active Locations', value: new Set(inventoryData?.inventory?.inventoryMatrix?.map((s: any) => s.locationId)).size, icon: '🏭', color: 'bg-amber-50 text-amber-700' },
        ].map(s => (
          <div key={s.label} className="card">
            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{loading ? '…' : s.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top stock items */}
      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">📊 Inventory Breakdown by Location</h2>
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <div key={i} className="h-8 bg-slate-100 rounded animate-pulse" />)}
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Location</th>
                  <th>Qty on Hand</th>
                  <th>Unit</th>
                  <th>Cost/Unit</th>
                  <th>Total Value</th>
                </tr>
              </thead>
              <tbody>
                {inventoryData?.inventory?.inventoryMatrix
                  ?.filter((s: any) => s.quantity > 0)
                  .sort((a: any, b: any) => b.quantity - a.quantity)
                  .slice(0, 50)
                  .map((s: any) => (
                    <tr key={`${s.productId}-${s.locationId}`}>
                      <td className="font-medium text-sm text-slate-900">{s.product.name}</td>
                      <td>
                        <span className="badge badge-indigo">{s.product.category?.name}</span>
                      </td>
                      <td className="text-sm text-slate-600">{s.location.name}</td>
                      <td className="font-mono font-bold text-indigo-700">{s.quantity.toLocaleString()}</td>
                      <td className="text-sm text-slate-500">{s.product.unit}</td>
                      <td className="text-sm text-slate-600">
                        {s.product.costPrice ? `Rs. ${s.product.costPrice.toLocaleString()}` : '—'}
                      </td>
                      <td className="font-medium text-emerald-700">
                        {s.product.costPrice
                          ? `Rs. ${(s.quantity * s.product.costPrice).toLocaleString(undefined, { maximumFractionDigits: 0 })}`
                          : '—'
                        }
                      </td>
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
