import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity, createNotification } from '@/lib/audit'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  const body = await request.json()
  const { action } = body // approve | reject | dispatch | acknowledge | cancel

  const existing = await prisma.stockOutRequest.findUnique({ 
    where: { id },
    include: { product: true, fromLocation: true, toLocation: true }
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  let updateData: any = {}

  if (action === 'approve') {
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const qtyApproved = parseFloat(body.quantityApproved || existing.quantityRequested)
    updateData = {
      status: 'APPROVED',
      quantityApproved: qtyApproved,
      approvedBy: session.user.id,
      approvedAt: new Date(),
    }

    await logActivity({
      userId: session.user.id,
      action: 'APPROVE',
      entity: 'StockOutRequest',
      entityId: id,
      details: `Approved ${qtyApproved} ${existing.product.unit}`
    })

    await createNotification({
      userId: existing.requestedBy,
      title: 'Request Approved ✅',
      message: `Your request for ${existing.product.name} has been approved.`,
      type: 'SUCCESS',
      link: '/admin/my-requests'
    })

  } else if (action === 'reject') {
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    updateData = {
      status: 'REJECTED',
      rejectionReason: body.rejectionReason,
      approvedBy: session.user.id,
      approvedAt: new Date(),
    }

    await logActivity({
      userId: session.user.id,
      action: 'REJECT',
      entity: 'StockOutRequest',
      entityId: id,
      details: `Rejected. Reason: ${body.rejectionReason}`
    })

    await createNotification({
      userId: existing.requestedBy,
      title: 'Request Rejected ✗',
      message: `Your request for ${existing.product.name} was rejected.`,
      type: 'DANGER',
      link: '/admin/my-requests'
    })

  } else if (action === 'dispatch') {
    if (!['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER'].includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    if (existing.status !== 'APPROVED') {
      return NextResponse.json({ error: 'Must be approved first' }, { status: 400 })
    }

    const qty = existing.quantityApproved || existing.quantityRequested

    // 1. Check if source has enough stock
    const sourceStock = await prisma.stock.findUnique({
      where: { productId_locationId: { productId: existing.productId, locationId: existing.fromLocationId } }
    })

    if (!sourceStock || sourceStock.quantity < qty) {
      return NextResponse.json({ error: `Insufficient stock at ${existing.fromLocation.name}. Available: ${sourceStock?.quantity || 0}` }, { status: 400 })
    }

    // 2. Deduct stock from source (Mark as In-Transit)
    await prisma.stock.update({
      where: { productId_locationId: { productId: existing.productId, locationId: existing.fromLocationId } },
      data: { quantity: { decrement: qty } },
    })

    // 3. Create Finance Review automatically
    await prisma.financeReview.create({
      data: {
        stockOutId: id,
        reviewedBy: session.user.id, // Temporary until finance reviews it
        status: 'PENDING',
        notes: `Auto-generated on dispatch. Qty: ${qty}`
      }
    })

    updateData = { status: 'DISPATCHED', dispatchedAt: new Date() }

    await logActivity({
      userId: session.user.id,
      action: 'DISPATCH',
      entity: 'StockOutRequest',
      entityId: id,
      details: `Dispatched ${qty} ${existing.product.unit} from ${existing.fromLocation.name}`
    })

    await createNotification({
      role: 'FINANCE',
      title: 'New Finance Review 💰',
      message: `Stock dispatch for ${existing.product.name} requires financial reconciliation.`,
      type: 'WARNING',
      link: '/finance/reviews'
    })

  } else if (action === 'acknowledge') {
    if (existing.status !== 'DISPATCHED') {
      return NextResponse.json({ error: 'Must be dispatched first' }, { status: 400 })
    }

    const qty = existing.quantityApproved || existing.quantityRequested

    // If it was a transfer to another location, add it there now
    if (existing.toLocationId) {
      await prisma.stock.upsert({
        where: { productId_locationId: { productId: existing.productId, locationId: existing.toLocationId } },
        create: { productId: existing.productId, locationId: existing.toLocationId, quantity: qty },
        update: { quantity: { increment: qty } }
      })
    }

    updateData = { status: 'ACKNOWLEDGED', acknowledgedAt: new Date() }

    await logActivity({
      userId: session.user.id,
      action: 'ACKNOWLEDGE',
      entity: 'StockOutRequest',
      entityId: id,
      details: `Acknowledged receipt of ${qty} ${existing.product.unit}`
    })

  } else if (action === 'cancel') {
    if (existing.status !== 'PENDING') {
      return NextResponse.json({ error: 'Can only cancel pending requests' }, { status: 400 })
    }
    updateData = { status: 'CANCELLED' }
  }

  const updated = await prisma.stockOutRequest.update({
    where: { id },
    data: updateData,
    include: {
      product: true,
      fromLocation: true,
      toLocation: true,
      requestedByUser: { select: { name: true } },
    },
  })
  return NextResponse.json(updated)
}
