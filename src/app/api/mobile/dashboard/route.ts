import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { verifyMobileToken } from '@/lib/mobile-auth'

const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SHOP_STAFF', 'STORE_KEEPER', 'FINANCE'])

async function resolveUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null
  try {
    return await verifyMobileToken(token)
  } catch {
    return null
  }
}

export async function GET(request: NextRequest) {
  const user = await resolveUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!STAFF_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  const [
    totalProducts,
    lowStockCount,
    pendingRequestsCount,
    todaySales,
    unreadNotifications,
    pendingOrdersCount,
  ] = await Promise.all([
    prisma.product.count({ where: { isActive: true } }),
    prisma.stock.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      having: { quantity: { _sum: { lte: 0 } } },
    }).then(r => r.length),
    prisma.stockOutRequest.count({ where: { status: 'PENDING' } }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      _count: { id: true },
      where: { createdAt: { gte: todayStart } },
    }),
    prisma.notification.count({
      where: {
        isRead: false,
        OR: [
          { userId: user.sub },
          { role },
          { role: null, userId: null },
        ],
      },
    }),
    prisma.customerOrder.count({ where: { status: 'PENDING' } }),
  ])

  // Recent 5 sales
  const recentSales = await prisma.sale.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    include: {
      location: { select: { name: true } },
      soldBy: { select: { name: true } },
    },
  })

  return ok({
    stats: {
      totalProducts,
      lowStockCount,
      pendingRequestsCount,
      todaySalesAmount: todaySales._sum.grandTotal ?? 0,
      todaySalesCount: todaySales._count.id,
      unreadNotifications,
      pendingOrdersCount,
    },
    recentSales: recentSales.map(s => ({
      id: s.id,
      receiptNo: s.receiptNo,
      grandTotal: s.grandTotal,
      location: s.location.name,
      soldBy: s.soldBy.name,
      createdAt: s.createdAt,
    })),
  })
}
