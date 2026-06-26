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
    include: {
      items: {
        include: {
          variant: {
            select: {
              id: true,
              colorName: true,
              sku: true,
              stockUnit: true,
              costPrice: true,
              product: {
                select: { name: true }
              }
            },
          },
        },
      },
      customer: {
        select: {
          name: true,
          email: true,
        },
      },
    },
  })

  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 })
  }

  if (['CANCELLED', 'DELIVERED'].includes(order.status)) {
    return NextResponse.json({ error: 'Order cannot be fulfilled in its current status' }, { status: 400 })
  }

  if (order.items.length === 0) {
    return NextResponse.json({ error: 'Order has no items to fulfill' }, { status: 400 })
  }

  const locationId = parsed.data.locationId || (session.user.locationId as string | null)
  if (!locationId) {
    return NextResponse.json({ error: 'Location is required for fulfillment' }, { status: 400 })
  }

  const paymentMode = parsed.data.paymentMode || 'CASH'
  const taxRate = order.taxRate

  try {
    const result = await prisma.$transaction(async (tx) => {
      for (const item of order.items) {
        const stock = await tx.stock.findUnique({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId,
            },
          },
        })

        if (!stock || stock.quantity < item.quantity) {
          throw new Error(`Insufficient stock for ${item.variant.product.name} (${item.variant.colorName})`)
        }
      }

      let customerId: string | null = null
      if (order.customerPhone && order.customerPhone !== 'UNKNOWN') {
        const customer = await tx.customer.upsert({
          where: { phone: order.customerPhone },
          update: {
            name: order.customer?.name || '',
            email: order.customer?.email,
          },
          create: {
            name: order.customer?.name || '',
            phone: order.customerPhone,
            email: order.customer?.email,
          },
        })
        customerId = customer.id
      }

      const lineItems = order.items.map((item) => {
        const unitPrice = parsed.data.unitPrice ?? item.unitPrice ?? item.variant.costPrice ?? 0
        if (unitPrice <= 0) {
          throw new Error(`Missing unit price for ${item.variant.product.name}`)
        }
        const subTotal = unitPrice * item.quantity
        const taxAmount = (subTotal * taxRate) / 100
        return {
          variantId: item.variantId,
          saleUnit: item.saleUnit || item.variant.stockUnit,
          saleQty: item.quantity,
          saleToStockFactor: 1, // default
          stockQtyDeducted: item.quantity,
          unitPrice,
          subTotal,
          taxRate,
          taxAmount,
          total: subTotal + taxAmount,
        }
      })

      const subTotal = lineItems.reduce((sum, item) => sum + item.subTotal, 0)
      const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0)
      const grandTotal = subTotal + taxAmount
      const receiptNo = await generateReceiptNo()

      const sale = await tx.sale.create({
        data: {
          receiptNo,
          locationId,
          soldById: session.user.id as string,
          customerId,
          customerName: order.customer?.name,
          customerPhone: order.customerPhone,
          grandTotal,
          subTotal,
          taxRate,
          taxAmount,
          paymentMode,
          note: parsed.data.note || `Fulfilled from customer order ${order.id}`,
          items: {
            create: lineItems,
          },
        },
        include: {
          items: true,
        },
      })

      for (const item of lineItems) {
        await tx.stock.update({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId,
            },
          },
          data: {
            quantity: { decrement: item.stockQtyDeducted },
          },
        })
      }

      const updatedOrder = await tx.customerOrder.update({
        where: { id: order.id },
        data: {
          status: 'DELIVERED',
          fulfilledBy: session.user.id as string,
          fulfilledAt: new Date(),
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
