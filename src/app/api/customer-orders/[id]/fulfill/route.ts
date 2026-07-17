import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logActivity } from '@/lib/audit'
import { createSaleInTx, SaleError, SALE_TX_OPTIONS } from '@/services/sales.service'
import { z } from 'zod'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

const fulfillSchema = z.object({
  locationId: z.string().cuid().optional(),
  paymentMode: z.enum(['CASH', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT']).optional(),
  unitPrice: z.number().positive().optional(),
  note: z.string().max(500).optional(),
  chequeNo: z.string().max(64).optional(),
  chequeBank: z.string().max(128).optional(),
})

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

  try {
    // The sale and the order status flip share one transaction, so an order can
    // never be marked DELIVERED without its sale (or vice versa). All pricing,
    // stock, receipt-numbering, and credit-ledger logic lives in the sale engine.
    const result = await prisma.$transaction(async (tx) => {
      // Guarded status transition prevents a double fulfilment racing through
      // and deducting stock twice.
      const claimed = await tx.customerOrder.updateMany({
        where: { id: order.id, status: { notIn: ['CANCELLED', 'DELIVERED'] } },
        data: {
          status: 'DELIVERED',
          fulfilledBy: session.user.id as string,
          fulfilledAt: new Date(),
        },
      })
      if (claimed.count === 0) {
        throw new SaleError('Order cannot be fulfilled in its current status', 'ORDER_NOT_FULFILLABLE', 409)
      }

      const sale = await createSaleInTx(tx, {
        locationId,
        soldById: session.user.id as string,
        items: order.items.map((item) => ({
          variantId: item.variantId,
          saleQty: Number(item.quantity),
          saleUnit: item.saleUnit || undefined,
          unitPriceOverride: parsed.data.unitPrice ?? Number(item.unitPrice),
        })),
        paymentMode,
        customerName: order.customer?.name ?? order.customerName,
        customerPhone:
          order.customerPhone && order.customerPhone !== 'UNKNOWN' ? order.customerPhone : null,
        note: parsed.data.note || `Fulfilled from customer order ${order.id}`,
        chequeNo: parsed.data.chequeNo,
        chequeBank: parsed.data.chequeBank,
      })

      const updatedOrder = await tx.customerOrder.update({
        where: { id: order.id },
        data: {
          note: order.note
            ? `${order.note}\n[Fulfilled as sale ${sale.receiptNo}]`
            : `[Fulfilled as sale ${sale.receiptNo}]`,
        },
      })

      await tx.auditLog.create({
        data: {
          userId: session.user.id as string,
          action: 'FULFILL_CUSTOMER_ORDER',
          entity: 'CustomerOrder',
          entityId: order.id,
          details: `Order fulfilled to sale ${sale.receiptNo} at location ${locationId}`,
        },
      })

      return { sale, order: updatedOrder }
    }, SALE_TX_OPTIONS)

    await logActivity({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'CustomerOrder',
      entityId: id,
      details: `Fulfilled as sale ${result.sale.receiptNo}`,
    })

    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof SaleError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    console.error('[customer-orders/fulfill]', error)
    return NextResponse.json({ error: 'Fulfillment failed' }, { status: 500 })
  }
}
