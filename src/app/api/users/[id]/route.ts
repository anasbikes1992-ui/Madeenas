import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const actorRole = session.user.role as string
  if (!['SUPER_ADMIN', 'ADMIN'].includes(actorRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  // ADMIN cannot promote to ADMIN/SUPER_ADMIN
  if (actorRole === 'ADMIN' && body.role && ['SUPER_ADMIN', 'ADMIN'].includes(body.role)) {
    return NextResponse.json({ error: 'Admins cannot assign this role' }, { status: 403 })
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.role && { role: body.role }),
      ...(body.locationId !== undefined && { locationId: body.locationId || null }),
      ...(body.isActive !== undefined && { isActive: body.isActive }),
    },
    select: { id: true, name: true, email: true, role: true, isActive: true, locationId: true, location: true, createdAt: true },
  })
  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const actorRole = session.user.role as string
  if (!['SUPER_ADMIN', 'ADMIN'].includes(actorRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Prevent self-deletion
  if (id === session.user.id) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 })
  }

  // Deactivate instead of hard delete to preserve audit trail
  const updated = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: { id: true, isActive: true },
  })
  return NextResponse.json(updated)
}
