import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { createNotification, logActivity } from '@/lib/audit'
import { z } from 'zod'
import { hasPermission } from '@/lib/permissions'

const adjustmentSchema = z.object({
  variantId: z.string().min(1),
  locationId: z.string().min(1),
  countedQuantity: z.coerce.number(),
  note: z.string().trim().max(500).optional(),
  reason: z.enum(['STOCKTAKE', 'DAMAGE', 'THEFT', 'WRITE_OFF', 'CORRECTION', 'EXPIRY', 'OTHER']).optional().default('CORRECTION'),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!hasPermission(session.user.role as string, 'stock.adjust', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)))
  const variantId = searchParams.get('variantId') || undefined
  const locationId = searchParams.get('locationId') || undefined

  const adjustments = await prisma.stockAdjustment.findMany({
    where: {
      ...(variantId ? { variantId } : {}),
      ...(locationId ? { locationId } : {}),
    },
    include: {
      user: { select: { id: true, name: true, role: true } },
      variant: { include: { product: { select: { id: true, name: true } } } },
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

  if (!hasPermission(session.user.role as string, 'stock.adjust', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = adjustmentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid adjustment payload', details: parsed.error.flatten() }, { status: 400 })
  }

  const { variantId, locationId, countedQuantity, note, reason } = parsed.data

  const [variant, location, currentStock] = await Promise.all([
    prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } }),
    prisma.location.findUnique({ where: { id: locationId }, select: { id: true, name: true, isActive: true } }),
    prisma.stock.findUnique({ where: { variantId_locationId: { variantId, locationId } } }),
  ])

  if (!variant || !variant.isActive || !variant.product.isActive) {
    return NextResponse.json({ error: 'Variant or Product not found/inactive' }, { status: 404 })
  }

  if (!location || !location.isActive) {
    return NextResponse.json({ error: 'Location not found' }, { status: 404 })
  }

  const previousQuantity = currentStock?.quantity ?? 0
  const delta = countedQuantity - previousQuantity

  const updated = await prisma.$transaction(async (tx) => {
    const stockRecord = await tx.stock.upsert({
      where: { variantId_locationId: { variantId, locationId } },
      update: { quantity: countedQuantity },
      create: { variantId, locationId, quantity: countedQuantity },
      include: {
        variant: { include: { product: { select: { id: true, name: true } } } },
        location: { select: { id: true, name: true } },
      },
    })

    await tx.stockAdjustment.create({
      data: {
        variantId,
        locationId,
        previousQuantity,
        countedQuantity,
        delta,
        reason: reason as any,
        note: note ?? null,
        adjustedBy: session.user.id,
      },
    })

    return stockRecord
  })

  const direction = delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'no change'
  const details = [
    `Adjusted ${variant.product.name} (${variant.sku}) at ${location.name}`,
    `Prev: ${previousQuantity} ${variant.stockUnit}`,
    `Counted: ${countedQuantity} ${variant.stockUnit}`,
    `Delta: ${delta} ${variant.stockUnit} (${direction})`,
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
    message: `${variant.product.name} at ${location.name} was adjusted by ${delta} ${variant.stockUnit}.`,
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
