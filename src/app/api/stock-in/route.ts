import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity, createNotification } from '@/lib/audit'
import { stockInSchema } from '@/lib/validations'
import { hasPermission } from '@/lib/permissions'

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
  const qty = b.quantity

  // Create stock-in record
  const stockIn = await prisma.stockIn.create({
    data: {
      productId: b.productId,
      locationId: b.locationId,
      quantity: qty,
      batchNumber: b.batchNumber,
      supplierId: b.supplierId ?? null,
      costPrice: b.costPrice ?? null,
      note: b.note,
      receivedBy: session.user.id as string,
    },
    include: { product: true, location: true }
  })

  // Upsert stock level
  await prisma.stock.upsert({
    where: { productId_locationId: { productId: b.productId, locationId: b.locationId } },
    update: { quantity: { increment: qty } },
    create: { productId: b.productId, locationId: b.locationId, quantity: qty },
  })

  // Audit Log
  await logActivity({
    userId: session.user.id,
    action: 'STOCK_IN',
    entity: 'StockIn',
    entityId: stockIn.id,
    details: `Added ${qty} ${stockIn.product.unit} to ${stockIn.location.name}. Batch: ${b.batchNumber || 'N/A'}`
  })

  // Notify Admins about stock arrival
  await createNotification({
    role: 'ADMIN',
    title: 'New Stock Received 📦',
    message: `${qty} units of ${stockIn.product.name} received at ${stockIn.location.name}.`,
    type: 'SUCCESS',
    link: '/admin/inventory'
  })

  return NextResponse.json(stockIn, { status: 201 })
}
