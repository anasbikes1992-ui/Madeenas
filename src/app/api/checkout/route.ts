import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as ordersService from '@/services/orders.service'
import * as cartService from '@/services/cart.service'
import { checkoutSchema } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CUSTOMER') {
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

    // Validate stock availability if locationId provided
    if (checkoutData.locationId) {
      const stockValidation = await cartService.validateCartStock(
        session.user.id,
        checkoutData.locationId
      )

      if (!stockValidation.valid) {
        return NextResponse.json(
          {
            success: false,
            error: 'Insufficient stock for some items',
            details: stockValidation.errors,
          },
          { status: 400 }
        )
      }
    }

    // Create order from cart
    const order = await ordersService.createOrderFromCart(
      session.user.id,
      {
        items: checkoutData.items,
        shippingAddress: checkoutData.shippingAddress,
        billingAddress: checkoutData.billingAddress,
        phoneNumber: checkoutData.phoneNumber,
        note: checkoutData.note,
      },
      taxRate
    )

    // TODO: Send order confirmation email to customer
    // TODO: Notify admin of new order (webhook, email, or push notification)

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
