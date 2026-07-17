import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import { recordCreditPayment, CreditError } from '@/services/credit.service'
import { captureApiError } from '@/lib/logger'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const paymentSchema = z.object({
  customerId: z.string().min(1, 'Customer is required'),
  amount: z.coerce.number().positive('Payment amount must be greater than zero'),
  // CREDIT is excluded: a repayment cannot itself be on credit.
  paymentMode: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE']),
  reference: z.string().max(128).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
})

/**
 * POST /api/credit/payments
 * Record a repayment against a customer's outstanding balance.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'credit.recordPayment', session.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = paymentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid payment', details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  try {
    const result = await recordCreditPayment({
      ...parsed.data,
      recordedBy: session.user.id as string,
    })
    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof CreditError) {
      return NextResponse.json({ error: error.message, code: error.code }, { status: error.status })
    }
    captureApiError(error, { route: 'POST /api/credit/payments' })
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 })
  }
}
