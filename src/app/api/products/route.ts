import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'
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
    // Search across variants for SKU and color
    { variants: { some: { sku: { contains: search, mode: 'insensitive' } } } },
    { variants: { some: { colorName: { contains: search, mode: 'insensitive' } } } },
  ]

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          include: {
            stocks: { include: { location: true } },
          },
        },
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
  const { name, categoryId, description, images, variants } = body

  if (!name || !categoryId) {
    return NextResponse.json(
      { error: 'name and categoryId are required' },
      { status: 400 }
    )
  }

  if (!variants || !Array.isArray(variants) || variants.length === 0) {
    return NextResponse.json(
      { error: 'at least one variant is required' },
      { status: 400 }
    )
  }

  const product = await prisma.product.create({
    data: {
      name,
      categoryId,
      description: description ?? undefined,
      images: images ?? [],
      variants: {
        create: variants.map((v: any) => ({
          sku: v.sku,
          colorName: v.colorName,
          colorHex: v.colorHex || '#6366f1',
          stockUnit: v.stockUnit,
          stockUnitLabel: v.stockUnitLabel,
          altUnit: v.altUnit || null,
          altUnitLabel: v.altUnitLabel || null,
          saleUnit: v.saleUnit,
          saleUnitLabel: v.saleUnitLabel,
          saleToStockFactor: Number(v.saleToStockFactor) || 1.0,
          costPrice: v.costPrice ? Number(v.costPrice) : null,
          salePrice: v.salePrice ? Number(v.salePrice) : null,
          lowStockAt: Number(v.lowStockAt) || 10,
        })),
      },
    },
    include: { category: true, variants: true },
  })

  await logActivity({
    userId: session.user.id,
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    details: `Created product: ${product.name}`,
  })

  return NextResponse.json(product, { status: 201 })
}
