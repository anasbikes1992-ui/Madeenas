import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { num } from '@/lib/money'
import { hasPermission } from '@/lib/permissions'
import { getSalesAnalytics } from '@/services/sales.service'
import { getTotalReceivables } from '@/services/credit.service'

export const dynamic = 'force-dynamic'

const DAY_MS = 86_400_000
const TREND_DAYS = 14

function startOfDayUTC(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role as string
  // Money figures are gated: not every role that can see stock should see
  // revenue, margin, and receivables.
  const canSeeFinancials = hasPermission(role, 'sales.read', session.user)

  try {
    const now = new Date()
    const todayStart = startOfDayUTC(now)
    const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    const trendStart = new Date(todayStart.getTime() - (TREND_DAYS - 1) * DAY_MS)

    const [
      totalProducts,
      totalLocations,
      pendingRequests,
      newCustomerOrders,
      lowStockItems,
      recentStockIns,
      recentStockOuts,
      stockSummary,
    ] = await Promise.all([
      prisma.product.count({ where: { isActive: true } }).catch(() => 0),
      prisma.location.count({ where: { isActive: true } }).catch(() => 0),
      prisma.stockTransfer.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.customerOrder.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.stock.findMany({
        where: { quantity: { gt: 0 } },
        include: {
          variant: { include: { product: { select: { name: true } } } },
          location: { select: { name: true } },
        },
      }).then(stocks =>
        stocks.filter(s => {
          try {
            const quantity = num(s.quantity)
            return quantity > 0 && quantity <= num(s.variant?.lowStockAt, 10)
          } catch {
            return false
          }
        })
      ).catch(() => []),
      prisma.stockIn.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          variant: { include: { product: { select: { name: true } } } },
          location: { select: { name: true } },
        },
      }).catch(() => []),
      prisma.stockTransfer.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          items: { include: { variant: { include: { product: { select: { name: true } } } } } },
          fromLocation: { select: { name: true } },
          requestedByUser: { select: { name: true } },
        },
      }).catch(() => []),
      prisma.stock.aggregate({ _sum: { quantity: true } }).catch(() => ({ _sum: { quantity: 0 } })),
    ])

    const base = {
      totalProducts: totalProducts ?? 0,
      totalLocations: totalLocations ?? 0,
      pendingRequests: pendingRequests ?? 0,
      newCustomerOrders: newCustomerOrders ?? 0,
      lowStockCount: lowStockItems?.length ?? 0,
      lowStockItems: lowStockItems?.slice(0, 5) ?? [],
      recentStockIns: recentStockIns ?? [],
      recentStockOuts: recentStockOuts ?? [],
      totalStockUnits: num(stockSummary?._sum?.quantity),
    }

    if (!canSeeFinancials) {
      return NextResponse.json({ ...base, financials: null })
    }

    // Profit is real now (it was hardcoded to 0 on every sale before the sale
    // engine was unified), so it is worth surfacing.
    const [today, month, receivables, trendRows, recentSales] = await Promise.all([
      getSalesAnalytics(undefined, todayStart, now),
      getSalesAnalytics(undefined, monthStart, now),
      getTotalReceivables(),
      prisma.sale.findMany({
        where: { deletedAt: null, createdAt: { gte: trendStart } },
        select: { createdAt: true, grandTotal: true },
      }),
      prisma.sale.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          receiptNo: true,
          grandTotal: true,
          paymentMode: true,
          customerName: true,
          createdAt: true,
          location: { select: { name: true } },
        },
      }),
    ])

    // Bucket by day and backfill empty days so the chart has no gaps.
    const buckets = new Map<string, { revenue: number; count: number }>()
    for (let i = 0; i < TREND_DAYS; i++) {
      const key = new Date(trendStart.getTime() + i * DAY_MS).toISOString().slice(0, 10)
      buckets.set(key, { revenue: 0, count: 0 })
    }
    for (const sale of trendRows) {
      const key = sale.createdAt.toISOString().slice(0, 10)
      const bucket = buckets.get(key)
      if (bucket) {
        bucket.revenue += num(sale.grandTotal)
        bucket.count += 1
      }
    }

    return NextResponse.json({
      ...base,
      financials: {
        today: {
          revenue: today.totalSales,
          profit: today.totalProfit,
          salesCount: today.salesCount,
        },
        month: {
          revenue: month.totalSales,
          profit: month.totalProfit,
          salesCount: month.salesCount,
          margin:
            month.totalRevenue > 0
              ? Number(((month.totalProfit / month.totalRevenue) * 100).toFixed(1))
              : 0,
        },
        receivables,
        salesTrend: Array.from(buckets.entries()).map(([date, v]) => ({
          date,
          revenue: Number(v.revenue.toFixed(2)),
          count: v.count,
        })),
        recentSales: recentSales.map((s) => ({
          id: s.id,
          receiptNo: s.receiptNo,
          grandTotal: num(s.grandTotal),
          paymentMode: s.paymentMode,
          customerName: s.customerName,
          locationName: s.location.name,
          createdAt: s.createdAt,
        })),
      },
    })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
