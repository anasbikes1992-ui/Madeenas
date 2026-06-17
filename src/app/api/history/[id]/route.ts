import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

function isSuperAdmin(role: string | null | undefined) {
  return role === 'SUPER_ADMIN'
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const entry = await prisma.entityHistory.update({
    where: { id },
    data: {
      eventType: body.eventType ? String(body.eventType) : undefined,
      title: body.title ? String(body.title) : undefined,
      details: body.details === undefined ? undefined : body.details ? String(body.details) : null,
      payloadJson: body.payloadJson === undefined ? undefined : body.payloadJson ? String(body.payloadJson) : null,
    },
    include: {
      createdByUser: { select: { id: true, name: true, role: true, email: true } },
    },
  })

  return NextResponse.json(entry)
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isSuperAdmin(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  await prisma.entityHistory.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
