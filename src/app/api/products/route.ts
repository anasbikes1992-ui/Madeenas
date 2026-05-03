import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = { isActive: true }
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
  const role = session.user.role as string
  if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const product = await prisma.product.create({
    data: {
      name: body.name,
      design: body.design,
      color: body.color,
      colorHex: body.colorHex || '#000000',
      sku: body.sku,
      categoryId: body.categoryId,
      unit: body.unit || 'meters',
      description: body.description,
      images: JSON.stringify(body.images || []),
      barcodeType: body.barcodeType || 'CODE128',
      lowStockAt: parseFloat(body.lowStockAt || '10'),
      costPrice: body.costPrice ? parseFloat(body.costPrice) : null,
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
