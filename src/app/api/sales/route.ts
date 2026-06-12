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
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const role = session.user.role as string

  const where: Prisma.SaleWhereInput = {}
  if (locationId) where.locationId = locationId
  if (receiptNo) where.receiptNo = receiptNo
  
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
          include: { product: { select: { name: true, sku: true, unit: true } } }
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
        const stock = await tx.stock.findUnique({
          where: { productId_locationId: { productId: item.productId, locationId: finalLocationId } }
        })

        if (!stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for product ID: ${item.productId}`)
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
      
      const newSale = await tx.sale.create({
        data: {
          receiptNo,
          locationId: finalLocationId,
          soldById: session.user.id as string,
          customerId,
          customerName: checkout.customerName,
          customerPhone: checkout.customerPhone,
          totalAmount: checkout.totalAmount,
          subTotal: checkout.items.reduce((s, i) => s + i.subTotal, 0),
          taxRate: 18,
          taxAmount: checkout.items.reduce((s, i) => s + i.subTotal, 0) * 0.18,
          grandTotal: checkout.items.reduce((s, i) => s + i.subTotal, 0) * 1.18,
          paymentMode: checkout.paymentMode || 'CASH',
          note: checkout.note,
          items: {
            create: checkout.items.map((item) => {
              const itemTax = item.subTotal * 0.18
              return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                subTotal: item.subTotal,
                taxRate: 18,
                taxAmount: itemTax,
                total: item.subTotal + itemTax,
              }
            })
          }
        },
        include: { items: true }
      })

      // 4. Deduct stock and create audit logs
      for (const item of checkout.items) {
        await tx.stock.update({
          where: { productId_locationId: { productId: item.productId, locationId: finalLocationId } },
          data: { quantity: { decrement: item.quantity } }
        })

        await tx.auditLog.create({
          data: {
            userId: session.user.id as string,
            action: 'SALE_DEDUCTION',
            entity: 'Stock',
            entityId: item.productId,
            details: `Sold ${item.quantity} units in receipt ${receiptNo}`
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
