import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

const STOCK_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF', 'FINANCE']

export async function GET() {
  const session = await auth()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const role = session.user.role as string
  if (!STOCK_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const locations = await prisma.location.findMany({
    where: { isActive: true },
    include: {
      stocks: {
        include: { product: { include: { category: true } } },
      },
    },
    orderBy: [{ type: 'asc' }, { name: 'asc' }],
  })
  return NextResponse.json(locations)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const body = await request.json()
  const location = await prisma.location.create({
    data: { name: body.name, code: body.code, type: body.type, address: body.address },
  })
  return NextResponse.json(location, { status: 201 })
}
