import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as ordersService from '@/services/orders.service'
import { approveOrderSchema } from '@/lib/validation'
import { dispatchOrderNotification } from '@/services/notification-dispatcher.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin can approve orders
    if (!['ADMIN', 'SUPER_ADMIN'].includes(session.user.role || '')) {
      return NextResponse.json(
        { success: false, error: 'Only admin can approve orders' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = approveOrderSchema.safeParse(body)

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

    const { note } = validation.data

    const order = await ordersService.approveOrder(
      id,
      session.user.id,
      note
    )

    // Dispatch approval notifications
    await dispatchOrderNotification('ORDER_APPROVED', order as any).catch((err) => {
      console.error('[Notification Error]:', err)
    })

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order approved successfully',
    })
  } catch (error) {
    console.error('[Order Approve Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve order',
      },
      { status: 500 }
    )
  }
}
