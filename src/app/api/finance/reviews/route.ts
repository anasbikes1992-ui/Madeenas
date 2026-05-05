import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}
  if (status) where.status = status

  const [reviews, total] = await Promise.all([
    prisma.financeReview.findMany({
      where,
      include: {
        stockOut: {
          include: {
            product: true,
            fromLocation: true,
            toLocation: true,
            requestedByUser: { select: { name: true } }
          }
        },
        reviewer: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.financeReview.count({ where }),
  ])

  return NextResponse.json({ reviews, total })
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!['SUPER_ADMIN', 'ADMIN', 'FINANCE'].includes(role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { id, status, tallyInvoiceNumber, tallyAmount, externalInvoice, externalAmount, notes } = body
  const normalizedInvoice = externalInvoice ?? tallyInvoiceNumber ?? null
  const normalizedAmount = externalAmount ?? tallyAmount ?? null

  if (!id) {
    return NextResponse.json({ error: 'Review id is required' }, { status: 400 })
  }

  const existing = await prisma.financeReview.findUnique({
    where: { id },
    include: {
      stockOut: {
        include: {
          product: true,
          fromLocation: true,
          toLocation: true,
          requestedByUser: { select: { name: true } },
        },
      },
      reviewer: { select: { name: true } },
    },
  })

  if (!existing) {
    return NextResponse.json({ error: 'Finance review not found' }, { status: 404 })
  }

  const parsedAmount = normalizedAmount == null || normalizedAmount === ''
    ? null
    : Number.parseFloat(String(normalizedAmount))

  if (parsedAmount !== null && Number.isNaN(parsedAmount)) {
    return NextResponse.json({ error: 'Invalid finance amount' }, { status: 400 })
  }

  const review = await prisma.financeReview.update({
    where: { id },
    data: {
      status,
      externalInvoice: normalizedInvoice,
      externalAmount: parsedAmount,
      notes,
      reviewedBy: session.user.id
    },
    include: {
      stockOut: {
        include: {
          product: true,
          fromLocation: true,
          toLocation: true,
          requestedByUser: { select: { name: true } },
        },
      },
      reviewer: { select: { name: true } },
    }
  })

  await logActivity({
    userId: session.user.id,
    action: 'FINANCE_MATCH',
    entity: 'FinanceReview',
    entityId: id,
    details: `Matched Stock-Out ${review.stockOutId} with Tally Inv: ${normalizedInvoice}. Amount: ${normalizedAmount}`
  })

  return NextResponse.json(review)
}
