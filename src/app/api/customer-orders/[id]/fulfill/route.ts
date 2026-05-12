import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/audit'
import { z } from 'zod'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

const fulfillSchema = z.object({
  locationId: z.string().cuid().optional(),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT']).optional(),
  unitPrice: z.number().positive().optional(),
  note: z.string().max(500).optional(),
})

async function generateReceiptNo() {
  return `REC-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()

  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const payload = await request.json().catch(() => ({}))
  const parsed = fulfillSchema.safeParse(payload)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const order = await prisma.customerOrder.findUnique({
    where: { id },
    include: { product: true },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (order.status === 'CLOSED') {
    return NextResponse.json({ error: 'Order already closed' }, { status: 400 })
  }

  // Idempotency check: Look for existing sale with this order reference
  const existingSale = await prisma.sale.findFirst({
    where: {
      note: { contains: `customer order ${order.id}` },
    },
  })

  if (existingSale) {
    return NextResponse.json(
      {
        error: 'Order already fulfilled',
        sale: existingSale,
        order,
      },
      { status: 409 }
    )
  }

  const locationId = parsed.data.locationId || (session.user.locationId as string | null)
  if (!locationId) {
    return NextResponse.json({ error: 'Location is required for fulfillment' }, { status: 400 })
  }

  const paymentMode = parsed.data.paymentMode || 'CASH'

  try {
    const result = await prisma.$transaction(async (tx) => {
      const stock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: order.productId,
            locationId,
          },
        },
      })

      if (!stock || stock.quantity < order.quantity) {
        throw new Error('Insufficient stock to fulfill this order')
      }

      let customerId: string | null = null
      if (order.customerPhone) {
        const customer = await tx.customer.upsert({
          where: { phone: order.customerPhone },
          update: {
            name: order.customerName,
            email: order.customerEmail,
          },
          create: {
            name: order.customerName,
            phone: order.customerPhone,
            email: order.customerEmail,
          },
        })
        customerId = customer.id
      }

      const unitPrice =
        parsed.data.unitPrice ?? order.quotedPrice ?? order.product.costPrice ?? 0

      if (unitPrice <= 0) {
        throw new Error('Quoted price or unit price is required before fulfillment')
      }

      const subTotal = unitPrice * order.quantity
      const taxRate = 18
      const taxAmount = (subTotal * taxRate) / 100
      const grandTotal = subTotal + taxAmount
      const receiptNo = await generateReceiptNo()

      const sale = await tx.sale.create({
        data: {
          receiptNo,
          locationId,
          soldById: session.user.id as string,
          customerId,
          customerName: order.customerName,
          customerPhone: order.customerPhone,
          totalAmount: grandTotal,
          subTotal,
          taxRate,
          taxAmount,
          grandTotal,
          paymentMode,
          note: parsed.data.note || `Fulfilled from customer order ${order.id}`,
          items: {
            create: [
              {
                productId: order.productId,
                quantity: order.quantity,
                unitPrice,
                subTotal: unitPrice * order.quantity,
                taxRate,
                taxAmount: ((unitPrice * order.quantity) * taxRate) / 100,
                total: (unitPrice * order.quantity) + (((unitPrice * order.quantity) * taxRate) / 100),
              },
            ],
          },
        },
        include: {
          items: true,
        },
      })

      await tx.stock.update({
        where: {
          productId_locationId: {
            productId: order.productId,
            locationId,
          },
        },
        data: {
          quantity: { decrement: order.quantity },
        },
      })

      const updatedOrder = await tx.customerOrder.update({
        where: { id: order.id },
        data: {
          status: 'CLOSED',
          quotedPrice: unitPrice,
          note: order.note
            ? `${order.note}\n[Fulfilled as sale ${receiptNo}]`
            : `[Fulfilled as sale ${receiptNo}]`,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id as string,
          action: 'FULFILL_CUSTOMER_ORDER',
          entity: 'CustomerOrder',
          entityId: order.id,
          details: `Order fulfilled to sale ${receiptNo} at location ${locationId}`,
        },
      })

      return { sale, order: updatedOrder }
    })

    await logActivity({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'CustomerOrder',
      entityId: id,
      details: `Fulfilled as sale ${result.sale.receiptNo}`,
    })

    return NextResponse.json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Fulfillment failed'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
