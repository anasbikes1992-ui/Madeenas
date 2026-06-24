import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity, createNotification } from '@/lib/audit'
import { logHistoryEvent } from '@/lib/history'
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
  const productId = searchParams.get('productId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: Prisma.StockInWhereInput = {}
  if (locationId) where.locationId = locationId
  if (productId) where.productId = productId

  const [entries, total] = await Promise.all([
    prisma.stockIn.findMany({
      where,
      include: {
        product: { include: { category: true } },
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
  const items = isBatchPayload ? b.items : [{ productId: b.productId, quantity: b.quantity, costPrice: b.costPrice ?? null }]

  if (isBatchPayload && items.length === 0) {
    return NextResponse.json({ error: 'Batch requires at least 1 item line' }, { status: 400 })
  }

  // Check for duplicate products (each product should appear only once)
  if (isBatchPayload) {
    const uniqueProductCount = new Set(items.map((item) => item.productId)).size
    if (uniqueProductCount !== items.length) {
      return NextResponse.json({ error: 'Duplicate products detected. Each item must be a different product.' }, { status: 400 })
    }
  }

  const consolidatedItems = Array.from(
    items.reduce((map, item) => {
      const current = map.get(item.productId)
      map.set(item.productId, {
        productId: item.productId,
        quantity: (current?.quantity ?? 0) + item.quantity,
        costPrice: item.costPrice ?? current?.costPrice ?? null,
      })
      return map
    }, new Map<string, { productId: string; quantity: number; costPrice: number | null }>()).values()
  )

  const [location, products] = await Promise.all([
    prisma.location.findUnique({ where: { id: b.locationId }, select: { id: true, name: true, isActive: true } }),
    prisma.product.findMany({
      where: { id: { in: consolidatedItems.map((item) => item.productId) } },
      select: { id: true, name: true, unit: true, isActive: true },
    }),
  ])

  if (!location || !location.isActive) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  for (const item of consolidatedItems) {
    const product = productMap.get(item.productId)
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }
  }

  const stockIns = await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      consolidatedItems.map((item) =>
        tx.stockIn.create({
          data: {
            productId: item.productId,
            locationId: b.locationId,
            quantity: item.quantity,
            batchNumber: 'batchNumber' in b ? b.batchNumber : undefined,
            supplierId: 'supplierId' in b ? b.supplierId ?? null : null,
            costPrice: item.costPrice,
            note: b.note,
            receivedBy: session.user.id as string,
          },
          include: { product: true, location: true },
        })
      )
    )

    await Promise.all(
      consolidatedItems.map((item) =>
        tx.stock.upsert({
          where: { productId_locationId: { productId: item.productId, locationId: b.locationId } },
          update: { quantity: { increment: item.quantity } },
          create: { productId: item.productId, locationId: b.locationId, quantity: item.quantity },
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
    message: `${consolidatedItems.length} product line(s) received at ${location.name}.`,
    type: 'SUCCESS',
    link: '/admin/inventory',
  })

  await Promise.all(
    stockIns.map((item) =>
      logHistoryEvent({
        entityType: 'INVENTORY',
        entityId: item.id,
        eventType: 'STOCK_IN_RECORDED',
        title: 'Stock-in recorded',
        details: `${item.quantity ?? 'N/A'} ${item.product?.unit ?? 'units'} received at ${item.location?.name ?? b.locationId}`,
        payload: {
          productId: item.productId,
          locationId: item.locationId,
          batchNumber: item.batchNumber,
        },
        createdBy: session.user.id,
      })
    )
  )

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
