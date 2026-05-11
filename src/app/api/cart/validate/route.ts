import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as cartService from '@/services/cart.service'

export async function POST(request: NextRequest) {
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
    const { locationId } = body

    if (!locationId) {
      return NextResponse.json(
        { success: false, error: 'Location ID is required' },
        { status: 400 }
      )
    }

    const validation = await cartService.validateCartStock(session.user.id, locationId)

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
