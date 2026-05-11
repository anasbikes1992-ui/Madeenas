import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as ordersService from '@/services/orders.service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { success: false, error: 'Cancellation reason is required' },
        { status: 400 }
      )
    }

    // Check if user can cancel this order
    const order = await ordersService.getOrderById(params.id)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Customers can cancel their own PENDING orders
    // Admin can cancel any order
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '')
    const isOwner = order.customerId === session.user.id && order.status === 'PENDING'

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel this order' },
        { status: 403 }
      )
    }

    const cancelledOrder = await ordersService.cancelOrder(
      params.id,
      session.user.id,
      reason
    )

    // TODO: Send cancellation notification to customer

    return NextResponse.json({
      success: true,
      data: cancelledOrder,
      message: 'Order cancelled successfully',
    })
  } catch (error) {
    console.error('[Order Cancel Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to cancel order',
      },
      { status: 500 }
    )
  }
}
