import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
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
    prisma.product.count({ where: { isActive: true } }),
    prisma.location.count({ where: { isActive: true } }),
    prisma.stockOutRequest.count({ where: { status: 'PENDING' } }),
    prisma.customerOrder.count({ where: { status: 'PENDING' } }),
    prisma.stock.findMany({
      where: {},
      include: { product: true, location: true },
    }).then(stocks =>
      stocks.filter(s => s.quantity > 0 && s.quantity <= s.product.lowStockAt)
    ),
    prisma.stockIn.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { product: { select: { name: true } }, location: { select: { name: true } } },
    }),
    prisma.stockOutRequest.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        product: { select: { name: true } },
        fromLocation: { select: { name: true } },
        requestedByUser: { select: { name: true } },
      },
    }),
    prisma.stock.aggregate({ _sum: { quantity: true } }),
  ])

  return NextResponse.json({
    totalProducts,
    totalLocations,
    pendingRequests,
    newCustomerOrders,
    lowStockCount: lowStockItems.length,
    lowStockItems: lowStockItems.slice(0, 5),
    recentStockIns,
    recentStockOuts,
    totalStockUnits: stockSummary._sum.quantity || 0,
  })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Failed to load dashboard data' }, { status: 500 })
  }
}
