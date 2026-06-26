import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const units = await prisma.unit.findMany({
    orderBy: { name: 'asc' },
    include: {
      conversionsFrom: { include: { toUnit: true } },
      conversionsTo: { include: { fromUnit: true } }
    }
  })
  return NextResponse.json(units)
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { name, abbreviation } = await request.json()
    const unit = await prisma.unit.create({
      data: { name, abbreviation }
    })
    return NextResponse.json(unit)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'Unit with this name or abbreviation already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create unit' }, { status: 500 })
  }
}
