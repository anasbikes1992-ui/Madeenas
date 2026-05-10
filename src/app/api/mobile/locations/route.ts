import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { verifyMobileToken } from '@/lib/mobile-auth'

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

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') ?? '' // WAREHOUSE | SHOP | ''

  const where: Record<string, unknown> = { isActive: true }
  if (type) where.type = type

  const locations = await prisma.location.findMany({
    where,
    select: { id: true, name: true, code: true, type: true, address: true },
    orderBy: { name: 'asc' },
  })

  return ok({ locations })
}
