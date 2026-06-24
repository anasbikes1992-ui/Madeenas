import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { stockSendAcknowledgeSchema } from '@/lib/validations'
import { logActivity, createNotification } from '@/lib/audit'
import { logHistoryEvent } from '@/lib/history'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = stockSendAcknowledgeSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid acknowledge payload', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  const role = session.user.role as string
  if (!hasPermission(role, 'stock.receive')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const sendLine = await prisma.stockOutRequest.findUnique({
    where: { id },
    include: {
      product: true,
      fromLocation: true,
      toLocation: true,
      requestedByUser: { select: { id: true, name: true } },
    },
  })

  if (!sendLine || sendLine.flowType !== 'SEND_DIRECT') {
    return NextResponse.json({ error: 'Send line not found' }, { status: 404 })
  }

  const userLocationId = session.user.locationId as string | null
  const isElevated = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)
  const isDestinationUser = Boolean(userLocationId && sendLine.toLocationId === userLocationId)

  if (!isElevated && !isDestinationUser) {
    return NextResponse.json({ error: 'Only destination location staff can acknowledge this send' }, { status: 403 })
  }

  if (!['IN_TRANSIT', 'DISPATCHED'].includes(sendLine.status)) {
    return NextResponse.json({ error: 'Only in-transit sends can be acknowledged' }, { status: 400 })
  }

  const acknowledged = parsed.data
  const dispatchedQty = sendLine.quantityDispatched ?? sendLine.quantityApproved ?? sendLine.quantityRequested
  if (acknowledged.quantityReceived > dispatchedQty) {
    return NextResponse.json({ error: 'Received quantity cannot exceed dispatched quantity' }, { status: 400 })
  }

  const discrepancyQty = Math.max(0, dispatchedQty - acknowledged.quantityReceived)
  if (discrepancyQty > 0 && !acknowledged.discrepancyReason) {
    return NextResponse.json({ error: 'Discrepancy reason is required for partial receipt' }, { status: 400 })
  }

  const receivedAt = new Date()

  const updated = await prisma.$transaction(async (tx) => {
    if (!sendLine.toLocationId) {
      throw new Error('Destination location missing')
    }

    // Hierarchical variant send — credit StockVariant; legacy flat send — credit Stock.
    if (sendLine.productColorId) {
      await tx.stockVariant.upsert({
        where: {
          productColorId_locationId: {
            productColorId: sendLine.productColorId,
            locationId: sendLine.toLocationId,
          },
        },
        create: {
          productColorId: sendLine.productColorId,
          locationId: sendLine.toLocationId,
          quantity: acknowledged.quantityReceived,
        },
        update: { quantity: { increment: acknowledged.quantityReceived } },
      })
    } else {
      await tx.stock.upsert({
        where: { productId_locationId: { productId: sendLine.productId, locationId: sendLine.toLocationId } },
        create: { productId: sendLine.productId, locationId: sendLine.toLocationId, quantity: acknowledged.quantityReceived },
        update: { quantity: { increment: acknowledged.quantityReceived } },
      })
    }

    const result = await tx.stockOutRequest.updateMany({
      where: { id, status: { in: ['IN_TRANSIT', 'DISPATCHED'] } },
      data: {
        status: 'RECEIVED',
        quantityReceived: acknowledged.quantityReceived,
        discrepancyQty,
        discrepancyReason: acknowledged.discrepancyReason ?? null,
        acknowledgeNote: acknowledged.acknowledgeNote ?? null,
        acknowledgedAt: receivedAt,
        receivedAt,
        receivedBy: session.user.id,
      },
    })

    if (result.count !== 1) {
      throw new Error('STATUS_CONFLICT')
    }

    return tx.stockOutRequest.findUnique({
      where: { id },
      include: {
        product: true,
        fromLocation: true,
        toLocation: true,
        requestedByUser: { select: { id: true, name: true } },
        receivedByUser: { select: { id: true, name: true } },
      },
    })
  })

  await logActivity({
    userId: session.user.id,
    action: 'SEND_ACKNOWLEDGE',
    entity: 'StockOutRequest',
    entityId: id,
    details: `Acknowledged ${acknowledged.quantityReceived}/${dispatchedQty} ${sendLine.product.unit}${discrepancyQty > 0 ? `, discrepancy ${discrepancyQty}` : ''}`,
  })

  await logHistoryEvent({
    entityType: 'STOCK_SEND',
    entityId: sendLine.transferNo || sendLine.id,
    eventType: 'SEND_ACKNOWLEDGED',
    title: discrepancyQty > 0 ? 'Send partially received with discrepancy' : 'Send fully received',
    details: `Received ${acknowledged.quantityReceived} of ${dispatchedQty}`,
    payload: {
      requestId: sendLine.id,
      transferNo: sendLine.transferNo,
      quantityReceived: acknowledged.quantityReceived,
      discrepancyQty,
      discrepancyReason: acknowledged.discrepancyReason ?? null,
      acknowledgeNote: acknowledged.acknowledgeNote ?? null,
    },
    createdBy: session.user.id as string,
  })

  if (sendLine.requestedByUser?.id) {
    await createNotification({
      userId: sendLine.requestedByUser.id,
      title: 'Send Acknowledged ✅',
      message: `${sendLine.transferNo || sendLine.id}: ${sendLine.product.name} acknowledged by destination${discrepancyQty > 0 ? ' with discrepancy' : ''}.`,
      type: discrepancyQty > 0 ? 'WARNING' : 'SUCCESS',
      link: '/admin/send-stock',
    })
  }

  return NextResponse.json(updated)
}
