import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { stockOutRequestSchema } from '@/lib/validations'
import { logHistoryEvent } from '@/lib/history'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const locationId = searchParams.get('locationId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const mine = searchParams.get('mine') === '1'
  const assignedToMe = searchParams.get('assignedToMe') === '1'
  const role = session.user.role as string
  const userLocationId = session.user.locationId as string | null

  const where: Prisma.StockOutRequestWhereInput = { flowType: 'REQUEST' }
  if (status) {
    if (status.includes(',')) {
      where.status = { in: status.split(',') }
    } else {
      where.status = status
    }
  }
  if (locationId) where.fromLocationId = locationId

  if (mine) {
    where.requestedBy = session.user.id
  } else if (assignedToMe && userLocationId) {
    where.toLocationId = userLocationId
  } else if (role === 'SHOP_STAFF' || role === 'STORE_KEEPER') {
    // Shop and warehouse operational users only see requests they created
    // or requests directly tied to their assigned location.
    if (!userLocationId) {
      where.requestedBy = session.user.id
    } else {
      where.OR = [
        { requestedBy: session.user.id },
        { fromLocationId: userLocationId },
        { toLocationId: userLocationId },
      ]
    }
  } else if (role === 'CUSTOMER') {
    where.requestedBy = session.user.id
  }

  const [requests, total] = await Promise.all([
    prisma.stockOutRequest.findMany({
      where,
      include: {
        product: { include: { category: true } },
        fromLocation: true,
        toLocation: true,
        requestedByUser: { select: { id: true, name: true, role: true } },
        approvedByUser: { select: { id: true, name: true } },
        financeReviews: { include: { reviewer: { select: { name: true } } } },
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
  if (!hasPermission(role, 'stock.request')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = stockOutRequestSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const b = parsed.data

  const userLocationId = session.user.locationId as string | null
  const isBatchPayload = 'items' in b
  const items = isBatchPayload ? b.items : [{ productId: b.productId, productColorId: b.productColorId, quantityRequested: b.quantityRequested }]

  if (isBatchPayload && items.length === 0) {
    return NextResponse.json({ error: 'Batch requires at least 1 item line' }, { status: 400 })
  }

  // Check for duplicate productColorIds (each variant+color combo should appear only once)
  if (isBatchPayload) {
    const uniqueProductColorCount = new Set(items.map((item) => item.productColorId || item.productId)).size
    if (uniqueProductColorCount !== items.length) {
      return NextResponse.json({ error: 'Duplicate products detected. Each item must be unique.' }, { status: 400 })
    }
  }

  const consolidatedItems = Array.from(
    items.reduce((map, item) => {
      const key = item.productColorId || item.productId
      const current = map.get(key)
      map.set(key, {
        productId: item.productId,
        productColorId: item.productColorId,
        quantityRequested: (current?.quantityRequested ?? 0) + item.quantityRequested,
      })
      return map
    }, new Map<string, { productId: string; productColorId?: string; quantityRequested: number }>()).values()
  )

  let effectiveToLocationId = role === 'SHOP_STAFF' ? userLocationId : b.toLocationId ?? null

  if (!effectiveToLocationId) {
    return NextResponse.json({ error: 'Destination location is required' }, { status: 400 })
  }

  if (role === 'SHOP_STAFF') {
    if (!userLocationId) {
      return NextResponse.json({ error: 'Your account is not assigned to a shop location' }, { status: 400 })
    }
    effectiveToLocationId = userLocationId

    const sourceLocation = await prisma.location.findUnique({
      where: { id: b.fromLocationId },
      select: { id: true, type: true, name: true },
    })

    if (!sourceLocation) {
      return NextResponse.json({ error: 'Selected warehouse was not found' }, { status: 400 })
    }

    if (sourceLocation.type !== 'WAREHOUSE') {
      return NextResponse.json({ error: 'Shop requests must be fulfilled from a warehouse location' }, { status: 400 })
    }

    if (sourceLocation.id === effectiveToLocationId) {
      return NextResponse.json({ error: 'Source and destination locations must be different' }, { status: 400 })
    }
  }

  if (effectiveToLocationId && b.fromLocationId === effectiveToLocationId) {
    return NextResponse.json({ error: 'Source and destination locations must be different' }, { status: 400 })
  }

  // Fetch ProductColor for variant-based items
  const productColorIds = consolidatedItems.filter((item) => item.productColorId).map((item) => item.productColorId!)
  const productIds = consolidatedItems.map((item) => item.productId)

  const [fromLocation, toLocation, products, productColors, stocks, stockVariants] = await Promise.all([
    prisma.location.findUnique({ where: { id: b.fromLocationId }, select: { id: true, isActive: true } }),
    prisma.location.findUnique({ where: { id: effectiveToLocationId }, select: { id: true, isActive: true } }),
    prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true, unit: true, isActive: true, hasVariants: true },
    }),
    productColorIds.length > 0 ? prisma.productColor.findMany({
      where: { id: { in: productColorIds } },
      include: { variant: true, color: true },
    }) : Promise.resolve([]),
    prisma.stock.findMany({
      where: {
        locationId: b.fromLocationId,
        productId: { in: productIds },
      },
      select: { productId: true, quantity: true },
    }),
    productColorIds.length > 0 ? prisma.stockVariant.findMany({
      where: {
        locationId: b.fromLocationId,
        productColorId: { in: productColorIds },
      },
      select: { productColorId: true, quantity: true },
    }) : Promise.resolve([]),
  ])

  if (!fromLocation || !fromLocation.isActive) {
    return NextResponse.json({ error: 'Source location not found' }, { status: 400 })
  }

  if (!toLocation || !toLocation.isActive) {
    return NextResponse.json({ error: 'Destination location not found' }, { status: 400 })
  }

  const productMap = new Map(products.map((product) => [product.id, product]))
  const productColorMap = new Map(productColors.map((pc) => [pc.id, pc]))
  const stockMap = new Map(stocks.map((stock) => [stock.productId, stock.quantity]))
  const stockVariantMap = new Map(stockVariants.map((sv) => [sv.productColorId, sv.quantity]))

  for (const item of consolidatedItems) {
    const product = productMap.get(item.productId)
    if (!product || !product.isActive) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // Check stock availability
    let available = 0
    if (item.productColorId) {
      // Variant-based product
      const productColor = productColorMap.get(item.productColorId)
      if (!productColor || !productColor.isActive) {
        return NextResponse.json({ error: 'Product variant not found' }, { status: 404 })
      }
      available = stockVariantMap.get(item.productColorId) ?? 0
    } else {
      // Regular product
      available = stockMap.get(item.productId) ?? 0
    }

    if (available < item.quantityRequested) {
      return NextResponse.json({ error: `Insufficient stock for ${product.name} at selected location` }, { status: 400 })
    }
  }

  let invoiceDate: Date | null = null
  if (b.invoiceDate && String(b.invoiceDate).trim() !== '') {
    const d = new Date(b.invoiceDate)
    invoiceDate = Number.isNaN(d.getTime()) ? null : d
  }

  const stockOutRequests = await prisma.$transaction(
    consolidatedItems.map((item) =>
      prisma.stockOutRequest.create({
        data: {
          flowType: 'REQUEST',
          productId: item.productId,
          productColorId: item.productColorId || undefined,
          fromLocationId: b.fromLocationId,
          toLocationId: effectiveToLocationId,
          requestedBy: session.user.id as string,
          quantityRequested: item.quantityRequested,
          referenceInvoice: b.referenceInvoice ?? undefined,
          invoiceDate,
          note: b.note,
        },
        include: {
          product: true,
          productColor: { include: { variant: true, color: true } },
          fromLocation: true,
          toLocation: true,
          requestedByUser: { select: { id: true, name: true } },
        },
      })
    )
  )

  await Promise.all(
    stockOutRequests.map((requestRow) =>
      logHistoryEvent({
        entityType: 'STOCK_REQUEST',
        entityId: requestRow.id,
        eventType: 'REQUEST_CREATED',
        title: 'Stock request created',
        details: `${requestRow.quantityRequested ?? 'N/A'} ${requestRow.product?.unit ?? 'units'} requested`,
        payload: {
          fromLocationId: requestRow.fromLocationId,
          toLocationId: requestRow.toLocationId,
          productId: requestRow.productId,
        },
        createdBy: session.user.id as string,
      })
    )
  )

  return NextResponse.json(
    {
      batch: {
        count: stockOutRequests.length,
        items: stockOutRequests,
      },
    },
    { status: 201 }
  )
}
