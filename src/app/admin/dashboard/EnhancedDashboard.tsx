/**
 * Admin dashboard.
 *
 * Structure: a KPI row of the figures the owner actually runs the shop on,
 * a revenue trend, then the exceptions that need action (pending transfers,
 * low stock) and recent activity.
 *
 * Profit and receivables are real numbers now — profit was hardcoded to zero
 * on every sale, and customer debt was never recorded at all.
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Clock,
  Package,
  Receipt,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { formatCurrency, formatDate } from '@/lib/utils'
import { StatTile } from '@/components/dashboard/StatTile'
import { Panel, EmptyState } from '@/components/dashboard/Panel'
import { RevenueChart, type TrendPoint } from '@/components/dashboard/RevenueChart'

interface LowStockItem {
  id: string
  quantity: number
  variant?: { sku?: string; product?: { name?: string } }
  location?: { name?: string }
}

interface TransferRequest {
  id: string
  status: string
  createdAt: string
  fromLocation?: { name?: string }
  requestedByUser?: { name?: string }
}

interface RecentSale {
  id: string
  receiptNo: string
  grandTotal: number
  paymentMode: string
  customerName: string | null
  locationName: string
  createdAt: string
}

interface Financials {
  today: { revenue: number; profit: number; salesCount: number }
  month: { revenue: number; profit: number; salesCount: number; margin: number }
  receivables: number
  salesTrend: TrendPoint[]
  recentSales: RecentSale[]
}

interface DashboardStats {
  totalProducts: number
  pendingRequests: number
  newCustomerOrders: number
  lowStockCount: number
  lowStockItems: LowStockItem[]
  recentStockOuts: TransferRequest[]
  /** Null when the signed-in role may not see money figures. */
  financials: Financials | null
}

const STATUS_TONE: Record<string, string> = {
  PENDING: 'bg-[var(--warning-tint)] text-[var(--warning)]',
  APPROVED: 'bg-[var(--primary-tint)] text-[var(--primary)]',
  DISPATCHED: 'bg-[var(--primary-tint)] text-[var(--primary)]',
  RECEIVED: 'bg-[var(--positive-tint)] text-[var(--positive)]',
  CANCELLED: 'bg-[var(--negative-tint)] text-[var(--negative)]',
}

