import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as cartService from '@/services/cart.service'
import { updateCartItemSchema } from '@/lib/validation'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can use shopping cart' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = updateCartItemSchema.safeParse(body)

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

    const { quantity } = validation.data
    const taxRate = body.taxRate || 18

    const cart = await cartService.updateCartItem({
      customerId: session.user.id,
      cartItemId: params.id,
      quantity,
    })

    const cartWithTotals = await cartService.getCartWithTotals(session.user.id, taxRate)

    return NextResponse.json({
      success: true,
      data: cartWithTotals,
      message: 'Cart item updated',
    })
  } catch (error) {
    console.error('[Cart Item PUT Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update cart item',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (session.user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can use shopping cart' },
        { status: 403 }
      )
    }

    const taxRate = parseFloat(new URL(request.url).searchParams.get('taxRate') || '18')

    const cart = await cartService.removeFromCart({
      customerId: session.user.id,
      cartItemId: params.id,
    })

    const cartWithTotals = await cartService.getCartWithTotals(session.user.id, taxRate)

    return NextResponse.json({
      success: true,
      data: cartWithTotals,
      message: 'Item removed from cart',
    })
  } catch (error) {
    console.error('[Cart Item DELETE Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove cart item',
      },
      { status: 500 }
    )
  }
}
