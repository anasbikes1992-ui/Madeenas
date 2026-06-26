import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { saleCheckoutSchema } from '@/lib/validations'
import { captureApiError } from '@/lib/logger'
import { hasPermission } from '@/lib/permissions'
import { sendInvoiceWhatsAppNotification } from '@/lib/whatsapp'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'sales.read')) {
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
  if (!hasPermission(role, 'sales.create')) {
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
    // Perform Sale creation and Stock deduction in a transaction
    const sale = await prisma.$transaction(async (tx) => {
      // 1. Verify stock availability
      for (const item of checkout.items) {
        const stockQtyNeeded = item.saleQty * item.saleToStockFactor
        const stock = await tx.stock.findUnique({
          where: { variantId_locationId: { variantId: item.variantId, locationId: finalLocationId } }
        })

        if (!stock || stock.quantity < stockQtyNeeded) {
          throw new Error(`Insufficient stock for variant ID: ${item.variantId}`)
        }
      }

      // 2. Handle Customer & Credit Eligibility
      let customerId = null
      if (checkout.customerPhone) {
        const updateData: { name?: string; isCreditEligible?: boolean } = {}
        if (checkout.customerName) updateData.name = checkout.customerName
        if (checkout.isCreditEligible !== undefined) updateData.isCreditEligible = checkout.isCreditEligible
        
        const customer = await tx.customer.upsert({
          where: { phone: checkout.customerPhone },
          update: Object.keys(updateData).length > 0 ? updateData : { isCreditEligible: false },
          create: { 
            name: checkout.customerName || 'Unknown',
            phone: checkout.customerPhone,
            isCreditEligible: checkout.isCreditEligible || false
          }
        })
        customerId = customer.id
        
        if (checkout.paymentMode === 'CREDIT' && !customer.isCreditEligible) {
          throw new Error(`Customer ${customer.name} is not eligible for credit.`)
        }
      } else if (checkout.paymentMode === 'CREDIT') {
        throw new Error('Customer phone number is required for credit sales.')
      }

      // 3. Create the Sale record
      const receiptNo = `REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
      
      const subTotal = checkout.items.reduce((s, i) => s + i.subTotal, 0)
      const taxRate = 18
      const taxAmount = subTotal * (taxRate / 100)
      const discountAmount = checkout.discountAmount || 0
      const calculatedGrandTotal = subTotal + taxAmount - discountAmount

      const newSale = await tx.sale.create({
        data: {
          receiptNo,
          locationId: finalLocationId,
          soldById: session.user.id as string,
          customerId,
          customerName: checkout.customerName,
          customerPhone: checkout.customerPhone,
          discountAmount: discountAmount,
          subTotal: subTotal,
          taxRate: taxRate,
          taxAmount: taxAmount,
          grandTotal: checkout.grandTotal || calculatedGrandTotal,
          paymentMode: checkout.paymentMode as any,
          note: checkout.note,
          items: {
            create: checkout.items.map((item) => {
              const itemTax = item.subTotal * (taxRate / 100)
              const stockQtyDeducted = item.saleQty * item.saleToStockFactor
              return {
                variantId: item.variantId,
                saleUnit: item.saleUnit,
                saleQty: item.saleQty,
                saleToStockFactor: item.saleToStockFactor,
                stockQtyDeducted: stockQtyDeducted,
                unitPrice: item.unitPrice,
                subTotal: item.subTotal,
                taxRate: taxRate,
                taxAmount: itemTax,
                total: item.subTotal + itemTax,
                costAtSale: 0, // Should be fetched from variant
                profitAmount: 0 // Will be calculated after costAtSale is updated
              }
            })
          }
        },
        include: { items: true }
      })

      // 4. Deduct stock and create audit logs
      for (const item of checkout.items) {
        const stockQtyDeducted = item.saleQty * item.saleToStockFactor
        await tx.stock.update({
          where: { variantId_locationId: { variantId: item.variantId, locationId: finalLocationId } },
          data: { quantity: { decrement: stockQtyDeducted } }
        })

        await tx.auditLog.create({
          data: {
            userId: session.user.id as string,
            action: 'SALE_DEDUCTION',
            entity: 'Stock',
            entityId: item.variantId,
            details: `Sold ${item.saleQty} ${item.saleUnit} in receipt ${receiptNo}`
          }
        })
      }

      return newSale
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
    const message = error instanceof Error ? error.message : 'Sale transaction failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
