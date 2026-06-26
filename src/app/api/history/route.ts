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
  const entityType = searchParams.get('entityType') || searchParams.get('entity') || undefined
  const entityId = searchParams.get('entityId') || undefined
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  const where = {
    ...(entityType ? { entity: entityType } : {}),
    ...(entityId ? { entityId } : {}),
  }

  const [entries, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, role: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.auditLog.count({ where }),
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
  const entry = await prisma.auditLog.create({
    data: {
      entity: String(body.entityType || body.entity || ''),
      entityId: String(body.entityId || ''),
      action: String(body.eventType || body.action || 'MANUAL_ENTRY'),
      details: body.details || body.payloadJson ? JSON.stringify({ title: body.title, details: body.details, payloadJson: body.payloadJson }) : null,
      userId: session.user.id,
    },
    include: {
      user: { select: { id: true, name: true, role: true, email: true } },
    },
  })

  return NextResponse.json(entry, { status: 201 })
}
