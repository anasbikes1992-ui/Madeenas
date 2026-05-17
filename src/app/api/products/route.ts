import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'
import { productCreateSchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'products.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Prisma.ProductWhereInput = { isActive: true }
  if (category) where.categoryId = category
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { sku: { contains: search, mode: 'insensitive' } },
    { design: { contains: search, mode: 'insensitive' } },
  ]

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        stocks: { include: { location: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return NextResponse.json({ products, total, page, limit })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'products.create')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = productCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid product', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const d = parsed.data
  const product = await prisma.product.create({
    data: {
      name: d.name,
      design: d.design,
      color: d.color,
      colorHex: d.colorHex || '#000000',
      sku: d.sku,
      categoryId: d.categoryId,
      unit: d.unit || 'meters',
      description: d.description ?? undefined,
      images: JSON.stringify(d.images ?? []),
      barcodeType: d.barcodeType || 'CODE128',
      lowStockAt: d.lowStockAt,
      costPrice: d.costPrice ?? null,
    },
    include: { category: true },
  })

  await logActivity({
    userId: session.user.id,
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    details: `Created product: ${product.name} (SKU: ${product.sku})`
  })

  return NextResponse.json(product, { status: 201 })
}
