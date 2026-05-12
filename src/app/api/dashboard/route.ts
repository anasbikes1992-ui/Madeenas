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
      prisma.product.count({ where: { isActive: true } }).catch(() => 0),
      prisma.location.count({ where: { isActive: true } }).catch(() => 0),
      prisma.stockOutRequest.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.customerOrder.count({ where: { status: 'PENDING' } }).catch(() => 0),
      prisma.stock.findMany({
        where: { quantity: { gt: 0 } },
        include: { 
          product: { select: { name: true, lowStockAt: true } }, 
          location: { select: { name: true } } 
        },
      }).then(stocks =>
        stocks.filter(s => {
          try {
            return s.quantity > 0 && s.quantity <= (s.product?.lowStockAt ?? 10)
          } catch {
            return false
          }
        })
      ).catch(() => []),
      prisma.stockIn.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { 
          product: { select: { name: true } }, 
          location: { select: { name: true } } 
        },
      }).catch(() => []),
      prisma.stockOutRequest.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          product: { select: { name: true } },
          fromLocation: { select: { name: true } },
          requestedByUser: { select: { name: true } },
        },
      }).catch(() => []),
      prisma.stock.aggregate({ _sum: { quantity: true } }).catch(() => ({ _sum: { quantity: 0 } })),
    ])

    return NextResponse.json({
      totalProducts: totalProducts ?? 0,
      totalLocations: totalLocations ?? 0,
      pendingRequests: pendingRequests ?? 0,
      newCustomerOrders: newCustomerOrders ?? 0,
      lowStockCount: lowStockItems?.length ?? 0,
      lowStockItems: lowStockItems?.slice(0, 5) ?? [],
      recentStockIns: recentStockIns ?? [],
      recentStockOuts: recentStockOuts ?? [],
      totalStockUnits: stockSummary?._sum?.quantity ?? 0,
    })
  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ 
      error: 'Failed to load dashboard data',
      details: err instanceof Error ? err.message : String(err)
    }, { status: 500 })
  }
}
