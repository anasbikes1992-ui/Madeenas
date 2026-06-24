import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { stockSendCreateSchema } from '@/lib/validations'
import { logActivity, createNotification } from '@/lib/audit'
import { logHistoryEvent } from '@/lib/history'

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

async function generateTransferNo(now: Date): Promise<string> {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const dayStart = startOfDay(now)

  const dailyCount = await prisma.stockOutRequest.count({
    where: {
      flowType: 'SEND_DIRECT',
      createdAt: { gte: dayStart },
    },
  })

  return `TRN-${y}${m}${d}-${String(dailyCount + 1).padStart(4, '0')}`
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const role = session.user.role as string
  const userLocationId = session.user.locationId as string | null
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1', 10)
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

  const where: Prisma.StockOutRequestWhereInput = { flowType: 'SEND_DIRECT' }
  if (status) where.status = status.includes(',') ? { in: status.split(',') } : status

  if (['STORE_KEEPER', 'SHOP_STAFF'].includes(role)) {
    if (!userLocationId) {
      where.requestedBy = session.user.id
    } else {
      where.OR = [
        { requestedBy: session.user.id },
        { fromLocationId: userLocationId },
        { toLocationId: userLocationId },
      ]
    }
  }

  const [requests, total] = await Promise.all([
    prisma.stockOutRequest.findMany({
      where,
      include: {
        product: { include: { category: true } },
        productColor: {
          include: {
            variant: { select: { code: true, design: true } },
            color: { select: { code: true, name: true, hexValue: true } },
          },
        },
        fromLocation: true,
        toLocation: true,
        requestedByUser: { select: { id: true, name: true, role: true } },
        dispatchedByUser: { select: { id: true, name: true } },
        receivedByUser: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockOutRequest.count({ where }),
  ])

  return NextResponse.json({ requests, total })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!hasPermission(role, 'stock.dispatch')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = session.user.id as string | undefined
  if (!userId) {
    return NextResponse.json({ error: 'Invalid session — missing user ID' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = stockSendCreateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid send payload', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const data = parsed.data
  if (data.fromLocationId === data.toLocationId) {
    return NextResponse.json({ error: 'Source and destination must be different' }, { status: 400 })
  }

  const uniqueCount = new Set(data.items.map((item) => item.productId)).size
  if (uniqueCount !== data.items.length) {
    return NextResponse.json({ error: 'Duplicate products in send lines are not allowed' }, { status: 400 })
  }

  const productIds = data.items.map((item) => item.productId)
  const [fromLocation, toLocation, products, stocks] = await Promise.all([
    prisma.location.findUnique({ where: { id: data.fromLocationId }, select: { id: true, name: true, isActive: true } }),
    prisma.location.findUnique({ where: { id: data.toLocationId }, select: { id: true, name: true, isActive: true } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, unit: true, isActive: true } }),
    prisma.stock.findMany({
      where: { locationId: data.fromLocationId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    }),
  ])

  if (!fromLocation || !fromLocation.isActive) {
    return NextResponse.json({ error: 'Source location not found' }, { status: 400 })
  }
  if (!toLocation || !toLocation.isActive) {
    return NextResponse.json({ error: 'Destination location not found' }, { status: 400 })
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  const stockMap = new Map(stocks.map((stock) => [stock.productId, stock.quantity]))
  for (const item of data.items) {
    const product = productMap.get(item.productId)
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const available = stockMap.get(item.productId) ?? 0
    if (available < item.quantityDispatched) {
      return NextResponse.json(
        { error: `Insufficient stock for ${product.name}. Available: ${available}` },
        { status: 400 }
      )
    }
  }

  let invoiceDate: Date | null = null
  if (data.invoiceDate && String(data.invoiceDate).trim() !== '') {
    const parsedDate = new Date(data.invoiceDate)
    invoiceDate = Number.isNaN(parsedDate.getTime()) ? null : parsedDate
  }

  const now = new Date()
  const transferNo = await generateTransferNo(now)

  let rows
  try {
    rows = await prisma.$transaction(async (tx) => {
      const sourceStocks = await tx.stock.findMany({
        where: { locationId: data.fromLocationId, productId: { in: productIds } },
        select: { productId: true, quantity: true },
      })
      const sourceStockMap = new Map(sourceStocks.map((stock) => [stock.productId, stock.quantity]))
      for (const item of data.items) {
        const available = sourceStockMap.get(item.productId) ?? 0
        if (available < item.quantityDispatched) {
          throw new Error(`INSUFFICIENT:${item.productId}:${available}`)
        }
      }

      const created = await Promise.all(
        data.items.map((item) =>
          tx.stockOutRequest.create({
            data: {
              transferNo,
              flowType: 'SEND_DIRECT',
              productId: item.productId,
              fromLocationId: data.fromLocationId,
              toLocationId: data.toLocationId,
              requestedBy: userId,
              dispatchedBy: userId,
              quantityRequested: item.quantityDispatched,
              quantityApproved: item.quantityDispatched,
              quantityDispatched: item.quantityDispatched,
              status: 'IN_TRANSIT',
              dispatchedAt: now,
              referenceInvoice: data.referenceInvoice ?? null,
              invoiceDate,
              note: data.note ?? null,
            },
            include: {
              product: true,
              fromLocation: true,
              toLocation: true,
              requestedByUser: { select: { id: true, name: true } },
            },
          })
        )
      )

      // Use upsert so we don't fail if the stock record somehow needs creating
      await Promise.all(
        data.items.map((item) =>
          tx.stock.upsert({
            where: { productId_locationId: { productId: item.productId, locationId: data.fromLocationId } },
            update: { quantity: { decrement: item.quantityDispatched } },
            create: {
              productId: item.productId,
              locationId: data.fromLocationId,
              quantity: 0,
            },
          })
        )
      )

      return created
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[stock-send POST] transaction error:', error)
    if (message.startsWith('INSUFFICIENT:')) {
      const [, productId, available] = message.split(':')
      const product = productMap.get(productId)
      return NextResponse.json(
        { error: `Insufficient stock for ${product?.name || productId}. Available: ${available}` },
        { status: 400 }
      )
    }
    // Surface the actual DB error message to help debug
    const displayMessage = process.env.NODE_ENV !== 'production' ? message : 'Failed to create direct send'
    return NextResponse.json({ error: displayMessage }, { status: 500 })
  }

  // Post-transaction side effects — failures here must not affect the committed transaction
  let destinationUsers: { id: string }[] = []
  try {
    destinationUsers = await prisma.user.findMany({
      where: { locationId: data.toLocationId, isActive: true },
      select: { id: true },
    })
  } catch (e) {
    console.error('[stock-send POST] destination users lookup error:', e)
  }

  if (destinationUsers.length > 0) {
    try {
      await prisma.notification.createMany({
        data: destinationUsers.map((user) => ({
          userId: user.id,
          title: 'New Stock Send In Transit 🚚',
          message: `${transferNo}: Stock dispatched from ${fromLocation.name}. Please acknowledge on receipt.`,
          type: 'INFO',
          link: '/admin/send-stock',
        })),
      })
    } catch (e) {
      console.error('[stock-send POST] notification error:', e)
    }
  }

  await logActivity({
    userId,
    action: 'SEND_CREATE',
    entity: 'StockOutRequest',
    entityId: rows[0]?.id,
    details: `Created direct send ${transferNo} with ${rows.length} lines from ${fromLocation.name} to ${toLocation.name}`,
  })

  await logHistoryEvent({
    entityType: 'STOCK_SEND',
    entityId: transferNo,
    eventType: 'SEND_CREATED',
    title: 'Direct stock send created',
    details: `Lines: ${rows.length}, source: ${fromLocation.name}, destination: ${toLocation.name}`,
    payload: {
      transferNo,
      fromLocationId: data.fromLocationId,
      toLocationId: data.toLocationId,
      items: data.items,
    },
    createdBy: userId,
  })

  await createNotification({
    role: 'ADMIN',
    title: 'Direct Send Created',
    message: `${transferNo} has been dispatched to ${toLocation.name}.`,
    type: 'SUCCESS',
    link: '/admin/send-stock',
  })

  return NextResponse.json({ batch: { count: rows.length, transferNo, items: rows } }, { status: 201 })
}
