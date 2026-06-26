import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF', 'FINANCE']

type JournalEntry = {
  id: string
  type: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_ADJUSTMENT'
  variantId: string
  productName: string
  sku: string
  unit: string
  fromLocation: string | null
  toLocation: string | null
  quantity: number
  date: string
  actor: string
  note: string | null
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role as string
  if (!ALLOWED_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const variantId = searchParams.get('variantId') || undefined
  const locationId = searchParams.get('locationId') || undefined
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  const [stockIns, transfers, adjustments] = await Promise.all([
    prisma.stockIn.findMany({
      where: {
        ...(variantId ? { variantId } : {}),
        ...(locationId ? { locationId } : {}),
      },
      include: {
        variant: { include: { product: { select: { name: true } } } },
        location: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.stockTransfer.findMany({
      where: {
        status: { in: ['DISPATCHED', 'RECEIVED'] },
        ...(variantId ? { items: { some: { variantId } } } : {}),
        ...(locationId ? { OR: [{ fromLocationId: locationId }, { toLocationId: locationId }] } : {}),
      },
      include: {
        items: {
          where: variantId ? { variantId } : undefined,
          include: { variant: { include: { product: { select: { name: true } } } } }
        },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        requestedByUser: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    }),
    prisma.stockAdjustment.findMany({
      where: {
        ...(variantId ? { variantId } : {}),
        ...(locationId ? { locationId } : {}),
      },
      include: {
        user: { select: { name: true } },
        variant: { include: { product: { select: { name: true } } } },
        location: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
  ])

  const entries: JournalEntry[] = [
    ...stockIns.map((entry) => ({
      id: entry.id,
      type: 'STOCK_IN' as const,
      variantId: entry.variantId,
      productName: entry.variant.product.name,
      sku: entry.variant.sku,
      unit: entry.variant.stockUnit,
      fromLocation: null,
      toLocation: entry.location.name,
      quantity: entry.quantityAddedToStock ?? entry.receivedQty,
      date: entry.createdAt.toISOString(),
      actor: entry.user.name,
      note: entry.note ?? null,
    })),
    ...transfers.flatMap((transfer) => transfer.items.map((item) => ({
      id: item.id,
      type: 'STOCK_OUT' as const,
      variantId: item.variantId,
      productName: item.variant.product.name,
      sku: item.variant.sku,
      unit: item.variant.stockUnit,
      fromLocation: transfer.fromLocation.name,
      toLocation: transfer.toLocation.name,
      quantity: -(item.dispatchedQty || item.requestedQty || 0),
      date: (transfer.receivedAt || transfer.dispatchedAt || transfer.updatedAt).toISOString(),
      actor: transfer.requestedByUser.name,
      note: transfer.note ?? null,
    }))),
    ...adjustments.map((entry) => ({
      id: entry.id,
      type: 'STOCK_ADJUSTMENT' as const,
      variantId: entry.variantId,
      productName: entry.variant.product.name,
      sku: entry.variant.sku,
      unit: entry.variant.stockUnit,
      fromLocation: entry.location.name,
      toLocation: entry.location.name,
      quantity: entry.delta,
      date: entry.createdAt.toISOString(),
      actor: entry.user.name,
      note: entry.note || entry.reason || null,
    })),
  ]

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ entries: entries.slice(0, limit) })
}
