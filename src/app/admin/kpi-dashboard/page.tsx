'use client'
import { useEffect, useState } from 'react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { formatCurrency } from '@/lib/utils'

interface BusinessMetrics {
  revenue: {
    total: number
    taxCollected: number
    netRevenue: number
    growthRate: number
    dailyAverage: number
    byPaymentMode: Record<string, number>
  }
  profit: {
    grossProfit: number
    grossMargin: number
    netProfit: number
    netMargin: number
    costOfGoodsSold: number
  }
  inventory: {
    totalValue: number
    turnoverRate: number
    stockouts: number
    lowStockItems: number
    deadStock: Array<{ estimatedValue: number }>
    fastMoving: string[]
    slowMoving: string[]
  }
  customers: {
    totalCustomers: number
    newCustomers: number
    retentionRate: number
    churnRate: number
    avgLifetimeValue: number
    avgOrderValue: number
    repeatCustomerRate: number
  }
  sales: {
    totalOrders: number
    completedOrders: number
    avgOrderSize: number
    conversionRate: number
    cancelledOrders: number
    pendingOrders: number
  }
  topProducts: Array<{
    productId: string
    productName: string
    sku: string
    unitsSold: number
    revenue: number
    profit: number
    profitMargin: number
  }>
  topCustomers: Array<{
    customerId: string
    customerName: string
    email: string
    totalSpent: number
    orderCount: number
    avgOrderValue: number
    lastPurchaseDate: string | null
  }>
  cashFlow: {
    cashIn: number
    cashOut: number
    netCashFlow: number
    dailyBreakdown: Array<{
      date: string
      cashIn: number
      cashOut: number
      net: number
    }>
  }
  predictions: {
    stockAlerts: Array<{
      productId: string
      productName: string
      currentStock: number
      reorderPoint: number
      daysUntilStockout: number
      urgency: 'critical' | 'high' | 'medium'
    }>
    demandForecast: Array<{
      productId: string
      productName: string
      forecastedDemand: number
      confidence: number
      trend: 'increasing' | 'stable' | 'decreasing'
    }>
    reorderSuggestions: Array<{
      productId: string
      productName: string
      suggestedQuantity: number
      estimatedCost: number
      expectedStockoutDate: string
    }>
  }
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
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [timeframe, setTimeframe] = useState<'7' | '30' | '90'>('7')

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/analytics?days=${timeframe}`)
        const data = await response.json()
        if (data.success) {
          setMetrics(data.metrics)
        }
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

  if (!metrics) {
    return <div className="text-red-600">Failed to load KPI data</div>
  }

  const paymentModesData = Object.entries(metrics.revenue.byPaymentMode || {}).map(([name, value]) => ({
    name,
    value
  }))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">KPI Dashboard</h1>
        <div className="flex gap-2">
          {(['7', '30', '90'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-4 py-2 rounded-lg font-medium transition ${
                timeframe === tf ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {tf === '7' ? 'Last 7 Days' : tf === '30' ? 'Last 30 Days' : 'Last 90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-indigo-600">
          <div className="text-sm text-gray-600 font-medium">Total Revenue</div>
          <div className="text-3xl font-bold mt-2">
            {formatCompactCurrency(metrics.revenue.total)}
          </div>
          <div className={`text-xs mt-2 ${metrics.revenue.growthRate >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {metrics.revenue.growthRate >= 0 ? '↑' : '↓'} {Math.abs(metrics.revenue.growthRate).toFixed(1)}% from last period
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
          <div className="text-sm text-gray-600 font-medium">Stockouts / Low Stock</div>
          <div className="text-3xl font-bold mt-2">
            {metrics.inventory.stockouts} / {metrics.inventory.lowStockItems}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
          <div className="text-sm text-gray-600 font-medium">Gross Margin %</div>
          <div className="text-3xl font-bold mt-2">
            {metrics.profit.grossMargin.toFixed(1)}%
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
          <div className="text-sm text-gray-600 font-medium">Conversion Rate</div>
          <div className="text-3xl font-bold mt-2">
            {metrics.sales.conversionRate.toFixed(1)}%
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Cash Flow Trend */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Daily Cash Flow Trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={metrics.cashFlow.dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip formatter={(value: unknown) => {
                const v = typeof value === 'number' ? value : 0
                return formatCurrency(v)
              }} />
              <Legend />
              <Line type="monotone" dataKey="cashIn" stroke="#10b981" name="Cash In" strokeWidth={2} />
              <Line type="monotone" dataKey="cashOut" stroke="#ef4444" name="Cash Out" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Revenue by Payment Mode */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Revenue by Payment Mode</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={paymentModesData.length > 0 ? paymentModesData : [{name: 'No Data', value: 1}]}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => (percent ?? 0) > 0 ? `${name} ${((percent ?? 0) * 100).toFixed(0)}%` : name}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {paymentModesData.length > 0 ? paymentModesData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                )) : <Cell fill="#ccc" />}
              </Pie>
              <Tooltip formatter={(value: unknown) => formatCurrency(typeof value === 'number' ? value : 0)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Net Cash Flow By Day */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Net Cash Flow by Day</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={metrics.cashFlow.dailyBreakdown}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" tick={{fontSize: 12}} />
              <YAxis tick={{fontSize: 12}} />
              <Tooltip formatter={(value: unknown) => {
                const v = typeof value === 'number' ? value : 0
                return formatCurrency(v)
              }} />
              <Bar dataKey="net" fill="#3b82f6" name="Net Cash Flow" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Top 5 Products by Revenue</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold">Product</th>
                  <th className="px-4 py-2 text-right font-semibold">Revenue</th>
                  <th className="px-4 py-2 text-right font-semibold">Qty Sold</th>
                  <th className="px-4 py-2 text-right font-semibold">Margin %</th>
                </tr>
              </thead>
              <tbody>
                {metrics.topProducts.slice(0, 5).map((product, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-medium">{product.productName}</td>
                    <td className="px-4 py-2 text-right">{formatCompactCurrency(product.revenue)}</td>
                    <td className="px-4 py-2 text-right">{product.unitsSold.toLocaleString()}</td>
                    <td className="px-4 py-2 text-right font-semibold text-green-600">{product.profitMargin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {metrics.predictions.stockAlerts.length > 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-500 rounded p-4 mt-6">
          <div className="flex">
            <div className="shrink-0">
              <svg className="h-5 w-5 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-amber-800">
                <strong>Action Required:</strong> {metrics.predictions.stockAlerts.length} product(s) have critical/low stock levels. Review inventory for: {metrics.predictions.stockAlerts.slice(0, 3).map(a => a.productName).join(', ')} {metrics.predictions.stockAlerts.length > 3 ? '...' : ''}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
