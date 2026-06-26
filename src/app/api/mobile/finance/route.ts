import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'FINANCE'])

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const [monthlySales] = await Promise.all([
    prisma.sale.aggregate({
      _sum: { grandTotal: true },
      _count: { id: true },
      where: { createdAt: { gte: monthStart } },
    }),
  ])
  const pendingReviews = 0
  const recentReviews: any[] = []

  return ok({
    summary: {
      monthlyRevenue: monthlySales._sum.grandTotal ?? 0,
      monthlySalesCount: monthlySales._count.id,
      pendingReviews,
    },
    recentReviews,
  })
}
