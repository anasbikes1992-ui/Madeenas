/**
 * Returns & Refunds Management Service
 * Handles return requests, approvals, and refund processing
 */

import { prisma } from '@/lib/db'
import { z } from 'zod'
import { money, round2, mul, num } from '@/lib/money'
import { CreditEntryType } from '@prisma/client'
import { dispatchReturnNotification } from './notification-dispatcher.service'

export const createReturnSchema = z.object({
  saleId: z.string().min(1),
  items: z
    .array(
      z.object({
        saleItemId: z.string().min(1),
        quantity: z.number().positive(),
        reason: z.enum([
          'DEFECTIVE',
          'WRONG_ITEM',
          'SIZE_ISSUE',
          'COLOR_MISMATCH',
          'DAMAGED',
          'NOT_AS_DESCRIBED',
          'CHANGED_MIND',
          'OTHER',
        ]),
        note: z.string().max(500).optional(),
        images: z.array(z.string().url()).max(5).optional(),
      })
    )
    .min(1)
    .max(20),
  customerNote: z.string().max(1000).optional(),
  preferredResolution: z.enum(['REFUND', 'EXCHANGE', 'STORE_CREDIT']),
})

export type CreateReturnRequest = z.infer<typeof createReturnSchema>

export enum ReturnStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

// =============================================================================
// CREATE RETURN REQUEST
// =============================================================================

export async function createReturnRequest(
  customerId: string,
  data: CreateReturnRequest
) {
  // Validate sale exists and belongs to customer
  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: {
      items: true,
    },
  })

  if (!sale) {
    throw new Error('Sale not found')
  }

  if (sale.customerId !== customerId) {
    throw new Error('Unauthorized: Sale does not belong to this customer')
  }

  // Validate items and calculate totals
  const saleItemIds = data.items.map((item) => item.saleItemId)
  const saleItems = await prisma.saleItem.findMany({
    where: {
      id: { in: saleItemIds },
      saleId: data.saleId,
    },
    include: { variant: true },
  })

  if (saleItems.length !== data.items.length) {
    throw new Error('Some sale items not found or do not belong to this sale')
  }

  // Quantities already returned against these sale items, so the same item
  // cannot be refunded twice (the previous check only compared against the
  // original purchased quantity).
  const priorReturns = await prisma.returnItem.groupBy({
    by: ['saleItemId'],
    where: {
      saleItemId: { in: data.items.map((i) => i.saleItemId) },
      return: { status: { not: 'REJECTED' } },
    },
    _sum: { quantity: true },
  })
  const returnedSoFar = new Map(priorReturns.map((r) => [r.saleItemId, num(r._sum.quantity)]))

  // Calculate refund amount with exact decimal math.
  let totalRefund = money(0)
  const returnItemsData = data.items.map((item) => {
    const saleItem = saleItems.find((si) => si.id === item.saleItemId)
    if (!saleItem) throw new Error('Sale item not found')

    const alreadyReturned = returnedSoFar.get(item.saleItemId) ?? 0
    const remaining = num(saleItem.saleQty) - alreadyReturned
    if (item.quantity > remaining) {
      throw new Error(
        `Return quantity exceeds remaining purchased quantity (${remaining} left of ${num(saleItem.saleQty)})`
      )
    }

    // Refund the line total pro-rata, so tax and discounts are refunded fairly.
    const refundAmount = round2(
      mul(money(saleItem.total).dividedBy(money(saleItem.saleQty)), item.quantity)
    )
    totalRefund = totalRefund.plus(refundAmount)

    return {
      saleItemId: item.saleItemId,
      variantId: saleItem.variantId,
      quantity: item.quantity,
      unitPrice: saleItem.unitPrice,
      refundAmount,
      reason: item.reason,
      note: item.note || null,
      images: item.images || [],
    }
  })

  // Generate return number
  const returnNumber = await generateReturnNumber()

  // Create return request with items
  const returnRequest = await prisma.return.create({
    data: {
      returnNumber,
      saleId: data.saleId,
      customerId,
      status: 'PENDING',
      customerNote: data.customerNote || null,
      totalRefundAmount: round2(totalRefund),
      items: {
        create: returnItemsData,
      },
    },
    include: {
      items: {
        include: {
          variant: true,
        },
      },
      sale: true,
      customer: true,
    },
  })

  return returnRequest
}

