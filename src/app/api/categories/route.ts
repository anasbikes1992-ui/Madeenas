import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'
import { categorySchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'products.read', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const categories = await prisma.category.findMany({
    include: {
      _count: { select: { products: true } },
    },
    orderBy: { name: 'asc' },
  })
  return NextResponse.json(categories)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'categories.manage', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = categorySchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid category data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const category = await prisma.category.create({
      data: parsed.data,
    })

    await logActivity({
      userId: session.user.id,
      action: 'CREATE',
      entity: 'Category',
      entityId: category.id,
      details: `Created category: ${category.name}`,
    })

    return NextResponse.json(category, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Category name or slug already exists' }, { status: 409 })
    }

    console.error('Category creation failed:', error)
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 })
  }
}
