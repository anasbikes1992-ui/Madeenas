import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user || !hasPermission(session.user.role as string, 'settings.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { fromUnitId, toUnitId, factor } = await request.json()
    const conversion = await prisma.unitConversion.create({
      data: { fromUnitId, toUnitId, factor: parseFloat(factor) }
    })
    return NextResponse.json(conversion)
  } catch (error: any) {
    if (error.code === 'P2002') {
      return NextResponse.json({ error: 'This conversion already exists' }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to create conversion' }, { status: 500 })
  }
}
