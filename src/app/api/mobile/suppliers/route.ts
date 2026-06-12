import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER'])

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) {
    return fail('Forbidden', 403, 'FORBIDDEN')
  }

  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      contact: true,
      phone: true,
      email: true,
    },
    orderBy: { name: 'asc' },
  })

  return ok({ suppliers })
}
