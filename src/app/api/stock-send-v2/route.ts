import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { stockSendV2CreateSchema } from '@/lib/validations'
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
  const parsed = stockSendV2CreateSchema.safeParse(body)
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

  // Deduplicate by productColorId
  const uniqueColorIds = new Set(data.items.map((i) => i.productColorId))
  if (uniqueColorIds.size !== data.items.length) {
    return NextResponse.json({ error: 'Duplicate product variants in send lines are not allowed' }, { status: 400 })
  }

  const productColorIds = data.items.map((i) => i.productColorId)

  // Load locations, productColors + their stock at source, and parent products
  const [fromLocation, toLocation, productColors, stockVariants] = await Promise.all([
    prisma.location.findUnique({
      where: { id: data.fromLocationId },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.location.findUnique({
      where: { id: data.toLocationId },
      select: { id: true, name: true, isActive: true },
    }),
    prisma.productColor.findMany({
      where: { id: { in: productColorIds }, isActive: true },
      include: {
        variant: {
          include: {
            product: { select: { id: true, name: true, unit: true, isActive: true } },
          },
        },
        color: { select: { code: true } },
      },
    }),
    prisma.stockVariant.findMany({
      where: {
        locationId: data.fromLocationId,
        productColorId: { in: productColorIds },
      },
      select: { productColorId: true, quantity: true },
    }),
  ])

  if (!fromLocation?.isActive) {
    return NextResponse.json({ error: 'Source location not found or inactive' }, { status: 400 })
  }
  if (!toLocation?.isActive) {
    return NextResponse.json({ error: 'Destination location not found or inactive' }, { status: 400 })
  }

  const colorMap = new Map(productColors.map((pc) => [pc.id, pc]))
  const stockMap = new Map(stockVariants.map((sv) => [sv.productColorId, sv.quantity]))

  // Pre-flight validation: check every item exists and has enough stock
  for (const item of data.items) {
    const pc = colorMap.get(item.productColorId)
    if (!pc || !pc.variant.product.isActive) {
      return NextResponse.json({ error: `Product variant not found: ${item.productColorId}` }, { status: 404 })
    }
    const available = stockMap.get(item.productColorId) ?? 0
    if (available < item.quantityDispatched) {
      const label = `${pc.variant.product.name} (${pc.variant.code} / ${pc.color.code})`
      return NextResponse.json(
        { error: `Insufficient stock for ${label}. Available: ${available}` },
        { status: 400 }
      )
    }
  }

  let invoiceDate: Date | null = null
  if (data.invoiceDate?.trim()) {
    const parsed = new Date(data.invoiceDate)
    invoiceDate = isNaN(parsed.getTime()) ? null : parsed
  }

  const now = new Date()
  const transferNo = await generateTransferNo(now)

  let rows
  try {
    rows = await prisma.$transaction(async (tx) => {
      // Re-check stock inside transaction to prevent race conditions
      const liveStocks = await tx.stockVariant.findMany({
        where: { locationId: data.fromLocationId, productColorId: { in: productColorIds } },
        select: { productColorId: true, quantity: true },
      })
      const liveStockMap = new Map(liveStocks.map((sv) => [sv.productColorId, sv.quantity]))

      for (const item of data.items) {
        const available = liveStockMap.get(item.productColorId) ?? 0
        if (available < item.quantityDispatched) {
          throw new Error(`INSUFFICIENT:${item.productColorId}:${available}`)
        }
      }

      // Create one StockOutRequest row per item, linked to productColor
      const created = await Promise.all(
        data.items.map((item) => {
          const pc = colorMap.get(item.productColorId)!
          return tx.stockOutRequest.create({
            data: {
              transferNo,
              flowType: 'SEND_DIRECT',
              // Link to parent product (required by schema) and also to productColor
              productId: pc.variant.product.id,
              productColorId: item.productColorId,
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
        })
      )

      // Decrement StockVariant at source for each item
      await Promise.all(
        data.items.map((item) =>
          tx.stockVariant.upsert({
            where: {
              productColorId_locationId: {
                productColorId: item.productColorId,
                locationId: data.fromLocationId,
              },
            },
            update: { quantity: { decrement: item.quantityDispatched } },
            create: {
              productColorId: item.productColorId,
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
    console.error('[stock-send-v2 POST] transaction error:', error)

    if (message.startsWith('INSUFFICIENT:')) {
      const [, productColorId, available] = message.split(':')
      const pc = colorMap.get(productColorId)
      const label = pc
        ? `${pc.variant.product.name} (${pc.variant.code} / ${pc.color.code})`
        : productColorId
      return NextResponse.json(
        { error: `Insufficient stock for ${label}. Available: ${available}` },
        { status: 400 }
      )
    }

    const displayMessage =
      process.env.NODE_ENV !== 'production' ? message : 'Failed to create direct send'
    return NextResponse.json({ error: displayMessage }, { status: 500 })
  }

  // Post-transaction side effects
  try {
    const destinationUsers = await prisma.user.findMany({
      where: { locationId: data.toLocationId, isActive: true },
      select: { id: true },
    })

    if (destinationUsers.length > 0) {
      await prisma.notification.createMany({
        data: destinationUsers.map((user) => ({
          userId: user.id,
          title: 'New Stock Send In Transit 🚚',
          message: `${transferNo}: Stock dispatched from ${fromLocation.name}. Please acknowledge on receipt.`,
          type: 'INFO',
          link: '/admin/send-stock',
        })),
      })
    }
  } catch (e) {
    console.error('[stock-send-v2 POST] notification error:', e)
  }

  await logActivity({
    userId,
    action: 'SEND_CREATE',
    entity: 'StockOutRequest',
    entityId: rows[0]?.id,
    details: `Created variant direct send ${transferNo} with ${rows.length} lines from ${fromLocation.name} to ${toLocation.name}`,
  })

  await logHistoryEvent({
    entityType: 'STOCK_SEND',
    entityId: transferNo,
    eventType: 'SEND_CREATED',
    title: 'Direct stock send created (variant)',
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
