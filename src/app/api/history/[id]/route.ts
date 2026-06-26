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

  const entry = await prisma.auditLog.update({
    where: { id },
    data: {
      action: body.eventType || body.action ? String(body.eventType || body.action) : undefined,
      details: body.details || body.payloadJson ? JSON.stringify({ title: body.title, details: body.details, payloadJson: body.payloadJson }) : undefined,
    },
    include: {
      user: { select: { id: true, name: true, role: true, email: true } },
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
  await prisma.auditLog.delete({ where: { id } })

  return NextResponse.json({ success: true })
}
