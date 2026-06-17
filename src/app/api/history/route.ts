import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isSuperAdmin(role: string | null | undefined) {
  return role === 'SUPER_ADMIN'
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entityType') || undefined
  const entityId = searchParams.get('entityId') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  const where = {
    ...(entityType ? { entityType } : {}),
    ...(entityId ? { entityId } : {}),
  }

  const [entries, total] = await Promise.all([
    prisma.entityHistory.findMany({
      where,
      include: {
        createdByUser: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.entityHistory.count({ where }),
  ])

  return NextResponse.json({ entries, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const entry = await prisma.entityHistory.create({
    data: {
      entityType: String(body.entityType || ''),
      entityId: String(body.entityId || ''),
      eventType: String(body.eventType || 'MANUAL_ENTRY'),
      title: String(body.title || 'Manual history event'),
      details: body.details ? String(body.details) : null,
      payloadJson: body.payloadJson ? String(body.payloadJson) : null,
      createdBy: session.user.id,
    },
    include: {
      createdByUser: { select: { id: true, name: true, role: true, email: true } },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
