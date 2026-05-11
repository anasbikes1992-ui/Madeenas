import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import * as ordersService from '@/services/orders.service'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 })
    }

    // Only admin/store keeper can fulfill orders
    if (!['ADMIN', 'SUPER_ADMIN', 'STORE_KEEPER'].includes(session.user.role || '')) {
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
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

    const result = await ordersService.fulfillOrder(
      params.id,
      session.user.id,
      locationId
    )

    // TODO: Send fulfillment notification to customer (email/SMS with tracking)

    return NextResponse.json({
      success: true,
      data: {
        order: result.order,
        sale: result.sale,
      },
      message: 'Order fulfilled successfully',
    })
  } catch (error) {
    console.error('[Order Fulfill Error]:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fulfill order',
      },
      { status: 500 }
    )
  }
}
