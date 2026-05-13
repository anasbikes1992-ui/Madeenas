import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { updatePriceRule, deletePriceRule } from '@/services/pricing.service'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

// =============================================================================
// PATCH /api/pricing/rules/[id] - Update Price Rule
// =============================================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const rule = await updatePriceRule(params.id, body)

    return NextResponse.json({
      success: true,
      rule,
      message: 'Price rule updated successfully',
    })
  } catch (error) {
    console.error('Update price rule error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to update price rule',
      },
      { status: 400 }
    )
  }
}

// =============================================================================
// DELETE /api/pricing/rules/[id] - Delete Price Rule
// =============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await deletePriceRule(params.id)

    return NextResponse.json({
      success: true,
      message: 'Price rule deleted successfully',
    })
  } catch (error) {
    console.error('Delete price rule error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to delete price rule',
      },
      { status: 400 }
    )
  }
}
