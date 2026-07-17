import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { saleCheckoutSchema } from '@/lib/validations'
import { captureApiError } from '@/lib/logger'
import { hasPermission } from '@/lib/permissions'
import { sendInvoiceWhatsAppNotification } from '@/lib/whatsapp'
import { createSale, SaleError } from '@/services/sales.service'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'sales.read', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId')
  const receiptNo = searchParams.get('receiptNo')
  const search = searchParams.get('search')
  const paymentMode = searchParams.get('paymentMode')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const role = session.user.role as string

  const where: Prisma.SaleWhereInput = {}
  if (locationId) where.locationId = locationId
  if (receiptNo) where.receiptNo = receiptNo
  if (paymentMode) where.paymentMode = paymentMode as any
  if (search) {
    where.OR = [
      { receiptNo: { contains: search, mode: 'insensitive' } },
      { customerName: { contains: search, mode: 'insensitive' } },
      { customerPhone: { contains: search, mode: 'insensitive' } },
      { location: { name: { contains: search, mode: 'insensitive' } } },
      { soldBy: { name: { contains: search, mode: 'insensitive' } } },
    ]
  }
  if (dateFrom || dateTo) {
    where.createdAt = {
      ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
      ...(dateTo ? { lte: new Date(`${dateTo}T23:59:59.999Z`) } : {}),
    }
  }
  
  // Shop staff only see their own location's sales
  if (role === 'SHOP_STAFF' || role === 'STORE_KEEPER') {
    if (!session.user.locationId) {
      return NextResponse.json({ error: 'Location not configured for current user' }, { status: 400 })
    }
    where.locationId = session.user.locationId
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        location: true,
        soldBy: { select: { name: true } },
        items: {
          include: { variant: { include: { product: { select: { name: true } } } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ])

  return NextResponse.json({ sales, total })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!hasPermission(role, 'sales.create', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const parsed = saleCheckoutSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid checkout', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }
  const checkout = parsed.data
  const locationId = session.user.locationId

  if (!locationId && !checkout.locationId) {
    return NextResponse.json({ error: 'Location required' }, { status: 400 })
  }

  const finalLocationId = (locationId || checkout.locationId) as string

  try {
    // All pricing, tax, stock, receipt numbering, credit-ledger, and audit
    // logic lives in the unified sale engine (services/sales.service.ts).
    const sale = await createSale({
      locationId: finalLocationId,
      soldById: session.user.id as string,
      items: checkout.items.map((item) => ({
        variantId: item.variantId,
        saleQty: item.saleQty,
        saleUnit: item.saleUnit,
        unitPriceOverride: item.unitPrice,
      })),
      paymentMode: checkout.paymentMode,
      customerName: checkout.customerName,
      customerPhone: checkout.customerPhone,
      isCreditEligible: checkout.isCreditEligible,
      discountAmount: checkout.discountAmount,
      note: checkout.note,
      expectedGrandTotal: checkout.expectedGrandTotal,
      chequeNo: checkout.chequeNo,
      chequeBank: checkout.chequeBank,
      chequeDate: checkout.chequeDate,
    })

    const invoiceUrlBase = process.env.NEXT_PUBLIC_APP_URL
    const invoiceUrl = invoiceUrlBase
      ? `${invoiceUrlBase.replace(/\/$/, '')}/admin/sales?receiptNo=${encodeURIComponent(sale.receiptNo)}`
      : undefined

    const whatsapp = await sendInvoiceWhatsAppNotification({
      receiptNo: sale.receiptNo,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      grandTotal: Number(sale.grandTotal),
      paymentMode: sale.paymentMode,
      createdAt: sale.createdAt,
      invoiceUrl,
    })

    return NextResponse.json({ ...sale, whatsapp }, { status: 201 })
  } catch (error: unknown) {
    captureApiError(error, { route: 'POST /api/sales' })
    if (error instanceof SaleError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    return NextResponse.json({ error: 'Sale transaction failed' }, { status: 500 })
  }
}
