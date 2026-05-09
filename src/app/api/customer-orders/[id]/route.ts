import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { customerOrderAdminUpdateSchema } from '@/lib/validations'
import { getCustomerOrderById, updateCustomerOrder } from '@/services/customer-orders.service'
import { logActivity } from '@/lib/audit'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const order = await getCustomerOrderById(id)
  if (!order) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(order)
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!ADMIN_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const existing = await getCustomerOrderById(id)
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json()
  const parsed = customerOrderAdminUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const updated = await updateCustomerOrder(id, {
      status: parsed.data.status,
      quotedPrice: parsed.data.quotedPrice,
    })

    await logActivity({
      userId: session.user.id,
      action: 'UPDATE',
      entity: 'CustomerOrder',
      entityId: id,
      details: `Status=${updated.status}, quotedPrice=${updated.quotedPrice ?? 'n/a'}`,
    })

    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}
