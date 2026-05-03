import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '24')

  const where: any = { isActive: true }
  if (category) where.category = { slug: category }
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { design: { contains: search, mode: 'insensitive' } },
    { color: { contains: search, mode: 'insensitive' } },
  ]

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({ orderBy: { name: 'asc' } }),
  ])

  return NextResponse.json({ products, total, categories, page, limit })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const order = await prisma.customerOrder.create({
    data: {
      productId: body.productId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      quantity: parseFloat(body.quantity || '1'),
      colorPreference: body.colorPreference,
      note: body.note,
    },
  })
  return NextResponse.json(order, { status: 201 })
}
