import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

function getVisibilityWhere(userId: string, role: string) {
  return {
    OR: [
      { userId },
      { role },
      { userId: null, role: null },
    ],
  }
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const unreadOnly = searchParams.get('unreadOnly') === '1'
  const visibilityWhere = getVisibilityWhere(session.user.id as string, session.user.role as string)
  const where = unreadOnly
    ? { ...visibilityWhere, isRead: false }
    : visibilityWhere

  const [notifications, total, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.notification.count({ where }),
    prisma.notification.count({
      where: {
        ...visibilityWhere,
        isRead: false,
      },
    }),
  ])

  return NextResponse.json({ notifications, unreadCount, total, page, limit })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await request.json()
  const visibilityWhere = getVisibilityWhere(session.user.id as string, session.user.role as string)
  
  if (id) {
    const result = await prisma.notification.updateMany({
      where: {
        id,
        isRead: false,
        ...visibilityWhere,
      },
      data: { isRead: true }
    })

    if (result.count === 0) {
      return NextResponse.json({ error: 'Notification not found' }, { status: 404 })
    }
  } else {
    await prisma.notification.updateMany({
      where: {
        isRead: false,
        ...visibilityWhere,
      },
      data: { isRead: true }
    })
  }

  return NextResponse.json({ success: true })
}
