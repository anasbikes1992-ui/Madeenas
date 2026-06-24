import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { stockSendAcknowledgeSchema } from '@/lib/validations'
import { logActivity, createNotification } from '@/lib/audit'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'])

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  const parsed = stockSendAcknowledgeSchema.safeParse(body)
  if (!parsed.success) return fail('Validation error', 400, 'VALIDATION_ERROR')

  const sendLine = await prisma.stockOutRequest.findUnique({
    where: { id },
    include: {
      product: true,
      fromLocation: true,
      toLocation: true,
      requestedByUser: { select: { id: true, name: true } },
    },
  })

  if (!sendLine || sendLine.flowType !== 'SEND_DIRECT') return fail('Send line not found', 404, 'NOT_FOUND')

  const userLocationId = user.locationId ?? null
  const isElevated = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)
  const isDestinationUser = Boolean(userLocationId && sendLine.toLocationId === userLocationId)

  if (!isElevated && !isDestinationUser) {
    return fail('Only destination location staff can acknowledge this send', 403, 'FORBIDDEN')
  }

  if (!['IN_TRANSIT', 'DISPATCHED'].includes(sendLine.status)) {
    return fail('Only in-transit sends can be acknowledged', 400, 'VALIDATION_ERROR')
  }

  const dispatchedQty = sendLine.quantityDispatched ?? sendLine.quantityApproved ?? sendLine.quantityRequested
  if (parsed.data.quantityReceived > dispatchedQty) {
    return fail('Received quantity cannot exceed dispatched quantity', 400, 'VALIDATION_ERROR')
  }

  const discrepancyQty = Math.max(0, dispatchedQty - parsed.data.quantityReceived)
  if (discrepancyQty > 0 && !parsed.data.discrepancyReason) {
    return fail('Discrepancy reason is required for partial receipt', 400, 'VALIDATION_ERROR')
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
          quantity: parsed.data.quantityReceived,
        },
        update: { quantity: { increment: parsed.data.quantityReceived } },
      })
    } else {
      await tx.stock.upsert({
        where: { productId_locationId: { productId: sendLine.productId, locationId: sendLine.toLocationId } },
        create: {
          productId: sendLine.productId,
          locationId: sendLine.toLocationId,
          quantity: parsed.data.quantityReceived,
        },
        update: { quantity: { increment: parsed.data.quantityReceived } },
      })
    }

    const result = await tx.stockOutRequest.updateMany({
      where: { id, status: { in: ['IN_TRANSIT', 'DISPATCHED'] } },
      data: {
        status: 'RECEIVED',
        quantityReceived: parsed.data.quantityReceived,
        discrepancyQty,
        discrepancyReason: parsed.data.discrepancyReason ?? null,
        acknowledgeNote: parsed.data.acknowledgeNote ?? null,
        acknowledgedAt: receivedAt,
        receivedAt,
        receivedBy: user.sub!,
      },
    })

    if (result.count !== 1) throw new Error('STATUS_CONFLICT')

    return tx.stockOutRequest.findUnique({
      where: { id },
      include: {
        product: { select: { name: true, sku: true, unit: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
    })
  })

  await logActivity({
    userId: user.sub!,
    action: 'SEND_ACKNOWLEDGE',
    entity: 'StockOutRequest',
    entityId: id,
    details: `Mobile acknowledge ${parsed.data.quantityReceived}/${dispatchedQty}`,
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

  return ok({ request: updated })
}
