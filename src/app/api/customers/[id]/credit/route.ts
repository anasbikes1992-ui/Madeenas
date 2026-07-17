import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { getCustomerCredit } from '@/services/credit.service'
import { captureApiError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/customers/[id]/credit
 * One customer's credit account: outstanding balance, charges, and payments.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'credit.read', session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const credit = await getCustomerCredit(id)
    if (!credit) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 })
    }
    return NextResponse.json(credit)
  } catch (error) {
    captureApiError(error, { route: 'GET /api/customers/[id]/credit' })
    return NextResponse.json({ error: 'Failed to load credit account' }, { status: 500 })
  }
}
