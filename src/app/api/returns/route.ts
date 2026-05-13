import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { createReturnRequest, listReturns, ReturnStatus } from '@/services/returns.service'
import { z } from 'zod'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']

// =============================================================================
// POST /api/returns - Create Return Request
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const returnRequest = await createReturnRequest(session.user.id, body)

    return NextResponse.json({
      success: true,
      returnRequest,
      message: 'Return request created successfully',
    })
  } catch (error) {
    console.error('Create return request error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create return request',
      },
      { status: 400 }
    )
  }
}

// =============================================================================
// GET /api/returns - List Returns
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as ReturnStatus | null
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    // Admin can see all returns, customers only their own
    const isAdmin = ADMIN_ROLES.includes(session.user.role)
    const customerId = isAdmin ? undefined : session.user.id

    const result = await listReturns({
      customerId,
      status: status || undefined,
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('List returns error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch returns' },
      { status: 500 }
    )
  }
}
