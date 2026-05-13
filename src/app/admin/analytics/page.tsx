'use client'

import { useEffect, useState } from 'react'
import { PremiumCard } from '@/components/ui/PremiumCard'
import { NavyButton } from '@/components/ui/NavyButton'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

interface BusinessMetrics {
  revenue: {
    current: number
    previous: number
    growthRate: number
  }
  profit: {
    totalCost: number
    totalRevenue: number
    grossProfit: number
    netProfit: number
    grossMargin: number
    netMargin: number
  }
  inventory: {
    totalValue: number
    turnoverRate: number
    stockouts: number
    deadStockValue: number
  }
  customers: {
    total: number
    new: number
    repeatRate: number
    avgOrderValue: number
    lifetimeValue: number
  }
  sales: {
    totalOrders: number
    conversionRate: number
  }
  topProducts: Array<{
    productName: string
    unitsSold: number
    revenue: number
  }>
  topCustomers: Array<{
    customerName: string
    totalSpent: number
    orderCount: number
  }>
  cashFlow: {
    daily: Array<{
      date: string
      inflow: number
      outflow: number
      net: number
    }>
  }
  insights: {
    stockAlerts: Array<{
      productName: string
      currentStock: number
      severity: string
    }>
    demandForecast: Array<{
      productName: string
      predictedDemand: number
    }>
  }
}

