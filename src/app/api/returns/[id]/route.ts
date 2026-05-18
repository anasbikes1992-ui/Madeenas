import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  approveReturn,
  rejectReturn,
  markItemsReceived,
  processRefund,
} from '@/services/returns.service'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE']

// =============================================================================
// PATCH /api/returns/[id] - Update Return Status
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const isAdmin = ADMIN_ROLES.includes(session.user.role)
    const isFinance = FINANCE_ROLES.includes(session.user.role)

    const { id } = await params
    const body = await request.json()
    const { action } = body

    let result

    switch (action) {
      case 'approve':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        result = await approveReturn(
          id,
          session.user.id,
          body.adjustedRefundAmount,
          body.adminNote
        )
        break

      case 'reject':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (!body.rejectionReason) {
          return NextResponse.json(
            { error: 'Rejection reason is required' },
            { status: 400 }
          )
        }
        result = await rejectReturn(id, session.user.id, body.rejectionReason)
        break

      case 'mark_received':
        if (!isAdmin) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        result = await markItemsReceived(
          id,
          session.user.id,
          body.inspectionNote,
          body.condition
        )
        break

      case 'process_refund':
        if (!isFinance) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
        }
        if (!body.refundMethod) {
          return NextResponse.json(
            { error: 'Refund method is required' },
            { status: 400 }
          )
        }
        result = await processRefund(
          id,
          session.user.id,
          body.refundMethod,
          body.transactionReference
        )
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      returnRequest: result,
      message: `Return ${action} successfully`,
    })
  } catch (error) {
    console.error('Update return error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update return',
      },
      { status: 400 }
    )
  }
}
