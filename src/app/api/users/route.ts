import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const role = session.user.role as string

  if (!['SUPER_ADMIN', 'ADMIN'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const where: any = {}
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true, name: true, email: true, role: true,
        isActive: true, createdAt: true, location: true, locationId: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.user.count({ where }),
  ])
  return NextResponse.json({ users, total })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['SUPER_ADMIN', 'ADMIN'].includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(body.password || 'password123', 10)

  const user = await prisma.user.create({
    data: {
      name: body.name,
      email: body.email,
      password: passwordHash,
      role: body.role,
      locationId: body.locationId || null,
    },
    select: {
      id: true, name: true, email: true, role: true,
      isActive: true, createdAt: true, locationId: true,
    },
  })
  return NextResponse.json(user, { status: 201 })
}
