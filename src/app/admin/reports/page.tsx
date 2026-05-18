'use client'
import { useEffect, useState } from 'react'
import { formatCurrency } from '@/lib/utils'

interface ReportProduct {
  name: string
  category?: { name?: string | null } | null
  costPrice?: number | null
  unit?: string | null
}

interface ReportLocation {
  name: string
}

interface InventoryMatrixRow {
  productId: string
  locationId: string
  quantity: number
  product: ReportProduct
  location: ReportLocation
}

interface InventoryResponse {
  inventoryMatrix?: InventoryMatrixRow[]
}

interface MovementResponse {
  movements?: Array<Record<string, unknown>>
  warning?: string
}

interface ReportsData {
  inventory: InventoryResponse
  movement: MovementResponse
}

export default function ReportsPage() {
  const [period, setPeriod] = useState('30')
  const [inventoryData, setInventoryData] = useState<ReportsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadReports() {
      setError(null)
      try {
        const [invRes, movRes] = await Promise.all([
          fetch(`/api/reports?type=inventory`),
          fetch(`/api/reports?type=movement&days=${period}`),
        ])

        if (!invRes.ok || !movRes.ok) {
          throw new Error('Reports API request failed')
        }

        const [inv, mov] = await Promise.all([invRes.json(), movRes.json()])
        const movementPayload = mov as MovementResponse
        setInventoryData({
          inventory: inv as InventoryResponse,
          movement: movementPayload,
        })
        if (movementPayload.warning) {
          setError(movementPayload.warning)
        }
      } catch (err) {
        console.error('[ReportsPage] Failed to load reports:', err)
        setInventoryData(null)
        setError('Could not load reports data. Please retry.')
      } finally {
        setLoading(false)
      }
    }

    void loadReports()
  }, [period])

  const totalValue = inventoryData?.inventory?.inventoryMatrix?.reduce(
    (sum: number, s: InventoryMatrixRow) => sum + (s.quantity * (s.product?.costPrice || 0)), 0
  ) || 0

  const totalUnits = inventoryData?.inventory?.inventoryMatrix?.reduce(
    (sum: number, s: InventoryMatrixRow) => sum + s.quantity, 0
  ) || 0

  return (
    <div className="space-y-6 fade-in">
      <div className="rounded-3xl bg-linear-to-r from-fuchsia-600 via-indigo-600 to-blue-600 p-6 text-white shadow-[0_24px_70px_rgba(79,70,229,0.25)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">Reports & Analytics</h1>
            <p className="mt-1 text-sm text-indigo-100">Stock movement and inventory overview</p>
          </div>
          <div className="rounded-2xl bg-white/15 px-4 py-3 text-sm">
            <span className="font-semibold">Data window: </span>
            {period === '7' ? 'Last 7 days' : period === '30' ? 'Last 30 days' : 'Last 90 days'}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <select
          id="period-filter"
          aria-label="Report period"
          value={period}
          onChange={(e) => {
            setLoading(true)
            setPeriod(e.target.value)
          }}
          className="input max-w-xs"
        >
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
        </select>
      </div>

      {/* Summary Cards */}
      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Stock Units', value: totalUnits.toLocaleString(), icon: '📦', color: 'bg-indigo-500 text-white' },
          { label: 'Estimated Stock Value', value: formatCurrency(totalValue), icon: '💰', color: 'bg-emerald-500 text-white' },
          { label: 'Unique Products', value: new Set(inventoryData?.inventory?.inventoryMatrix?.map((s: InventoryMatrixRow) => s.productId)).size, icon: '🏷️', color: 'bg-fuchsia-500 text-white' },
          { label: 'Active Locations', value: new Set(inventoryData?.inventory?.inventoryMatrix?.map((s: InventoryMatrixRow) => s.locationId)).size, icon: '🏭', color: 'bg-amber-500 text-white' },
        ].map(s => (
          <div key={s.label} className="card shadow-[0_16px_38px_rgba(15,23,42,0.08)]">
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
                  ?.filter((s: InventoryMatrixRow) => s.quantity > 0)
                  .sort((a: InventoryMatrixRow, b: InventoryMatrixRow) => b.quantity - a.quantity)
                  .slice(0, 50)
                  .map((s: InventoryMatrixRow) => (
                    <tr key={`${s.productId}-${s.locationId}`}>
                      <td className="font-medium text-sm text-slate-900">{s.product.name}</td>
                      <td>
                        <span className="badge badge-indigo">{s.product.category?.name}</span>
                      </td>
                      <td className="text-sm text-slate-600">{s.location.name}</td>
                      <td className="font-mono font-bold text-indigo-700">{s.quantity.toLocaleString()}</td>
                      <td className="text-sm text-slate-500">{s.product.unit}</td>
                      <td className="text-sm text-slate-600">
                        {s.product.costPrice ? formatCurrency(s.product.costPrice) : '—'}
                      </td>
                      <td className="font-medium text-emerald-700">
                        {s.product.costPrice
                          ? formatCurrency(s.quantity * s.product.costPrice)
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
