import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'

const STAFF_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SHOP_STAFF', 'STORE_KEEPER', 'FINANCE'])

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!STAFF_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  const userId = user.sub ?? (user as any).id ?? ''
  const where = {
    OR: [
      { userId },
      { role },
      { role: null as string | null, userId: null as string | null },
    ],
  }

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        isRead: true,
        createdAt: true,
        userId: true,
        role: true,
      },
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { ...where, isRead: false } }),
  ])

  return ok({ notifications, total, unreadCount, page, limit })
}

export async function PATCH(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!STAFF_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const userId = user.sub ?? (user as any).id ?? ''
  // Mark all as read for this user/role
  await prisma.notification.updateMany({
    where: {
      isRead: false,
      OR: [
        { userId },
        { role },
      ],
    },
    data: { isRead: true },
  })

  return ok({ message: 'All notifications marked as read' })
}
