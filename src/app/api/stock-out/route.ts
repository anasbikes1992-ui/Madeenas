import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { stockOutRequestSchema } from '@/lib/validations'

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

  const where: Prisma.StockOutRequestWhereInput = {}
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
  let effectiveToLocationId = b.toLocationId ?? null

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

  const [fromLocation, toLocation] = await Promise.all([
    prisma.location.findUnique({ where: { id: b.fromLocationId }, select: { id: true, isActive: true } }),
    prisma.location.findUnique({ where: { id: effectiveToLocationId }, select: { id: true, isActive: true } }),
  ])

  if (!fromLocation || !fromLocation.isActive) {
    return NextResponse.json({ error: 'Source location not found' }, { status: 400 })
  }

  if (!toLocation || !toLocation.isActive) {
    return NextResponse.json({ error: 'Destination location not found' }, { status: 400 })
  }

  // Check available stock
  const stock = await prisma.stock.findUnique({
    where: { productId_locationId: { productId: b.productId, locationId: b.fromLocationId } },
  })
  if (!stock || stock.quantity < b.quantityRequested) {
    return NextResponse.json({ error: 'Insufficient stock at selected location' }, { status: 400 })
  }

  let invoiceDate: Date | null = null
  if (b.invoiceDate && String(b.invoiceDate).trim() !== '') {
    const d = new Date(b.invoiceDate)
    invoiceDate = Number.isNaN(d.getTime()) ? null : d
  }

  const stockOut = await prisma.stockOutRequest.create({
    data: {
      productId: b.productId,
      fromLocationId: b.fromLocationId,
      toLocationId: effectiveToLocationId,
      requestedBy: session.user.id as string,
      quantityRequested: b.quantityRequested,
      referenceInvoice: b.referenceInvoice ?? undefined,
      invoiceDate,
      note: b.note,
    },
    include: {
      product: true,
      fromLocation: true,
      toLocation: true,
      requestedByUser: { select: { id: true, name: true } },
    },
  })
  return NextResponse.json(stockOut, { status: 201 })
}
