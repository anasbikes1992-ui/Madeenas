import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as ordersService from '@/services/orders.service'
import { updateOrderStatusSchema } from '@/lib/validation'

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const order = await ordersService.getOrderById(params.id)

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      )
    }

    // Customers can only see their own orders
    if (session.user.role === 'CUSTOMER' && order.customerId !== session.user.id) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    return NextResponse.json({
      success: true,
      data: order,
    })
  } catch (error) {
    console.error('[Order GET Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch order',
      },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/staff can update order status
    if (!['ADMIN', 'SUPER_ADMIN', 'STORE_KEEPER'].includes(session.user.role || '')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = updateOrderStatusSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request data',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const { status, note } = validation.data

    const order = await ordersService.updateOrderStatus(
      params.id,
      status,
      session.user.id,
      note
    )

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order status updated',
    })
  } catch (error) {
    console.error('[Order PATCH Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update order',
      },
      { status: 500 }
    )
  }
}
