import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF', 'FINANCE']

type JournalEntry = {
  id: string
  type: 'STOCK_IN' | 'STOCK_OUT' | 'STOCK_ADJUSTMENT'
  productId: string
  productName: string
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
  const productId = searchParams.get('productId') || undefined
  const locationId = searchParams.get('locationId') || undefined
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)))

  const [stockIns, stockOuts, adjustments] = await Promise.all([
    prisma.stockIn.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(locationId ? { locationId } : {}),
      },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        location: { select: { name: true } },
        user: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.stockOutRequest.findMany({
      where: {
        status: { in: ['DISPATCHED', 'ACKNOWLEDGED'] },
        ...(productId ? { productId } : {}),
        ...(locationId ? { OR: [{ fromLocationId: locationId }, { toLocationId: locationId }] } : {}),
      },
      include: {
        product: { select: { id: true, name: true, unit: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        requestedByUser: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    }),
    prisma.stockAdjustment.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(locationId ? { locationId } : {}),
      },
      include: {
        adjustedByUser: { select: { name: true } },
        product: { select: { id: true, name: true, unit: true } },
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
      productId: entry.product.id,
      productName: entry.product.name,
      unit: entry.product.unit,
      fromLocation: null,
      toLocation: entry.location.name,
      quantity: entry.quantity,
      date: entry.createdAt.toISOString(),
      actor: entry.user.name,
      note: entry.note ?? null,
    })),
    ...stockOuts.map((entry) => ({
      id: entry.id,
      type: 'STOCK_OUT' as const,
      productId: entry.product.id,
      productName: entry.product.name,
      unit: entry.product.unit,
      fromLocation: entry.fromLocation.name,
      toLocation: entry.toLocation?.name ?? null,
      quantity: -(entry.quantityApproved || entry.quantityRequested),
      date: (entry.acknowledgedAt || entry.dispatchedAt || entry.updatedAt).toISOString(),
      actor: entry.requestedByUser.name,
      note: entry.note ?? null,
    })),
    ...adjustments.map((entry) => ({
      id: entry.id,
      type: 'STOCK_ADJUSTMENT' as const,
      productId: entry.product.id,
      productName: entry.product.name,
      unit: entry.product.unit,
      fromLocation: entry.location.name,
      toLocation: entry.location.name,
      quantity: entry.delta,
      date: entry.createdAt.toISOString(),
      actor: entry.adjustedByUser.name,
      note: entry.note || entry.reason || null,
    })),
  ]

  entries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return NextResponse.json({ entries: entries.slice(0, limit) })
}
