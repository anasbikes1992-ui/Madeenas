import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { CAN_REQUEST_STOCK } from '@/lib/constants'
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

  const where: any = {}
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
  if (!CAN_REQUEST_STOCK.includes(role)) {
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

  if ((role === 'SHOP_STAFF' || role === 'STORE_KEEPER') && session.user.locationId) {
    const userLocationId = session.user.locationId as string
    if (b.fromLocationId !== userLocationId) {
      return NextResponse.json({ error: 'You can only request stock from your assigned location' }, { status: 403 })
    }
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
      toLocationId: b.toLocationId ?? null,
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
