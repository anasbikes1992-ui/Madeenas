import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { LocationType } from '@prisma/client'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!hasPermission(session.user.role as string, 'locations.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  // ?all=true returns all locations including inactive (used by admin settings)
  const includeAll = searchParams.get('all') === 'true'

  const locations = await prisma.location.findMany({
    where: includeAll ? undefined : { isActive: true },
    include: {
      stocks: {
        include: { variant: { include: { product: { include: { category: true } } } } },
      },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(locations)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'locations.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  const location = await prisma.location.create({
    data: { name: body.name, code: body.code, type: body.type as LocationType, address: body.address },
  })
  return NextResponse.json(location, { status: 201 })
}
