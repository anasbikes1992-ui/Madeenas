import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity, createNotification } from '@/lib/audit'
import { stockInSchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'
import { invalidateInventoryCaches } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'inventory.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')
  const variantId = searchParams.get('variantId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Prisma.StockInWhereInput = {}
  if (locationId) where.locationId = locationId
  if (variantId) where.variantId = variantId

  const [entries, total] = await Promise.all([
    prisma.stockIn.findMany({
      where,
      include: {
        variant: { include: { product: { include: { category: true } } } },
        location: true,
        user: { select: { id: true, name: true, email: true } },
        supplier: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockIn.count({ where }),
  ])
  return NextResponse.json({ entries, total })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'stock.in')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = stockInSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid stock-in', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const b = parsed.data
  const isBatchPayload = 'items' in b
  const items = isBatchPayload ? b.items : [{ 
    variantId: b.variantId, 
    receivedQty: b.receivedQty,
    receivedUnit: b.receivedUnit,
    conversionFactor: b.conversionFactor,
    quantityAddedToStock: b.quantityAddedToStock,
    costPrice: b.costPrice ?? null 
  }]

  if (isBatchPayload && items.length === 0) {
    return NextResponse.json({ error: 'Batch requires at least 1 item line' }, { status: 400 })
  }

  // Check for duplicate products (each product should appear only once)
  if (isBatchPayload) {
    const uniqueVariantCount = new Set(items.map((item) => item.variantId)).size
    if (uniqueVariantCount !== items.length) {
      return NextResponse.json({ error: 'Duplicate variants detected. Each item must be a different variant.' }, { status: 400 })
    }
  }

  const consolidatedItems = Array.from(
    items.reduce((map, item) => {
      const current = map.get(item.variantId)
      map.set(item.variantId, {
        variantId: item.variantId,
        receivedQty: (current?.receivedQty ?? 0) + item.receivedQty,
        receivedUnit: item.receivedUnit,
        conversionFactor: item.conversionFactor,
        quantityAddedToStock: (current?.quantityAddedToStock ?? 0) + item.quantityAddedToStock,
        costPrice: item.costPrice ?? current?.costPrice ?? null,
      })
      return map
    }, new Map<string, { variantId: string; receivedQty: number; receivedUnit: string; conversionFactor: number; quantityAddedToStock: number; costPrice: number | null }>()).values()
  )

  const [location, variants] = await Promise.all([
    prisma.location.findUnique({ where: { id: b.locationId }, select: { id: true, name: true, isActive: true } }),
    prisma.productVariant.findMany({
      where: { id: { in: consolidatedItems.map((item) => item.variantId) } },
      include: { product: true },
    }),
  ])

  if (!location || !location.isActive) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  for (const item of consolidatedItems) {
    const variant = variantMap.get(item.variantId)
    if (!variant || !variant.isActive || !variant.product.isActive) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }
  }

  const stockIns = await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      consolidatedItems.map((item) =>
        tx.stockIn.create({
          data: {
            variantId: item.variantId,
            locationId: b.locationId,
            receivedQty: item.receivedQty,
            receivedUnit: item.receivedUnit,
            conversionFactor: item.conversionFactor,
            quantityAddedToStock: item.quantityAddedToStock,
            batchNumber: 'batchNumber' in b ? b.batchNumber : undefined,
            supplierId: 'supplierId' in b ? b.supplierId ?? null : null,
            costPrice: item.costPrice,
            note: b.note,
            receivedBy: session.user.id as string,
          },
          include: { variant: { include: { product: true } }, location: true },
        })
      )
    )

    await Promise.all(
      consolidatedItems.map((item) =>
        tx.stock.upsert({
          where: { variantId_locationId: { variantId: item.variantId, locationId: b.locationId } },
          update: { quantity: { increment: item.quantityAddedToStock } },
          create: { variantId: item.variantId, locationId: b.locationId, quantity: item.quantityAddedToStock },
        })
      )
    )

    return created
  })

  await logActivity({
    userId: session.user.id,
    action: 'STOCK_IN',
    entity: 'StockIn',
    entityId: stockIns[0]?.id,
    details: `Added ${consolidatedItems.length} item(s) to ${location.name}${'batchNumber' in b && b.batchNumber ? ` (Batch: ${b.batchNumber})` : ''}`,
  })

  await createNotification({
    role: 'ADMIN',
    title: 'New Stock Received 📦',
    message: `${consolidatedItems.length} variant(s) received at ${location.name}.`,
    type: 'SUCCESS',
    link: '/admin/inventory',
  })

  // Invalidate inventory caches
  await invalidateInventoryCaches(b.locationId)

  return NextResponse.json(
    {
      batch: {
        count: stockIns.length,
        items: stockIns,
      },
    },
    { status: 201 }
  )
}
