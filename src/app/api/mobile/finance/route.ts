import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { verifyMobileToken } from '@/lib/mobile-auth'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FINANCE'])

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
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [monthlySales, pendingReviews, recentReviews] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { grandTotal: true, totalAmount: true },
      _count: { id: true },
      where: { createdAt: { gte: monthStart } },
    }),
    prisma.financeReview.count({ where: { status: 'PENDING' } }),
    prisma.financeReview.findMany({
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: {
        stockOut: {
          include: {
            product: { select: { name: true, sku: true } },
            fromLocation: { select: { name: true } },
          },
        },
        reviewer: { select: { name: true } },
      },
    }),
  ])

  return ok({
    summary: {
      monthlyRevenue: monthlySales._sum.grandTotal ?? 0,
      monthlySalesCount: monthlySales._count.id,
      pendingReviews,
    },
    recentReviews,
  })
}
