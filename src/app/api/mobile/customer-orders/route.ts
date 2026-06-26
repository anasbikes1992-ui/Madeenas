import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get('limit') ?? '10', 10)))
  const status = searchParams.get('status') ?? ''

  const where: Record<string, unknown> = {}
  if (status) where.status = status

  const [orders, total] = await Promise.all([
    prisma.customerOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        customer: { select: { name: true, email: true } },
        items: {
          include: {
            variant: { 
              select: { 
                sku: true,
                product: { select: { name: true } }
              } 
            },
          },
        },
      },
    }),
    prisma.customerOrder.count({ where }),
  ])

  return ok({ orders, total, page, limit })
}
