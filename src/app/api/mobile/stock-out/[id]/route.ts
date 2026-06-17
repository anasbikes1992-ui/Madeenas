import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { shouldRequireTransferApproval } from '@/lib/stock-transfer-policy'

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

  const existing = await prisma.stockOutRequest.findUnique({
    where: { id },
    include: {
      product: true,
      fromLocation: true,
      toLocation: true,
    },
  })

  if (!existing) return fail('Request not found', 404, 'NOT_FOUND')
  if (existing.flowType === 'SEND_DIRECT') {
    return fail('Use stock-send endpoint for direct sends', 400, 'VALIDATION_ERROR')
  }

  const isDestinationUser = Boolean(userLocationId && existing.toLocationId === userLocationId)

  if (action === 'dispatch') {
    if (!DISPATCH_ROLES.has(role)) {
      return fail('Forbidden', 403, 'FORBIDDEN')
    }

    if ((role === 'STORE_KEEPER' || role === 'SHOP_STAFF') && existing.fromLocationId !== userLocationId) {
      return fail('You can only dispatch from your assigned source location', 403, 'FORBIDDEN')
    }

    const qty = existing.quantityApproved || existing.quantityRequested
    const requiresApproval = shouldRequireTransferApproval({
      quantity: qty,
      unitCost: existing.product.costPrice,
    })
    const canDispatchWithoutApproval = existing.status === 'PENDING' && !requiresApproval

    if (!canDispatchWithoutApproval && existing.status !== 'APPROVED') {
      return fail('Must be approved first for this transfer', 400, 'VALIDATION_ERROR')
    }

    const updated = await prisma.$transaction(async (tx) => {
      const sourceStock = await tx.stock.findUnique({
        where: {
          productId_locationId: {
            productId: existing.productId,
            locationId: existing.fromLocationId,
          },
        },
      })

      if (!sourceStock || sourceStock.quantity < qty) {
        throw new Error(`INSUFFICIENT:${sourceStock?.quantity ?? 0}`)
      }

      await tx.stock.update({
        where: {
          productId_locationId: {
            productId: existing.productId,
            locationId: existing.fromLocationId,
          },
        },
        data: { quantity: { decrement: qty } },
      })

      const expectedStatuses = canDispatchWithoutApproval ? ['PENDING', 'APPROVED'] : ['APPROVED']
      const updatedRows = await tx.stockOutRequest.updateMany({
        where: { id, status: { in: expectedStatuses } },
        data: {
          status: 'IN_TRANSIT',
          dispatchedAt: new Date(),
          quantityDispatched: qty,
        },
      })

      if (updatedRows.count !== 1) {
        throw new Error('STATUS_CONFLICT')
      }

      await tx.stockOutRequest.update({
        where: { id },
        data: {
          dispatchedBy: user.sub!,
        },
      })

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
      action: 'DISPATCH',
      entity: 'StockOutRequest',
      entityId: id,
      details: `Mobile dispatch ${qty} ${existing.product.unit} of ${existing.product.name}`,
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

    if (!['DISPATCHED', 'IN_TRANSIT'].includes(existing.status)) {
      return fail('Transfer must be dispatched first', 400, 'VALIDATION_ERROR')
    }

    const qty = existing.quantityApproved || existing.quantityRequested

    const updated = await prisma.$transaction(async (tx) => {
      if (existing.toLocationId) {
        await tx.stock.upsert({
          where: {
            productId_locationId: {
              productId: existing.productId,
              locationId: existing.toLocationId,
            },
          },
          create: {
            productId: existing.productId,
            locationId: existing.toLocationId,
            quantity: qty,
          },
          update: { quantity: { increment: qty } },
        })
      }

      const receivedAt = new Date()
      const updatedRows = await tx.stockOutRequest.updateMany({
        where: { id, status: { in: ['DISPATCHED', 'IN_TRANSIT'] } },
        data: {
          status: 'RECEIVED',
          quantityReceived: qty,
          discrepancyQty: 0,
          acknowledgedAt: receivedAt,
        },
      })

      if (updatedRows.count !== 1) {
        throw new Error('STATUS_CONFLICT')
      }

      await tx.stockOutRequest.update({
        where: { id },
        data: {
          receivedAt,
          receivedBy: user.sub!,
        },
      })

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
      action: 'RECEIVE',
      entity: 'StockOutRequest',
      entityId: id,
      details: `Mobile receive ${qty} ${existing.product.unit} of ${existing.product.name}`,
    })

    return ok({ request: updated })
  }

  return fail(`Unsupported action: ${action}`, 400, 'VALIDATION_ERROR')
}
