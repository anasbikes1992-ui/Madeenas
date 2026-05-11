import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as cartService from '@/services/cart.service'
import { addToCartSchema, updateCartItemSchema, removeFromCartSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const taxRate = parseFloat(searchParams.get('taxRate') || '18')

    const cart = await cartService.getCartWithTotals(session.user.id, taxRate)

    return NextResponse.json({
      success: true,
      data: cart,
    })
  } catch (error) {
    console.error('[Cart GET Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch cart',
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only customers can add to cart
    if (session.user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can use shopping cart' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validation = addToCartSchema.safeParse(body)

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

    const { productId, quantity } = validation.data
    const taxRate = body.taxRate || 18

    const cart = await cartService.addToCart({
      customerId: session.user.id,
      productId,
      quantity,
    })

    const cartWithTotals = await cartService.getCartWithTotals(session.user.id, taxRate)

    return NextResponse.json({
      success: true,
      data: cartWithTotals,
      message: 'Item added to cart',
    })
  } catch (error) {
    console.error('[Cart POST Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add item to cart',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
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

    const cart = await cartService.clearCart(session.user.id)

    return NextResponse.json({
      success: true,
      data: cart,
      message: 'Cart cleared',
    })
  } catch (error) {
    console.error('[Cart DELETE Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to clear cart',
      },
      { status: 500 }
    )
  }
}