export default function EnhancedDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadStats = useCallback(async () => {
    setError(null)
    setRefreshing(true)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error('Could not load the dashboard.')
      setStats(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the dashboard.')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    void loadStats()
  }, [loadStats])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-56 animate-pulse rounded-[var(--radius-sm)] bg-[var(--surface-muted)]" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-muted)]"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-[var(--radius-lg)] bg-[var(--surface-muted)]" />
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <p className="text-sm text-[var(--text-secondary)]">{error ?? 'No data available.'}</p>
        <button
          onClick={() => void loadStats()}
          className="rounded-[var(--radius-sm)] bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          Retry
        </button>
      </div>
    )
  }

  const { financials } = stats

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-[var(--text-primary)]">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-[var(--text-muted)]">
            {new Date().toLocaleDateString(undefined, {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        <button
          onClick={() => void loadStats()}
          className="inline-flex items-center gap-2 rounded-[var(--radius-sm)] border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* KPI row — money first for roles allowed to see it. */}
      {financials ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Revenue today"
            value={formatCurrency(financials.today.revenue)}
            Icon={Receipt}
            hint={`${financials.today.salesCount} ${
              financials.today.salesCount === 1 ? 'sale' : 'sales'
            }`}
            href="/admin/sales"
          />
          <StatTile
            label="Profit this month"
            value={formatCurrency(financials.month.profit)}
            Icon={TrendingUp}
            hint={`${financials.month.margin}% margin on ${formatCurrency(
              financials.month.revenue
            )}`}
            tone={financials.month.profit >= 0 ? 'positive' : 'negative'}
          />
          <StatTile
            label="Receivables"
            value={formatCurrency(financials.receivables)}
            Icon={Wallet}
            hint={financials.receivables > 0 ? 'Owed by customers' : 'All accounts settled'}
            tone={financials.receivables > 0 ? 'warning' : 'neutral'}
            href="/admin/finance/credit"
          />
          <StatTile
            label="Low stock"
            value={String(stats.lowStockCount)}
            Icon={AlertTriangle}
            hint={stats.lowStockCount > 0 ? 'Items need restocking' : 'Stock levels healthy'}
            tone={stats.lowStockCount > 0 ? 'negative' : 'neutral'}
            href="/admin/inventory"
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Products"
            value={String(stats.totalProducts)}
            Icon={Package}
            hint="Active SKUs"
            href="/admin/products"
          />
          <StatTile
            label="Pending transfers"
            value={String(stats.pendingRequests)}
            Icon={Clock}
            hint={stats.pendingRequests > 0 ? 'Awaiting approval' : 'None waiting'}
            tone={stats.pendingRequests > 0 ? 'warning' : 'neutral'}
            href="/admin/transfers"
          />
          <StatTile
            label="Low stock"
            value={String(stats.lowStockCount)}
            Icon={AlertTriangle}
            hint={stats.lowStockCount > 0 ? 'Items need restocking' : 'Stock levels healthy'}
            tone={stats.lowStockCount > 0 ? 'negative' : 'neutral'}
            href="/admin/inventory"
          />
          <StatTile
            label="Customer orders"
            value={String(stats.newCustomerOrders)}
            Icon={ShoppingBag}
            hint="New inquiries"
            href="/admin/customer-orders"
          />
        </div>
      )}

      {/* Revenue trend + secondary counts */}
      {financials && (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Panel
              title="Revenue"
              subtitle="Last 14 days"
              action={{ label: 'View sales', href: '/admin/sales' }}
            >
              <RevenueChart data={financials.salesTrend} />
            </Panel>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <StatTile
              label="Products"
              value={String(stats.totalProducts)}
              Icon={Package}
              hint="Active SKUs"
              href="/admin/products"
            />
            <StatTile
              label="Pending transfers"
              value={String(stats.pendingRequests)}
              Icon={Clock}
              hint={stats.pendingRequests > 0 ? 'Awaiting approval' : 'None waiting'}
              tone={stats.pendingRequests > 0 ? 'warning' : 'neutral'}
              href="/admin/transfers"
            />
            <StatTile
              label="Customer orders"
              value={String(stats.newCustomerOrders)}
              Icon={ShoppingBag}
              hint="New inquiries"
              href="/admin/customer-orders"
            />
          </div>
        </div>
      )}

      {/* Exceptions and activity */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel
          title="Low stock"
          subtitle={
            stats.lowStockCount === 0
              ? 'Nothing needs restocking'
              : `${stats.lowStockCount} ${stats.lowStockCount === 1 ? 'item' : 'items'} below threshold`
          }
          action={{ label: 'Inventory', href: '/admin/inventory' }}
        >
          {stats.lowStockItems.length === 0 ? (
            <EmptyState message="Stock levels are healthy." />
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {stats.lowStockItems.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {item.variant?.product?.name ?? 'Unknown product'}
                    </p>
                    <p className="truncate text-xs text-[var(--text-muted)]">
                      {item.variant?.sku} · {item.location?.name}
                    </p>
                  </div>
                  <span className="shrink-0 rounded-full bg-[var(--negative-tint)] px-2.5 py-1 text-xs font-semibold text-[var(--negative)]">
                    {item.quantity} left
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {financials ? (
          <Panel
            title="Recent sales"
            subtitle="Latest receipts"
            action={{ label: 'All sales', href: '/admin/sales' }}
          >
            {financials.recentSales.length === 0 ? (
              <EmptyState message="No sales recorded yet." />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {financials.recentSales.map((sale) => (
                  <li key={sale.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                        {sale.receiptNo}
                      </p>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {sale.customerName ?? 'Walk-in'} · {sale.locationName} ·{' '}
                        {sale.paymentMode.replace('_', ' ').toLowerCase()}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-[var(--text-primary)]">
                      {formatCurrency(sale.grandTotal)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        ) : (
          <Panel
            title="Pending transfers"
            subtitle={`${stats.pendingRequests} awaiting action`}
            action={{ label: 'All transfers', href: '/admin/transfers' }}
          >
            {stats.recentStockOuts.length === 0 ? (
              <EmptyState message="No transfer requests." />
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {stats.recentStockOuts.map((req) => (
                  <li key={req.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <Link
                        href={`/admin/transfers/${req.id}`}
                        className="truncate text-sm font-medium text-[var(--text-primary)] hover:text-[var(--primary)]"
                      >
                        {req.requestedByUser?.name ?? 'Unknown'}
                      </Link>
                      <p className="truncate text-xs text-[var(--text-muted)]">
                        {req.fromLocation?.name} · {formatDate(req.createdAt)}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
                        STATUS_TONE[req.status] ?? STATUS_TONE.PENDING
                      }`}
                    >
                      {req.status.toLowerCase()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        )}
      </div>
    </div>
  )
}
