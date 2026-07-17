import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import * as cartService from '@/services/cart.service'
import { addToCartSchema, updateCartItemSchema, removeFromCartSchema } from '@/lib/validation'

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // No hardcoded fallback: when the client does not pin a rate, the cart uses
    // the configured VAT rate. Defaulting to 18 here silently overrode the
    // setting on every request.
    const { searchParams } = new URL(request.url)
    const taxRateParam = searchParams.get('taxRate')
    const taxRate = taxRateParam !== null ? Number(taxRateParam) : undefined
    const validTaxRate =
      taxRate !== undefined && Number.isFinite(taxRate) && taxRate >= 0 && taxRate <= 100
        ? taxRate
        : undefined

    const cart = await cartService.getCartWithTotals(user.id, validTaxRate)

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
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only customers can add to cart
    if (user.role !== 'CUSTOMER') {
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

    const { variantId, quantity } = validation.data
    const taxRate = body.taxRate || 18

    const cart = await cartService.addToCart({
      customerId: user.id,
      variantId,
      quantity,
    })

    const cartWithTotals = await cartService.getCartWithTotals(user.id, taxRate)

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
    const user = await getAuthUser(request)
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'CUSTOMER') {
      return NextResponse.json(
        { success: false, error: 'Only customers can use shopping cart' },
        { status: 403 }
      )
    }

    const cart = await cartService.clearCart(user.id)

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
