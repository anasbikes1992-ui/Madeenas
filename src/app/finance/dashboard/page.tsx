'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { DollarSign, TrendingUp, Activity, Wallet } from 'lucide-react'
import { toast } from 'sonner'

type CashFlowData = {
  date: string
  amount: number
}

type FinanceMetrics = {
  revenue: number
  profit: number
  netProfit: number
  cogs: number
  cashFlow: CashFlowData[]
}

export default function FinanceOverviewPage() {
  const [metrics, setMetrics] = useState<FinanceMetrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/analytics?days=30')
        if (!res.ok) throw new Error('Failed to fetch analytics')
        const data = await res.json()
        setMetrics(data.metrics || null)
      } catch (err) {
        toast.error('Could not load finance data')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg font-medium text-slate-500 animate-pulse">Loading Finance Dashboard...</div>
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-lg font-medium text-slate-500">No finance data available.</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-black text-slate-900">Finance Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Financial performance over the last 30 days.</p>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total Revenue */}
        <div className="flex flex-col gap-4 bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Total Revenue</p>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{formatCurrency(metrics.revenue || 0)}</h2>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="flex flex-col gap-4 bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Gross Profit</p>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{formatCurrency(metrics.profit || 0)}</h2>
          </div>
        </div>

        {/* Net Profit */}
        <div className="flex flex-col gap-4 bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">Net Profit</p>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-xl">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{formatCurrency(metrics.netProfit || 0)}</h2>
          </div>
        </div>

        {/* COGS */}
        <div className="flex flex-col gap-4 bg-white p-6 rounded-[1.5rem] shadow-sm border border-slate-200/60">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wider text-slate-500">COGS</p>
            <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-900">{formatCurrency(metrics.cogs || 0)}</h2>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 sm:p-8 rounded-[1.5rem] shadow-sm border border-slate-200/60 mt-8">
        <h3 className="text-lg font-bold text-slate-900 mb-6">Cash Flow Trends</h3>
        <div className="h-[400px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={metrics.cashFlow || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                tickFormatter={(val) => {
                  try {
                    return formatDate(val)
                  } catch {
                    return val
                  }
                }} 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                dy={10}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 12, fill: '#64748b' }}
                tickFormatter={(val) => `${val >= 1000 ? val / 1000 + 'k' : val}`}
              />
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <Tooltip 
                formatter={(value: any) => [formatCurrency(Number(value) || 0), 'Cash Flow']}
                labelFormatter={(label) => {
                  try {
                    return formatDate(label)
                  } catch {
                    return label
                  }
                }}
                contentStyle={{ borderRadius: '1rem', border: '1px solid #e2e8f0', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
              />
              <Area 
                type="monotone" 
                dataKey="amount" 
                stroke="#10b981" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorAmount)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
