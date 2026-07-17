import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      fromLocation: true,
      toLocation: true,
      requestedByUser: { select: { id: true, name: true, role: true } },
      approvedByUser: { select: { id: true, name: true } },
      dispatchedByUser: { select: { id: true, name: true } },
      receivedByUser: { select: { id: true, name: true } },
      items: {
        include: {
          variant: {
            include: { product: { include: { category: true } } }
          }
        }
      }
    }
  })
  if (!transfer) return NextResponse.json({ error: 'Transfer not found' }, { status: 404 })
  return NextResponse.json(transfer)
}

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

  const existing = await prisma.stockTransfer.findUnique({
    where: { id },
    include: { fromLocation: true, toLocation: true, items: true },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  try {
    if (action === 'approve') {
      if (!hasPermission(role, 'stock.approve', session?.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      
      const updated = await prisma.stockTransfer.update({
        where: { id, status: 'PENDING' },
        data: {
          status: 'APPROVED',
          approvedBy: session.user.id,
          approvedAt: new Date(),
        },
      })
      return NextResponse.json(updated)
    }

    if (action === 'reject' || action === 'cancel') {
      // Only pre-dispatch transfers can be cancelled — cancelling a dispatched
      // transfer would strand already-deducted stock.
      const cancelled = await prisma.stockTransfer.updateMany({
        where: { id, status: { in: ['PENDING', 'APPROVED'] } },
        data: { status: 'CANCELLED' },
      })
      if (cancelled.count === 0) {
        return NextResponse.json(
          { error: 'Only pending or approved transfers can be cancelled' },
          { status: 409 }
        )
      }
      const updated = await prisma.stockTransfer.findUnique({ where: { id } })
      return NextResponse.json(updated)
    }

    if (action === 'dispatch') {
      if (!hasPermission(role, 'stock.dispatch', session?.user)) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const updated = await prisma.$transaction(async (tx) => {
        // Status-guarded transition prevents double dispatch (which would
        // deduct stock twice).
        const transition = await tx.stockTransfer.updateMany({
          where: { id, status: 'APPROVED' },
          data: {
            status: 'DISPATCHED',
            dispatchedBy: session.user.id,
            dispatchedAt: new Date(),
          },
        })
        if (transition.count === 0) {
          throw new Error('TRANSFER_NOT_DISPATCHABLE')
        }

        // Guarded decrement: the quantity >= needed condition makes
        // overselling the source location impossible under concurrency.
        for (const item of existing.items) {
          const deducted = await tx.stock.updateMany({
            where: {
              variantId: item.variantId,
              locationId: existing.fromLocationId,
              quantity: { gte: item.requestedQty },
            },
            data: { quantity: { decrement: item.requestedQty } },
          })
          if (deducted.count === 0) {
            throw new Error(`INSUFFICIENT_STOCK:${item.variantId}`)
          }
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { dispatchedQty: item.requestedQty },
          })
        }

        return tx.stockTransfer.findUnique({ where: { id }, include: { items: true } })
      })
      return NextResponse.json(updated)
    }

    if (action === 'acknowledge') {
      const updated = await prisma.$transaction(async (tx) => {
        // Only a dispatched transfer can be received, and only once.
        const transition = await tx.stockTransfer.updateMany({
          where: { id, status: 'DISPATCHED' },
          data: {
            status: 'RECEIVED',
            receivedBy: session.user.id,
            receivedAt: new Date(),
          },
        })
        if (transition.count === 0) {
          throw new Error('TRANSFER_NOT_RECEIVABLE')
        }

        for (const item of existing.items) {
          const qty = item.dispatchedQty ?? item.requestedQty
          await tx.stock.upsert({
            where: {
              variantId_locationId: {
                variantId: item.variantId,
                locationId: existing.toLocationId,
              },
            },
            update: { quantity: { increment: qty } },
            create: {
              variantId: item.variantId,
              locationId: existing.toLocationId,
              quantity: qty,
            },
          })
          await tx.stockTransferItem.update({
            where: { id: item.id },
            data: { receivedQty: qty },
          })
        }

        return tx.stockTransfer.findUnique({ where: { id }, include: { items: true } })
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : ''
    if (message.startsWith('INSUFFICIENT_STOCK:')) {
      return NextResponse.json(
        { error: `Insufficient stock at source location for variant ${message.split(':')[1]}` },
        { status: 422 }
      )
    }
    if (message === 'TRANSFER_NOT_DISPATCHABLE') {
      return NextResponse.json({ error: 'Transfer must be approved before dispatch' }, { status: 409 })
    }
    if (message === 'TRANSFER_NOT_RECEIVABLE') {
      return NextResponse.json({ error: 'Transfer must be dispatched before receiving' }, { status: 409 })
    }
    console.error('transfers PATCH:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
