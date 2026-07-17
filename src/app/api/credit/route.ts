import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { listOutstandingCredit, getTotalReceivables } from '@/services/credit.service'
import { captureApiError } from '@/lib/logger'

export const dynamic = 'force-dynamic'

/**
 * GET /api/credit
 * Outstanding receivables across all customers, plus the total — the AR worklist.
 */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'credit.read', session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const [customers, totalReceivables] = await Promise.all([
      listOutstandingCredit(),
      getTotalReceivables(),
    ])
    return NextResponse.json({ customers, totalReceivables })
  } catch (error) {
    captureApiError(error, { route: 'GET /api/credit' })
    return NextResponse.json({ error: 'Failed to load credit accounts' }, { status: 500 })
  }
}
