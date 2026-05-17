import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity, createNotification } from '@/lib/audit'

const includeRelations = {
  product: true,
  fromLocation: true,
  toLocation: true,
  requestedByUser: { select: { name: true } },
} as const

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  const body = await request.json()
  const { action } = body as { action?: string }

  if (!action || typeof action !== 'string') {
    return NextResponse.json({ error: 'action is required' }, { status: 400 })
  }

  const existing = await prisma.stockOutRequest.findUnique({
    where: { id },
    include: { product: true, fromLocation: true, toLocation: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const userLocationId = session.user.locationId as string | null
  const isRequester = existing.requestedBy === session.user.id
  const isReceiverAtDestination = Boolean(
    userLocationId && existing.toLocationId && existing.toLocationId === userLocationId
  )
  const isSourceOperator = Boolean(userLocationId && existing.fromLocationId === userLocationId)

  try {
    if (action === 'approve') {
      if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const qtyApproved = parseFloat(String(body.quantityApproved ?? existing.quantityRequested))
      const updated = await prisma.$transaction((tx) =>
        tx.stockOutRequest.update({
          where: { id },
          data: {
            status: 'APPROVED',
            quantityApproved: qtyApproved,
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
          include: includeRelations,
        })
      )
      await logActivity({
        userId: session.user.id,
        action: 'APPROVE',
        entity: 'StockOutRequest',
        entityId: id,
        details: `Approved ${qtyApproved} ${existing.product.unit}`,
      })
      await createNotification({
        userId: existing.requestedBy,
        title: 'Request Approved ✅',
        message: `Your request for ${existing.product.name} has been approved.`,
        type: 'SUCCESS',
        link: '/admin/my-requests',
      })
      return NextResponse.json(updated)
    }

    if (action === 'reject') {
      if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const updated = await prisma.$transaction((tx) =>
        tx.stockOutRequest.update({
          where: { id },
          data: {
            status: 'REJECTED',
            rejectionReason: body.rejectionReason,
            approvedBy: session.user.id,
            approvedAt: new Date(),
          },
          include: includeRelations,
        })
      )
      await logActivity({
        userId: session.user.id,
        action: 'REJECT',
        entity: 'StockOutRequest',
        entityId: id,
        details: `Rejected. Reason: ${body.rejectionReason}`,
      })
      await createNotification({
        userId: existing.requestedBy,
        title: 'Request Rejected ✗',
        message: `Your request for ${existing.product.name} was rejected.`,
        type: 'DANGER',
        link: '/admin/my-requests',
      })
      return NextResponse.json(updated)
    }

    if (action === 'dispatch') {
      if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'].includes(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (['STORE_KEEPER', 'SHOP_STAFF'].includes(role) && !isSourceOperator) {
        return NextResponse.json({ error: 'You can only dispatch from your assigned source location' }, { status: 403 })
      }
      if (existing.status !== 'APPROVED') {
        return NextResponse.json({ error: 'Must be approved first' }, { status: 400 })
      }

      const qty = existing.quantityApproved || existing.quantityRequested

      const updated = await prisma.$transaction(async (tx) => {
        const sourceStock = await tx.stock.findUnique({
          where: {
            productId_locationId: { productId: existing.productId, locationId: existing.fromLocationId },
          },
        })
        if (!sourceStock || sourceStock.quantity < qty) {
          throw new Error(
            `INSUFFICIENT:${sourceStock?.quantity ?? 0}:${existing.fromLocation.name}`
          )
        }

        await tx.stock.update({
          where: {
            productId_locationId: { productId: existing.productId, locationId: existing.fromLocationId },
          },
          data: { quantity: { decrement: qty } },
        })

        const financeReview = await tx.financeReview.findFirst({ where: { stockOutId: id } })
        if (!financeReview) {
          await tx.financeReview.create({
            data: {
              stockOutId: id,
              reviewedBy: session.user.id,
              status: 'PENDING',
              notes: `Auto-generated on dispatch. Qty: ${qty}`,
            },
          })
        }

        return tx.stockOutRequest.update({
          where: { id },
          data: { status: 'DISPATCHED', dispatchedAt: new Date() },
          include: includeRelations,
        })
      })

      await logActivity({
        userId: session.user.id,
        action: 'DISPATCH',
        entity: 'StockOutRequest',
        entityId: id,
        details: `Dispatched ${qty} ${existing.product.unit} from ${existing.fromLocation.name}`,
      })
      await createNotification({
        role: 'FINANCE',
        title: 'New Finance Review 💰',
        message: `Stock dispatch for ${existing.product.name} requires financial reconciliation.`,
        type: 'WARNING',
        link: '/finance/dashboard',
      })

      if (existing.toLocationId) {
        const destinationUsers = await prisma.user.findMany({
          where: {
            locationId: existing.toLocationId,
            isActive: true,
          },
          select: { id: true },
        })

        if (destinationUsers.length > 0) {
          await prisma.notification.createMany({
            data: destinationUsers.map((user) => ({
              userId: user.id,
              title: 'Goods Dispatched 🚚',
              message: `${existing.product.name} has been dispatched from ${existing.fromLocation.name}${existing.toLocation?.name ? ` to ${existing.toLocation.name}` : ''}. Please acknowledge receipt.`,
              type: 'INFO',
              link: '/admin/my-requests',
            })),
          })
        }
      }

      return NextResponse.json(updated)
    }

    if (action === 'acknowledge') {
      const isElevated = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)
      if (!(isRequester || isElevated || isReceiverAtDestination)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (existing.status !== 'DISPATCHED') {
        return NextResponse.json({ error: 'Must be dispatched first' }, { status: 400 })
      }

      const qty = existing.quantityApproved || existing.quantityRequested

      const updated = await prisma.$transaction(async (tx) => {
        if (existing.toLocationId) {
          await tx.stock.upsert({
            where: {
              productId_locationId: { productId: existing.productId, locationId: existing.toLocationId },
            },
            create: { productId: existing.productId, locationId: existing.toLocationId, quantity: qty },
            update: { quantity: { increment: qty } },
          })
        }
        return tx.stockOutRequest.update({
          where: { id },
          data: { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() },
          include: includeRelations,
        })
      })

      await logActivity({
        userId: session.user.id,
        action: 'ACKNOWLEDGE',
        entity: 'StockOutRequest',
        entityId: id,
        details: `Acknowledged receipt of ${qty} ${existing.product.unit}`,
      })

      await createNotification({
        title: 'Stock Transfer Acknowledged ✅',
        message: `${existing.product.name} transfer${existing.toLocation?.name ? ` to ${existing.toLocation.name}` : ''} has been acknowledged as received.`,
        type: 'SUCCESS',
        link: '/admin/stock-out',
      })

      return NextResponse.json(updated)
    }

    if (action === 'cancel') {
      if (!(isRequester || ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      if (existing.status !== 'PENDING') {
        return NextResponse.json({ error: 'Can only cancel pending requests' }, { status: 400 })
      }
      const updated = await prisma.$transaction((tx) =>
        tx.stockOutRequest.update({
          where: { id },
          data: { status: 'CANCELLED' },
          include: includeRelations,
        })
      )
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    if (message.startsWith('INSUFFICIENT:')) {
      const [, available, locName] = message.split(':')
      return NextResponse.json(
        { error: `Insufficient stock at ${locName}. Available: ${available}` },
        { status: 400 }
      )
    }
    console.error('stock-out PATCH:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
