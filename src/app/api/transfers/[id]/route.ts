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
      if (!hasPermission(role, 'stock.approve')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      
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
      const updated = await prisma.stockTransfer.update({
        where: { id },
        data: {
          status: 'CANCELLED',
        },
      })
      return NextResponse.json(updated)
    }

    if (action === 'dispatch') {
      if (!hasPermission(role, 'stock.dispatch')) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

      const updated = await prisma.$transaction(async (tx) => {
        // deduct stock
        for (const item of existing.items) {
          await tx.stock.updateMany({
            where: { variantId: item.variantId, locationId: existing.fromLocationId },
            data: { quantity: { decrement: item.requestedQty } },
          })
        }
        return tx.stockTransfer.update({
          where: { id },
          data: {
            status: 'DISPATCHED',
            dispatchedBy: session.user.id,
            dispatchedAt: new Date(),
          },
        })
      })
      return NextResponse.json(updated)
    }

    if (action === 'acknowledge') {
      const updated = await prisma.$transaction(async (tx) => {
        // add stock
        for (const item of existing.items) {
          const s = await tx.stock.findFirst({
            where: { variantId: item.variantId, locationId: existing.toLocationId }
          })
          if (s) {
            await tx.stock.update({
              where: { id: s.id },
              data: { quantity: { increment: item.requestedQty } }
            })
          } else {
            await tx.stock.create({
              data: {
                variantId: item.variantId,
                locationId: existing.toLocationId,
                quantity: item.requestedQty
              }
            })
          }
        }
        return tx.stockTransfer.update({
          where: { id },
          data: {
            status: 'RECEIVED',
            receivedBy: session.user.id,
            receivedAt: new Date(),
          },
        })
      })
      return NextResponse.json(updated)
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 })
  } catch (err: unknown) {
    console.error('stock-out PATCH:', err)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
