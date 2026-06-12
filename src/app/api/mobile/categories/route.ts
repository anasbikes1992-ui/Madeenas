import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const categories = await prisma.category.findMany({
    select: { id: true, name: true, slug: true, color: true, icon: true },
    orderBy: { name: 'asc' },
  })

  return ok({ categories })
}
