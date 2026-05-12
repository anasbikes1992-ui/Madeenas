import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import * as ordersService from '@/services/orders.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const user = await getAuthUser(request)
    if (!user) {
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
    const order = await ordersService.getOrderById(id)
    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Customers can cancel their own PENDING orders
    // Admin can cancel any order
    const isAdmin = ['ADMIN', 'SUPER_ADMIN'].includes(user.role || '')
    const isOwner = order.customerId === user.id && order.status === 'PENDING'

    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { success: false, error: 'Cannot cancel this order' },
        { status: 403 }
      )
    }

    const cancelledOrder = await ordersService.cancelOrder(
      id,
      user.id,
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
