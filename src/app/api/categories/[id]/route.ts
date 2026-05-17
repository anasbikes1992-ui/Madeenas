import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'categories.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const updated = await prisma.category.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.slug && { slug: body.slug }),
      ...(body.color && { color: body.color }),
      ...(body.icon !== undefined && { icon: body.icon || null }),
    },
    include: { _count: { select: { products: true } } },
  })

  await logActivity({
    userId: session.user.id,
    action: 'UPDATE',
    entity: 'Category',
    entityId: id,
    details: `Updated category: ${updated.name}`,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'categories.manage')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  // Check if category has products
  const count = await prisma.product.count({ where: { categoryId: id } })
  if (count > 0) {
    return NextResponse.json(
      { error: `Cannot delete: category has ${count} product(s). Reassign them first.` },
      { status: 409 }
    )
  }

  await prisma.category.delete({ where: { id } })

  await logActivity({
    userId: session.user.id,
    action: 'DELETE',
    entity: 'Category',
    entityId: id,
    details: 'Deleted category',
  })

  return NextResponse.json({ success: true })
}
