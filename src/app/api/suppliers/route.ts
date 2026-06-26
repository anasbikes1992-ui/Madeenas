import { NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { supplierSchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'products.read', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const suppliers = await prisma.supplier.findMany({
    orderBy: { name: 'asc' },
    include: {
      _count: { select: { stockIns: true } },
    },
  })

  return NextResponse.json(suppliers)
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'suppliers.manage', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = supplierSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid supplier data',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const supplier = await prisma.supplier.create({
      data: parsed.data,
    })

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'Supplier already exists' }, { status: 409 })
    }

    console.error('Supplier creation failed:', error)
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
  }
}