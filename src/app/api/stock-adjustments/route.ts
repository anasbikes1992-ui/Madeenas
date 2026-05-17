import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createNotification, logActivity } from '@/lib/audit'
import { z } from 'zod'
import { hasPermission } from '@/lib/permissions'

const adjustmentSchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().min(1),
  countedQuantity: z.coerce.number(),
  note: z.string().trim().max(500).optional(),
  reason: z.string().trim().max(120).optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(session.user.role as string, 'stock.adjust')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))
  const productId = searchParams.get('productId') || undefined
  const locationId = searchParams.get('locationId') || undefined

  const adjustments = await prisma.stockAdjustment.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(locationId ? { locationId } : {}),
    },
    include: {
      adjustedByUser: { select: { id: true, name: true, role: true } },
      product: { select: { id: true, name: true, sku: true, unit: true } },
      location: { select: { id: true, name: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })

  return NextResponse.json({ adjustments })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(session.user.role as string, 'stock.adjust')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = adjustmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid adjustment payload' }, { status: 400 })
  }

  const { productId, locationId, countedQuantity, note, reason } = parsed.data

  const [product, location, currentStock] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId }, select: { id: true, name: true, unit: true, isActive: true } }),
    prisma.location.findUnique({ where: { id: locationId }, select: { id: true, name: true, isActive: true } }),
    prisma.stock.findUnique({ where: { productId_locationId: { productId, locationId } } }),
  ])

  if (!product || !product.isActive) {
    return NextResponse.json({ error: 'Product not found' }, { status: 404 })
  }

  if (!location || !location.isActive) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const previousQuantity = currentStock?.quantity ?? 0
  const delta = countedQuantity - previousQuantity

  const updated = await prisma.$transaction(async (tx) => {
    const stockRecord = await tx.stock.upsert({
      where: { productId_locationId: { productId, locationId } },
      update: { quantity: countedQuantity },
      create: { productId, locationId, quantity: countedQuantity },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        location: { select: { id: true, name: true } },
      },
    })

    await tx.stockAdjustment.create({
      data: {
        productId,
        locationId,
        previousQuantity,
        countedQuantity,
        delta,
        reason: reason ?? null,
        note: note ?? null,
        adjustedBy: session.user.id,
      },
    })

    return stockRecord
  })

  const direction = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'no change'
  const details = [
    `Adjusted ${product.name} at ${location.name}`,
    `Prev: ${previousQuantity} ${product.unit}`,
    `Counted: ${countedQuantity} ${product.unit}`,
    `Delta: ${delta} ${product.unit} (${direction})`,
    reason ? `Reason: ${reason}` : null,
    note ? `Note: ${note}` : null,
  ]
    .filter(Boolean)
    .join(' | ')

  await logActivity({
    userId: session.user.id,
    action: 'STOCK_ADJUSTMENT',
    entity: 'Stock',
    entityId: updated.id,
    details,
  })

  await createNotification({
    title: 'Stock Balanced / Adjusted',
    message: `${product.name} at ${location.name} was adjusted by ${delta} ${product.unit}.`,
    type: 'WARNING',
    link: '/admin/inventory',
  })

  return NextResponse.json({
    stock: updated,
    previousQuantity,
    countedQuantity,
    delta,
  })
}
