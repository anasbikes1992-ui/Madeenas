import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/get-auth-user'
import * as cartService from '@/services/cart.service'

export async function POST(request: NextRequest) {
  try {
    // Resolve web sessions AND mobile Bearer tokens, matching the rest of the
    // cart routes. This checked the session cookie only, so the mobile app —
    // which authenticates with a Bearer token — got a 401 every time it tried
    // to validate a cart before checkout.
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

    const body = await request.json()
    const { locationId } = body

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    const validation = await cartService.validateCartStock(user.id, locationId)

    return NextResponse.json({
      success: true,
      data: validation,
    })
  } catch (error) {
    console.error('[Cart Validation Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to validate cart',
      },
      { status: 500 }
    )
  }
}
