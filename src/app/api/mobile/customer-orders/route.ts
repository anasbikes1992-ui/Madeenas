import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { verifyMobileToken } from '@/lib/mobile-auth'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])

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
            product: { select: { name: true, sku: true } },
          },
        },
      },
    }),
    prisma.customerOrder.count({ where }),
  ])

  return ok({ orders, total, page, limit })
}
