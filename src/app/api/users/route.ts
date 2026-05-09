import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { adminCreateUserPasswordSchema } from '@/lib/validations'

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
  const actorRole = session.user.role as string
  if (!['SUPER_ADMIN', 'ADMIN'].includes(actorRole)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const targetRole = String(body.role || '')

  if (!body.name || !body.email || !targetRole) {
    return NextResponse.json({ error: 'Name, email, and role are required' }, { status: 400 })
  }

  if (actorRole === 'ADMIN' && ['SUPER_ADMIN', 'ADMIN'].includes(targetRole)) {
    return NextResponse.json({ error: 'Admins can only create operational users' }, { status: 403 })
  }

  if (['STORE_KEEPER', 'SHOP_STAFF'].includes(targetRole) && !body.locationId) {
    return NextResponse.json({ error: 'Location is required for shop and warehouse users' }, { status: 400 })
  }

  const pwdParsed = adminCreateUserPasswordSchema.safeParse(body.password)
  if (!pwdParsed.success) {
    const msg = pwdParsed.error.issues.map((i) => i.message).join('; ')
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  const bcrypt = await import('bcryptjs')
  const passwordHash = await bcrypt.hash(pwdParsed.data, 10)

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
