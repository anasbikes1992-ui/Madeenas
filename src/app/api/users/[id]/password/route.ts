import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { adminCreateUserPasswordSchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'
import { logActivity, createNotification } from '@/lib/audit'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const actorRole = session.user.role as string
  if (!hasPermission(actorRole, 'users.resetPassword', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const body = await request.json()

  const parsed = adminCreateUserPasswordSchema.safeParse(body?.password)
  if (!parsed.success) {
    const msg = parsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const targetUser = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, role: true } })
  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (id === session.user.id && body?.force !== true) {
    return NextResponse.json(
      { error: 'Use profile password change flow for your own account' },
      { status: 400 }
    )
  }

  const passwordHash = await bcrypt.hash(parsed.data, 10)
  await prisma.user.update({
    where: { id },
    data: { password: passwordHash },
  })

  await logActivity({
    userId: session.user.id,
    action: 'RESET_PASSWORD',
    entity: 'User',
    entityId: id,
    details: `Password reset by ${session.user.name ?? 'super admin'} for ${targetUser.name}`,
  })

  await createNotification({
    userId: id,
    title: 'Password Reset',
    message: 'Your account password was reset by a Super Admin. Please log in again.',
    type: 'WARNING',
    link: '/login',
  })

  return NextResponse.json({ success: true })
}