// =============================================================================
// APPROVE RETURN
// =============================================================================

export async function approveReturn(
  returnId: string,
  approvedBy: string,
  adjustedRefundAmount?: number,
  adminNote?: string
) {
  const returnRequest = await prisma.return.findUnique({
    where: { id: returnId },
    include: { items: true },
  })

  if (!returnRequest) {
    throw new Error('Return request not found')
  }

  if (returnRequest.status !== 'PENDING') {
    throw new Error('Return request cannot be approved in current status')
  }

  // `??` not `||`: an intentional zero-value refund must stay zero rather than
  // silently falling back to the full requested amount.
  const finalRefundAmount = round2(adjustedRefundAmount ?? returnRequest.totalRefundAmount)
  if (finalRefundAmount.greaterThan(money(returnRequest.totalRefundAmount))) {
    throw new Error('Approved refund cannot exceed the requested refund amount')
  }

  const updated = await prisma.return.update({
    where: { id: returnId },
    data: {
      status: 'APPROVED',
      approvedBy,
      approvedAt: new Date(),
      approvedRefundAmount: finalRefundAmount,
      adminNote: adminNote || null,
    },
    include: {
      items: {
        include: { variant: true },
      },
      customer: true,
    },
  })

  // Dispatch return approval notifications
  await dispatchReturnNotification('RETURN_APPROVED', updated as any).catch((err) => {
    console.error('[Notification Error]:', err)
  })

  return updated
}

// =============================================================================
// REJECT RETURN
// =============================================================================

export async function rejectReturn(
  returnId: string,
  approvedBy: string,
  rejectionReason: string
) {
  const returnRequest = await prisma.return.findUnique({
    where: { id: returnId },
  })

  if (!returnRequest) {
    throw new Error('Return request not found')
  }

  if (returnRequest.status === 'COMPLETED') {
    throw new Error('Cannot reject completed or cancelled returns')
  }

  const updated = await prisma.return.update({
    where: { id: returnId },
    data: {
      status: 'REJECTED',
      adminNote: rejectionReason,
    },
    include: {
      customer: true,
    },
  })

  // Dispatch return rejection notifications
  await dispatchReturnNotification('RETURN_REJECTED', updated as any).catch((err) => {
    console.error('[Notification Error]:', err)
  })

  return updated
}

// =============================================================================
// MARK ITEMS RECEIVED
// =============================================================================

