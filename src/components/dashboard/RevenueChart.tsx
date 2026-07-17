'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatCurrency } from '@/lib/utils'

export interface TrendPoint {
  date: string
  revenue: number
  count: number
}

function shortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
}

/** Compact axis labels — full rupee amounts would crowd the gridlines. */
function compactAmount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`
  return String(value)
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ payload: TrendPoint }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const point = payload[0].payload
  return (
    <div className="rounded-[var(--radius-sm)] border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 shadow-[var(--shadow-md)]">
      <p className="text-xs text-[var(--text-muted)]">{label && shortDate(label)}</p>
      <p className="text-sm font-semibold text-[var(--text-primary)]">
        {formatCurrency(point.revenue)}
      </p>
      <p className="text-xs text-[var(--text-muted)]">
        {point.count} {point.count === 1 ? 'sale' : 'sales'}
      </p>
    </div>
  )
}

export function RevenueChart({ data }: { data: TrendPoint[] }) {
  const hasRevenue = data.some((d) => d.revenue > 0)

  if (!hasRevenue) {
    return (
      <div className="flex h-[220px] items-center justify-center">
        <p className="text-sm text-[var(--text-muted)]">
          No sales in the last 14 days. Revenue will appear here.
        </p>
      </div>
    )
  }

  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="revenueFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.18} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={shortDate}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
            minTickGap={24}
          />
          <YAxis
            tickFormatter={compactAmount}
            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="var(--primary)"
            strokeWidth={2}
            fill="url(#revenueFill)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
