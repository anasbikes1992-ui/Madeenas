import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const notifications = await prisma.notification.findMany({
    where: {
      OR: [
        { userId: session.user.id },
        { role: session.user.role },
        { userId: null, role: null }
      ]
    },
    orderBy: { createdAt: 'desc' },
    take: 20
  })

  const unreadCount = await prisma.notification.count({
    where: {
      isRead: false,
      OR: [
        { userId: session.user.id },
        { role: session.user.role },
        { userId: null, role: null }
      ]
    }
  })

  return NextResponse.json({ notifications, unreadCount })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Mark all as read if no ID provided in body (optional refinement)
  const { id } = await request.json()
  
  if (id) {
    await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    })
  } else {
    await prisma.notification.updateMany({
      where: {
        isRead: false,
        OR: [
          { userId: session.user.id },
          { role: session.user.role }
        ]
      },
      data: { isRead: true }
    })
  }

  return NextResponse.json({ success: true })
}
