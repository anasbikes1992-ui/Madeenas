import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'

const DISPATCH_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'])
const RECEIVE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'])

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  const userLocationId = user.locationId ?? null
  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  const action = String((body as { action?: string }).action ?? '').toLowerCase()
  if (!action) {
    return fail('Action is required', 400, 'VALIDATION_ERROR')
  }

  const existing = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      fromLocation: true,
      toLocation: true,
    },
  })

  if (!existing) return fail('Request not found', 404, 'NOT_FOUND')

  const isDestinationUser = Boolean(userLocationId && existing.toLocationId === userLocationId)

  if (action === 'dispatch') {
    if (!DISPATCH_ROLES.has(role)) {
      return fail('Forbidden', 403, 'FORBIDDEN')
    }

    if ((role === 'STORE_KEEPER' || role === 'SHOP_STAFF') && existing.fromLocationId !== userLocationId) {
      return fail('You can only dispatch from your assigned source location', 403, 'FORBIDDEN')
    }

    if (existing.status !== 'PENDING' && existing.status !== 'APPROVED') {
      return fail('Transfer cannot be dispatched in its current state', 400, 'VALIDATION_ERROR')
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Check stock and decrement for all items
      for (const item of existing.items) {
        const qty = item.approvedQty || item.requestedQty
        const sourceStock = await tx.stock.findUnique({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId: existing.fromLocationId,
            },
          },
        })

        if (!sourceStock || sourceStock.quantity < qty) {
          throw new Error(`INSUFFICIENT:${sourceStock?.quantity ?? 0}`)
        }

        await tx.stock.update({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId: existing.fromLocationId,
            },
          },
          data: { quantity: { decrement: qty } },
        })

        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { dispatchedQty: qty },
        })
      }

      const updatedTransfer = await tx.stockTransfer.update({
        where: { id, status: { in: ['PENDING', 'APPROVED'] } },
        data: {
          status: 'DISPATCHED',
          dispatchedAt: new Date(),
          dispatchedBy: user.sub!,
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
      action: 'DISPATCH',
      entity: 'StockTransfer',
      entityId: id,
      details: `Mobile dispatch for transfer ${existing.transferNo}`,
    })

    return ok({ request: updated })
  }

  if (action === 'acknowledge' || action === 'receive') {
    if (!RECEIVE_ROLES.has(role)) {
      return fail('Forbidden', 403, 'FORBIDDEN')
    }

    if (!isDestinationUser && !['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
      return fail('Only destination location staff can receive this transfer', 403, 'FORBIDDEN')
    }

    if (existing.status !== 'DISPATCHED') {
      return fail('Transfer must be dispatched first', 400, 'VALIDATION_ERROR')
    }

    const updated = await prisma.$transaction(async (tx) => {
      for (const item of existing.items) {
        const qty = item.dispatchedQty || item.approvedQty || item.requestedQty
        if (existing.toLocationId) {
          await tx.stock.upsert({
            where: {
              variantId_locationId: {
                variantId: item.variantId,
                locationId: existing.toLocationId,
              },
            },
            create: {
              variantId: item.variantId,
              locationId: existing.toLocationId,
              quantity: qty,
            },
            update: { quantity: { increment: qty } },
          })
        }
        await tx.stockTransferItem.update({
          where: { id: item.id },
          data: { receivedQty: qty },
        })
      }

      const receivedAt = new Date()
      const updatedTransfer = await tx.stockTransfer.update({
        where: { id, status: 'DISPATCHED' },
        data: {
          status: 'RECEIVED',
          receivedAt,
          receivedBy: user.sub!,
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
      details: `Mobile receive for transfer ${existing.transferNo}`,
    })

    return ok({ request: updated })
  }

  return fail(`Unsupported action: ${action}`, 400, 'VALIDATION_ERROR')
}
