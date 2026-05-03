import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { CAN_REQUEST_STOCK } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const locationId = searchParams.get('locationId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
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
  // Shop staff only see their own location requests
  if (role === 'SHOP_STAFF' || role === 'STORE_KEEPER') {
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

  // Check available stock
  const stock = await prisma.stock.findUnique({
    where: { productId_locationId: { productId: body.productId, locationId: body.fromLocationId } },
  })
  if (!stock || stock.quantity < parseFloat(body.quantityRequested)) {
    return NextResponse.json({ error: 'Insufficient stock at selected location' }, { status: 400 })
  }

  const stockOut = await prisma.stockOutRequest.create({
    data: {
      productId: body.productId,
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId || null,
      requestedBy: session.user.id as string,
      quantityRequested: parseFloat(body.quantityRequested),
      referenceInvoice: body.referenceInvoice,
      invoiceDate: body.invoiceDate ? new Date(body.invoiceDate) : null,
      note: body.note,
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