export async function markItemsReceived(
  returnId: string,
  approvedBy: string,
  inspectionNote?: string,
  condition?: 'GOOD' | 'ACCEPTABLE' | 'DAMAGED'
) {
  const returnRequest = await prisma.return.findUnique({
    where: { id: returnId },
    include: {
      items: {
        include: { variant: true },
      },
      sale: {
        select: {
          locationId: true,
        },
      },
    },
  })

  if (!returnRequest) {
    throw new Error('Return request not found')
  }

  if (returnRequest.status !== 'APPROVED') {
    throw new Error('Return must be approved before marking items as received')
  }

  const saleLocationId = returnRequest.sale.locationId
  if (!saleLocationId) {
    throw new Error('Cannot restore stock: sale location is missing')
  }

  // Stock restoration and the inspection note are written together: stock can
  // never be restored without the return recording it, or vice versa.
  const updated = await prisma.$transaction(async (tx) => {
    if (condition === 'GOOD' || condition === 'ACCEPTABLE') {
      for (const item of returnRequest.items) {
        await tx.stock.upsert({
          where: {
            variantId_locationId: {
              variantId: item.variantId,
              locationId: saleLocationId,
            },
          },
          create: {
            variantId: item.variantId,
            locationId: saleLocationId,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        })
      }
    }

    return tx.return.update({
      where: { id: returnId },
      data: {
        adminNote: inspectionNote || null,
      },
    })
  })

  return updated
}

// =============================================================================
// PROCESS REFUND
// =============================================================================

export async function processRefund(
  returnId: string,
  approvedBy: string,
  refundMethod: 'BANK_TRANSFER' | 'STORE_CREDIT' | 'ORIGINAL_METHOD',
  transactionReference?: string
) {
  const returnRequest = await prisma.return.findUnique({
    where: { id: returnId },
  })

  if (!returnRequest) {
    throw new Error('Return request not found')
  }

  if (returnRequest.status !== 'APPROVED') {
    throw new Error('Return must be approved before processing refund')
  }

  // `??` not `||`: an approved refund of zero must stay zero.
  const refundAmount = round2(returnRequest.approvedRefundAmount ?? returnRequest.totalRefundAmount)

  if (refundMethod === 'STORE_CREDIT' && !returnRequest.customerId) {
    throw new Error('Store credit requires a customer on the return')
  }

  // The status change and the money movement are written together: a return can
  // never be marked refunded without the store credit actually being recorded.
  const updated = await prisma.$transaction(async (tx) => {
    if (refundMethod === 'STORE_CREDIT' && returnRequest.customerId && refundAmount.greaterThan(0)) {
      const ledger = await tx.creditLedger.upsert({
        where: { customerId: returnRequest.customerId },
        update: {},
        create: { customerId: returnRequest.customerId },
        select: { id: true, totalOwed: true },
      })

      // Store credit reduces what the customer owes; a customer who owes
      // nothing ends up with a negative balance, i.e. credit to spend.
      await tx.creditEntry.create({
        data: {
          ledgerId: ledger.id,
          type: CreditEntryType.REFUND_CREDIT,
          amount: refundAmount,
          balance: 0,
          note: `Store credit for return ${returnRequest.returnNumber}`,
        },
      })

      await tx.creditLedger.update({
        where: { id: ledger.id },
        data: {
          totalOwed: round2(money(ledger.totalOwed).minus(refundAmount)),
          lastActivity: new Date(),
        },
      })
    }

    return tx.return.update({
      where: { id: returnId },
      data: {
        status: 'COMPLETED',
        refundMethod,
        adminNote: transactionReference ? `Transaction Ref: ${transactionReference}` : undefined,
      },
      include: {
        customer: true,
      },
    })
  })

  // BANK_TRANSFER and ORIGINAL_METHOD are settled outside the system; the
  // transactionReference is the audit trail for those.

  // Dispatch refund completion notifications
  await dispatchReturnNotification('RETURN_REFUNDED', updated as any).catch((err) => {
    console.error('[Notification Error]:', err)
  })

  return updated
}

// =============================================================================
// LIST RETURNS
// =============================================================================

export async function listReturns(filters: {
  customerId?: string
  status?: string
  page?: number
  limit?: number
}) {
  const { customerId, status, page = 1, limit = 20 } = filters

  const where: any = {}
  if (customerId) where.customerId = customerId
  if (status) where.status = status

  const [returns, total] = await Promise.all([
    prisma.return.findMany({
      where,
      include: {
        items: {
          include: { variant: true },
        },
        customer: {
          select: { id: true, name: true, email: true },
        },
        sale: {
          select: { receiptNo: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.return.count({ where }),
  ])

  return { returns, total, page, limit }
}

// =============================================================================
// HELPERS
// =============================================================================

async function generateReturnNumber(): Promise<string> {
  const year = new Date().getFullYear()
  const lastReturn = await prisma.return.findFirst({
    where: {
      returnNumber: { startsWith: `RET-${year}-` },
    },
    orderBy: { createdAt: 'desc' },
    select: { returnNumber: true },
  })

  let sequence = 1
  if (lastReturn) {
    const match = lastReturn.returnNumber.match(/RET-\d{4}-(\d{4})/)
    if (match) {
      sequence = parseInt(match[1], 10) + 1
    }
  }

  return `RET-${year}-${sequence.toString().padStart(4, '0')}`
}
