import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { z } from 'zod'

const RECEIVE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'])

const stockSendAcknowledgeSchema = z.object({
  quantityReceived: z.number().nonnegative(),
  discrepancyReason: z.string().optional(),
  acknowledgeNote: z.string().optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!RECEIVE_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  // The mobile app might send a single item acknowledge payload, but StockTransfer supports multiple items.
  // For simplicity we will assume it acknowledges the entire transfer or a single item payload if modified.
  // Since the original was single item, we will treat it as acknowledging the first item if schema matches.
  const parsed = stockSendAcknowledgeSchema.safeParse(body)
  const isAcknowledge = String((body as any).action ?? '').toLowerCase() === 'acknowledge' || String((body as any).action ?? '').toLowerCase() === 'receive'

  if (!parsed.success && !isAcknowledge) return fail('Validation error or missing action', 400, 'VALIDATION_ERROR')

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      fromLocation: true,
      toLocation: true,
      requestedByUser: { select: { id: true, name: true } },
    },
  })

  if (!transfer) return fail('Transfer not found', 404, 'NOT_FOUND')

  const userLocationId = user.locationId ?? null
  const isElevated = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)
  const isDestinationUser = Boolean(userLocationId && transfer.toLocationId === userLocationId)

  if (!isElevated && !isDestinationUser) {
    return fail('Only destination location staff can acknowledge this send', 403, 'FORBIDDEN')
  }

  if (transfer.status !== 'DISPATCHED') {
    return fail('Only dispatched sends can be acknowledged', 400, 'VALIDATION_ERROR')
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of transfer.items) {
      // If payload specified quantityReceived (legacy single item mode), use it, otherwise use dispatchedQty
      const receivedQty = parsed.success ? parsed.data.quantityReceived : (item.dispatchedQty || item.approvedQty || item.requestedQty)
      
      if (transfer.toLocationId) {
        await tx.stock.upsert({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId: transfer.toLocationId,
            },
          },
          create: {
            variantId: item.variantId,
            locationId: transfer.toLocationId,
            quantity: receivedQty,
          },
          update: { quantity: { increment: receivedQty } },
        })
      }
      await tx.stockTransferItem.update({
        where: { id: item.id },
        data: { receivedQty: receivedQty, discrepancyNote: parsed.success ? parsed.data.discrepancyReason : undefined },
      })
    }

    const receivedAt = new Date()
    const updatedTransfer = await tx.stockTransfer.update({
      where: { id, status: 'DISPATCHED' },
      data: {
        status: 'RECEIVED',
        receivedAt,
        receivedBy: user.sub!,
        note: parsed.success ? parsed.data.acknowledgeNote : transfer.note
      },
      include: {
        items: { include: { variant: { include: { product: true } } } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
    })

    return updatedTransfer
  })

  await logActivity({
    userId: user.sub!,
    action: 'RECEIVE',
    entity: 'StockTransfer',
    entityId: id,
    details: `Mobile receive for transfer ${transfer.transferNo}`,
  })

  return ok({ request: updated })
}
