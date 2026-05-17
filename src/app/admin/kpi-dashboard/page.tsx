'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { format, subDays } from 'date-fns'
import { formatCurrency } from '@/lib/utils'

interface KPIData {
  revenue: { date: string; amount: number; byChannel: Record<string, number> }[]
  stockoutRate: { date: string; rate: number; affected_skus: number }[]
  margins: { date: string; margin_percent: number; gross_margin: number; byChannel: Record<string, number> }[]
  fillRate: { date: string; rate: number; fulfilled: number; total: number }[]
  channelDistribution: { name: string; value: number; revenue: number }[]
  topSKUs: { sku: string; revenue: number; quantity_sold: number; margin_percent: number }[]
}

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

function formatCompactCurrency(amount: number) {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(amount)
}

export default function KPIDashboardPage() {
  const [kpiData, setKPIData] = useState<KPIData | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'7d' | '30d' | '90d'>('7d')

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true)
        // In production, this would call /api/kpis?timeframe=7d
        // For now, mock data for demonstration
        const mockData: KPIData = {
          revenue: Array.from({ length: 7 }, (_, i) => ({
            date: format(subDays(new Date(), 6 - i), 'MMM dd'),
            amount: Math.floor(Math.random() * 200000) + 50000,
            byChannel: {
              retail: Math.floor(Math.random() * 100000) + 20000,
              wholesale: Math.floor(Math.random() * 80000) + 15000,
              ecommerce: Math.floor(Math.random() * 30000) + 5000,
            },
          })),
          stockoutRate: Array.from({ length: 7 }, (_, i) => ({
            date: format(subDays(new Date(), 6 - i), 'MMM dd'),
            rate: Math.random() * 15,
            affected_skus: Math.floor(Math.random() * 10),
          })),
          margins: Array.from({ length: 7 }, (_, i) => ({
            date: format(subDays(new Date(), 6 - i), 'MMM dd'),
            margin_percent: 35 + Math.random() * 15,
            gross_margin: Math.floor(Math.random() * 150000) + 30000,
            byChannel: {
              retail: 40 + Math.random() * 5,
              wholesale: 25 + Math.random() * 5,
              ecommerce: 35 + Math.random() * 8,
            },
          })),
          fillRate: Array.from({ length: 7 }, (_, i) => ({
            date: format(subDays(new Date(), 6 - i), 'MMM dd'),
            rate: 90 + Math.random() * 9,
            fulfilled: Math.floor(Math.random() * 150) + 100,
            total: Math.floor(Math.random() * 170) + 110,
          })),
          channelDistribution: [
            { name: 'Retail', value: 45, revenue: 450000 },
            { name: 'Wholesale', value: 35, revenue: 350000 },
            { name: 'E-commerce', value: 15, revenue: 150000 },
            { name: 'B2B', value: 5, revenue: 50000 },
          ],
          topSKUs: [
            { sku: 'GOLD-COLOUR-001', revenue: 125000, quantity_sold: 450, margin_percent: 42 },
            { sku: 'POPJUN-RED-002', revenue: 89000, quantity_sold: 320, margin_percent: 38 },
            { sku: 'BUTTERFLY-BLUE-003', revenue: 76000, quantity_sold: 275, margin_percent: 40 },
            { sku: 'SILK-GREEN-004', revenue: 54000, quantity_sold: 180, margin_percent: 45 },
            { sku: 'COTTON-WHITE-005', revenue: 42000, quantity_sold: 210, margin_percent: 35 },
          ],
        }
        setKPIData(mockData)
      } catch (error) {
        console.error('Failed to fetch KPIs:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchKPIs()
  }, [timeframe])

  if (loading) {
    return <div className="flex items-center justify-center py-12">Loading KPI data...</div>
  }

  if (!kpiData) {
    return <div className="text-red-600">Failed to load KPI data</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">KPI Dashboard</h1>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeframe === tf ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tf === '7d' ? 'Last 7 Days' : tf === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <div className="text-sm text-gray-600 font-medium">Total Revenue</div>
          <div className="text-3xl font-bold mt-2">
            {formatCompactCurrency(kpiData.revenue.reduce((sum, d) => sum + d.amount, 0))}
          </div>
          <div className="text-xs text-green-600 mt-2">↑ 12% from last period</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
          <div className="text-sm text-gray-600 font-medium">Avg Stockout Rate</div>
          <div className="text-3xl font-bold mt-2">
            {(kpiData.stockoutRate.reduce((sum, d) => sum + d.rate, 0) / kpiData.stockoutRate.length).toFixed(1)}%
          </div>
          <div className="text-xs text-red-600 mt-2">↑ 2.3% (critical)</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="text-sm text-gray-600 font-medium">Gross Margin %</div>
          <div className="text-3xl font-bold mt-2">
            {(kpiData.margins.reduce((sum, d) => sum + d.margin_percent, 0) / kpiData.margins.length).toFixed(1)}%
          </div>
          <div className="text-xs text-green-600 mt-2">↑ 0.8% vs target 38%</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="text-sm text-gray-600 font-medium">Fill Rate</div>
          <div className="text-3xl font-bold mt-2">
            {(kpiData.fillRate.reduce((sum, d) => sum + d.rate, 0) / kpiData.fillRate.length).toFixed(1)}%
          </div>
          <div className="text-xs text-green-600 mt-2">Target: 95%</div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Daily Revenue Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kpiData.revenue}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: unknown) => {
                const v = typeof value === 'number' ? value : 0
                return formatCurrency(v)
              }} />
              <Legend />
              <Line type="monotone" dataKey="amount" stroke="#6366f1" name="Total Revenue" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Channel Distribution */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue by Channel</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={kpiData.channelDistribution}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value }) => `${name} ${value}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {kpiData.channelDistribution.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: unknown) => `${typeof value === 'number' ? value : 0}%`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stockout Rate */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Stockout Rate Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={kpiData.stockoutRate}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: unknown) => {
                const v = typeof value === 'number' ? value : 0
                return `${v.toFixed(1)}%`
              }} />
              <Bar dataKey="rate" fill="#ef4444" name="Stockout Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gross Margin % */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Gross Margin % by Day</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={kpiData.margins}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip formatter={(value: unknown) => {
                const v = typeof value === 'number' ? value : 0
                return `${v.toFixed(1)}%`
              }} />
              <Legend />
              <Line type="monotone" dataKey="margin_percent" stroke="#10b981" name="Margin %" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top SKUs */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-semibold mb-4">Top 5 SKUs by Revenue</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">SKU</th>
                <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                <th className="px-4 py-2 text-right font-semibold">Qty Sold</th>
                <th className="px-4 py-2 text-right font-semibold">Margin %</th>
              </tr>
            </thead>
            <tbody>
              {kpiData.topSKUs.map((sku, idx) => (
                <tr key={idx} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{sku.sku}</td>
                  <td className="px-4 py-2 text-right">{formatCompactCurrency(sku.revenue)}</td>
                  <td className="px-4 py-2 text-right">{sku.quantity_sold.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-semibold text-green-600">{sku.margin_percent}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Alerts */}
      <div className="bg-amber-50 border-l-4 border-amber-500 rounded p-4">
        <div className="flex">
          <div className="shrink-0">
            <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-amber-800">
              <strong>Action Required:</strong> Stockout rate at 14.2% - above threshold of 10%. Reorder critical SKUs: GOLD-COLOUR-001, POPJUN-RED-002
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
