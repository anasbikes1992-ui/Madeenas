import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'])

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [
    thisMonthSales,
    lastMonthSales,
    topProducts,
    salesByLocation,
    recentRequests,
  ] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      _count: { id: true },
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      _count: { id: true },
      where: { createdAt: { gte: lastMonthStart, lte: lastMonthEnd } },
    }),
    prisma.saleItem.groupBy({
      by: ['productId'],
      _sum: { quantity: true, subTotal: true },
      orderBy: { _sum: { subTotal: 'desc' } },
      take: 5,
    }),
    prisma.sale.groupBy({
      by: ['locationId'],
      _sum: { grandTotal: true },
      _count: { id: true },
      orderBy: { _sum: { grandTotal: 'desc' } },
    }),
    prisma.stockOutRequest.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      where: { status: { in: ['PENDING', 'APPROVED'] } },
      include: {
        product: { select: { name: true, sku: true } },
        fromLocation: { select: { name: true } },
        requestedByUser: { select: { name: true } },
      },
    }),
  ])

  // Enrich top products with names
  const productIds = topProducts.map(p => p.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  })

  const locationIds = salesByLocation.map(s => s.locationId)
  const locations = await prisma.location.findMany({
    where: { id: { in: locationIds } },
    select: { id: true, name: true },
  })

  return ok({
    thisMonth: { revenue: thisMonthSales._sum.grandTotal ?? 0, count: thisMonthSales._count.id },
    lastMonth: { revenue: lastMonthSales._sum.grandTotal ?? 0, count: lastMonthSales._count.id },
    topProducts: topProducts.map(p => ({
      ...p,
      product: products.find(pr => pr.id === p.productId),
    })),
    salesByLocation: salesByLocation.map(s => ({
      ...s,
      location: locations.find(l => l.id === s.locationId),
    })),
    recentRequests,
  })
}