export default function AnalyticsPage() {
  const [metrics, setMetrics] = useState<BusinessMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [dateRange, setDateRange] = useState('30')
  const [dateRangeLabel, setDateRangeLabel] = useState('Last 30 Days')

  useEffect(() => {
    fetchMetrics()
  }, [dateRange])

  const fetchMetrics = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/analytics?days=${dateRange}`)
      const data = await response.json()
      if (data.success) {
        setMetrics(data.metrics)
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
      notation: 'compact',
      compactDisplay: 'short',
    }).format(amount)
  }

  const formatCurrencyFull = (amount: number) => {
    return new Intl.NumberFormat('en-LK', {
      style: 'currency',
      currency: 'LKR',
    }).format(amount)
  }

  const COLORS = ['#1A237E', '#3F51B5', '#F59E0B', '#D4AF37', '#9FA8DA']

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-navy-50 p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-12 bg-navy-200 rounded-lg w-1/3"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-navy-100 rounded-lg"></div>
            ))}
          </div>
          <div className="h-96 bg-navy-100 rounded-lg"></div>
        </div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-navy-50 p-8">
        <div className="text-center py-12">
          <p className="text-navy-600">Failed to load analytics</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-slate-50 to-navy-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-heading font-bold text-navy-900 mb-2">
              Business Analytics
            </h1>
            <p className="text-navy-600">
              Comprehensive insights and performance metrics
            </p>
          </div>
          <div className="flex gap-2">
            {[
              { value: '7', label: 'Last 7 Days' },
              { value: '30', label: 'Last 30 Days' },
              { value: '90', label: 'Last 90 Days' },
            ].map((range) => (
              <NavyButton
                key={range.value}
                variant={dateRange === range.value ? 'solid' : 'outline'}
                size="sm"
                onClick={() => {
                  setDateRange(range.value)
                  setDateRangeLabel(range.label)
                }}
              >
                {range.label}
              </NavyButton>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Revenue */}
          <PremiumCard hover glow>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-navy-600 mb-1">
                  Revenue
                </p>
                <p className="text-3xl font-bold text-navy-900">
                  {formatCurrency(metrics.revenue.current)}
                </p>
              </div>
              <div className="text-4xl">💰</div>
            </div>
            <div
              className={`flex items-center gap-2 text-sm ${
                metrics.revenue.growthRate >= 0
                  ? 'text-green-600'
                  : 'text-red-600'
              }`}
            >
              <span className="text-2xl">
                {metrics.revenue.growthRate >= 0 ? '↑' : '↓'}
              </span>
              <span className="font-semibold">
                {Math.abs(metrics.revenue.growthRate).toFixed(1)}%
              </span>
              <span className="text-navy-500">vs previous period</span>
            </div>
          </PremiumCard>

          {/* Profit */}
          <PremiumCard hover glow>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-navy-600 mb-1">
                  Net Profit
                </p>
                <p className="text-3xl font-bold text-gold-600">
                  {formatCurrency(metrics.profit.netProfit)}
                </p>
              </div>
              <div className="text-4xl">📊</div>
            </div>
            <div className="flex items-center gap-2 text-sm text-navy-600">
              <span className="font-semibold">
                {metrics.profit.netMargin.toFixed(1)}% margin
              </span>
            </div>
          </PremiumCard>

          {/* Customers */}
          <PremiumCard hover glow>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-navy-600 mb-1">
                  Customers
                </p>
                <p className="text-3xl font-bold text-navy-900">
                  {metrics.customers.total}
                </p>
              </div>
              <div className="text-4xl">👥</div>
            </div>
            <div className="flex items-center gap-2 text-sm text-green-600">
              <span className="text-2xl">+</span>
              <span className="font-semibold">{metrics.customers.new}</span>
              <span className="text-navy-500">new customers</span>
            </div>
          </PremiumCard>

          {/* Inventory */}
          <PremiumCard hover glow>
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-sm font-medium text-navy-600 mb-1">
                  Inventory Value
                </p>
                <p className="text-3xl font-bold text-navy-900">
                  {formatCurrency(metrics.inventory.totalValue)}
                </p>
              </div>
              <div className="text-4xl">📦</div>
            </div>
            <div className="flex items-center gap-2 text-sm text-navy-600">
              <span className="font-semibold">
                {metrics.inventory.turnoverRate.toFixed(1)}x turnover
              </span>
            </div>
          </PremiumCard>
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Cash Flow Chart */}
          <PremiumCard>
            <h3 className="text-xl font-heading font-semibold text-navy-900 mb-6">
              Cash Flow Analysis
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={metrics.cashFlow.daily}>
                <defs>
                  <linearGradient id="colorInflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3F51B5" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3F51B5" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#F59E0B" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF6" />
                <XAxis
                  dataKey="date"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  stroke="#CBD5E1"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  stroke="#CBD5E1"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E8EAF6',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="inflow"
                  stroke="#3F51B5"
                  fillOpacity={1}
                  fill="url(#colorInflow)"
                  name="Inflow"
                />
                <Area
                  type="monotone"
                  dataKey="outflow"
                  stroke="#F59E0B"
                  fillOpacity={1}
                  fill="url(#colorOutflow)"
                  name="Outflow"
                />
              </AreaChart>
            </ResponsiveContainer>
          </PremiumCard>

          {/* Profit Breakdown */}
          <PremiumCard>
            <h3 className="text-xl font-heading font-semibold text-navy-900 mb-6">
              Profit Breakdown
            </h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={[
                  {
                    name: 'Profit Analysis',
                    'Gross Profit': metrics.profit.grossProfit,
                    'Net Profit': metrics.profit.netProfit,
                    'Total Cost': metrics.profit.totalCost,
                  },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E8EAF6" />
                <XAxis
                  dataKey="name"
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  stroke="#CBD5E1"
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  stroke="#CBD5E1"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #E8EAF6',
                    borderRadius: '8px',
                  }}
                />
                <Legend />
                <Bar dataKey="Gross Profit" fill="#3F51B5" />
                <Bar dataKey="Net Profit" fill="#F59E0B" />
                <Bar dataKey="Total Cost" fill="#9FA8DA" />
              </BarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div>
                <p className="text-sm text-navy-600 mb-1">Gross Margin</p>
                <p className="text-2xl font-bold text-navy-900">
                  {metrics.profit.grossMargin.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-navy-600 mb-1">Net Margin</p>
                <p className="text-2xl font-bold text-gold-600">
                  {metrics.profit.netMargin.toFixed(1)}%
                </p>
              </div>
            </div>
          </PremiumCard>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Top Products */}
          <PremiumCard>
            <h3 className="text-xl font-heading font-semibold text-navy-900 mb-6">
              Top Selling Products
            </h3>
            <div className="space-y-4">
              {metrics.topProducts.slice(0, 5).map((product, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-navy-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                      style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                    >
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-navy-900">
                        {product.productName}
                      </p>
                      <p className="text-sm text-navy-600">
                        {product.unitsSold} units sold
                      </p>
                    </div>
                  </div>
                  <p className="text-gold-600 font-semibold">
                    {formatCurrency(product.revenue)}
                  </p>
                </div>
              ))}
            </div>
          </PremiumCard>

          {/* Top Customers */}
          <PremiumCard>
            <h3 className="text-xl font-heading font-semibold text-navy-900 mb-6">
              Top Customers
            </h3>
            <div className="space-y-4">
              {metrics.topCustomers.slice(0, 5).map((customer, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-4 bg-gold-50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gold-500 flex items-center justify-center text-white font-bold">
                      {idx + 1}
                    </div>
                    <div>
                      <p className="font-medium text-navy-900">
                        {customer.customerName}
                      </p>
                      <p className="text-sm text-navy-600">
                        {customer.orderCount} orders
                      </p>
                    </div>
                  </div>
                  <p className="text-gold-600 font-semibold">
                    {formatCurrency(customer.totalSpent)}
                  </p>
                </div>
              ))}
            </div>
          </PremiumCard>
        </div>

        {/* Stock Alerts */}
        {metrics.insights.stockAlerts.length > 0 && (
          <PremiumCard className="mb-8">
            <h3 className="text-xl font-heading font-semibold text-navy-900 mb-6">
              ⚠️ Stock Alerts
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {metrics.insights.stockAlerts.map((alert, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-lg border-l-4 ${
                    alert.severity === 'CRITICAL'
                      ? 'bg-red-50 border-red-500'
                      : alert.severity === 'HIGH'
                      ? 'bg-orange-50 border-orange-500'
                      : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <p className="font-medium text-navy-900 mb-1">
                    {alert.productName}
                  </p>
                  <p className="text-sm text-navy-600">
                    Stock: {alert.currentStock} units
                  </p>
                  <span
                    className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                      alert.severity === 'CRITICAL'
                        ? 'bg-red-100 text-red-700'
                        : alert.severity === 'HIGH'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    {alert.severity}
                  </span>
                </div>
              ))}
            </div>
          </PremiumCard>
        )}

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <PremiumCard>
            <h4 className="text-sm font-medium text-navy-600 mb-3">
              Customer Metrics
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-navy-500">Repeat Rate</p>
                <p className="text-2xl font-bold text-navy-900">
                  {metrics.customers.repeatRate.toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Avg Order Value</p>
                <p className="text-xl font-semibold text-gold-600">
                  {formatCurrencyFull(metrics.customers.avgOrderValue)}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Lifetime Value</p>
                <p className="text-xl font-semibold text-navy-700">
                  {formatCurrencyFull(metrics.customers.lifetimeValue)}
                </p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard>
            <h4 className="text-sm font-medium text-navy-600 mb-3">
              Inventory Health
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-navy-500">Turnover Rate</p>
                <p className="text-2xl font-bold text-navy-900">
                  {metrics.inventory.turnoverRate.toFixed(1)}x
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Stockouts</p>
                <p className="text-xl font-semibold text-red-600">
                  {metrics.inventory.stockouts}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Dead Stock Value</p>
                <p className="text-xl font-semibold text-navy-700">
                  {formatCurrency(metrics.inventory.deadStockValue)}
                </p>
              </div>
            </div>
          </PremiumCard>

          <PremiumCard>
            <h4 className="text-sm font-medium text-navy-600 mb-3">
              Sales Performance
            </h4>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-navy-500">Total Orders</p>
                <p className="text-2xl font-bold text-navy-900">
                  {metrics.sales.totalOrders}
                </p>
              </div>
              <div>
                <p className="text-xs text-navy-500">Conversion Rate</p>
                <p className="text-xl font-semibold text-green-600">
                  {metrics.sales.conversionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </PremiumCard>
        </div>
      </div>
    </div>
  )
}
