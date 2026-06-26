import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import * as ordersService from '@/services/orders.service'
import { checkoutSchema } from '@/lib/validation'
import { dispatchOrderNotification } from '@/services/notification-dispatcher.service'

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can checkout' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = checkoutSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid checkout data',
          details: validation.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const checkoutData = validation.data
    const taxRate = checkoutData.taxRate || 18

    // Stock is only validated at admin fulfillment time, not at order placement.
    // Customer orders are requests — the admin reviews and fulfills them.
    // Skipping validateCartStock here so customers without an assigned location
    // can still place orders.

    // Create order from cart
    const order = await ordersService.createOrderFromCart(
      user.id,
      {
        shippingAddress: checkoutData.shippingAddress,

        phoneNumber: checkoutData.phoneNumber,
        note: checkoutData.note,
      },
      taxRate
    )

    // Dispatch multi-channel notifications (email, WhatsApp, in-app)
    await dispatchOrderNotification('ORDER_CREATED', order as any).catch((err) => {
      console.error('[Notification Error]:', err)
      // Don't fail the order if notification fails
    })

    return NextResponse.json({
      success: true,
      data: order,
      message: 'Order placed successfully',
    })
  } catch (error) {
    console.error('[Checkout Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to process checkout',
      },
      { status: 500 }
    )
  }
}
