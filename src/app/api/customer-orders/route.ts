import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { listCustomerOrders } from '@/services/customer-orders.service'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'customerOrders.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))

  const { orders, total } = await listCustomerOrders({ status, page, limit })
  return NextResponse.json({ orders, total, page, limit })
}
