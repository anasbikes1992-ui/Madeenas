import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const actorRole = session.user.role as string
  if (!hasPermission(actorRole, 'users.manage', session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const { useCustomPermissions, permissions } = body

    if (typeof useCustomPermissions !== 'boolean' || !Array.isArray(permissions)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }

    const targetUser = await prisma.user.findUnique({ where: { id } })
    if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        useCustomPermissions,
        permissions
      },
      select: {
        id: true,
        name: true,
        role: true,
        useCustomPermissions: true,
        permissions: true
      }
    })

    return NextResponse.json(updatedUser)
  } catch (error) {
    console.error('Failed to update permissions:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
