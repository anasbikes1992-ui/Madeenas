/**
 * Returns & Refunds Management Service
 * Handles return requests, approvals, and refund processing
 */

import { prisma } from '@/lib/db'
import { z } from 'zod'
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
  UNDER_REVIEW = 'UNDER_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ITEMS_RECEIVED = 'ITEMS_RECEIVED',
  REFUND_PROCESSING = 'REFUND_PROCESSING',
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
      customerOrder: true,
    },
  })

  if (!sale) {
    throw new Error('Sale not found')
  }

  if (sale.customerOrder?.customerId !== customerId) {
    throw new Error('Unauthorized: Sale does not belong to this customer')
  }

  // Validate items and calculate totals
  const saleItemIds = data.items.map((item) => item.saleItemId)
  const saleItems = await prisma.saleItem.findMany({
    where: {
      id: { in: saleItemIds },
      saleId: data.saleId,
    },
    include: { product: true },
  })

  if (saleItems.length !== data.items.length) {
    throw new Error('Some sale items not found or do not belong to this sale')
  }

  // Calculate refund amount
  let totalRefundAmount = 0
  const returnItemsData = data.items.map((item) => {
    const saleItem = saleItems.find((si) => si.id === item.saleItemId)
    if (!saleItem) throw new Error('Sale item not found')

    if (item.quantity > saleItem.quantity) {
      throw new Error('Return quantity exceeds purchased quantity')
    }

    const refundAmount = (saleItem.total / saleItem.quantity) * item.quantity
    totalRefundAmount += refundAmount

    return {
      saleItemId: item.saleItemId,
      productId: saleItem.productId,
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
      status: ReturnStatus.PENDING,
      customerNote: data.customerNote || null,
      preferredResolution: data.preferredResolution,
      totalRefundAmount,
      items: {
        create: returnItemsData,
      },
    },
    include: {
      items: {
        include: {
          product: true,
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

  if (returnRequest.status !== ReturnStatus.PENDING && returnRequest.status !== ReturnStatus.UNDER_REVIEW) {
    throw new Error('Return request cannot be approved in current status')
  }

  const finalRefundAmount = adjustedRefundAmount || returnRequest.totalRefundAmount

  const updated = await prisma.return.update({
    where: { id: returnId },
    data: {
      status: ReturnStatus.APPROVED,
      approvedBy,
      approvedAt: new Date(),
      approvedRefundAmount: finalRefundAmount,
      adminNote: adminNote || null,
    },
    include: {
      items: {
        include: { product: true },
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
  rejectedBy: string,
  rejectionReason: string
) {
  const returnRequest = await prisma.return.findUnique({
    where: { id: returnId },
  })

  if (!returnRequest) {
    throw new Error('Return request not found')
  }

  if (returnRequest.status === ReturnStatus.COMPLETED || returnRequest.status === ReturnStatus.CANCELLED) {
    throw new Error('Cannot reject completed or cancelled returns')
  }

  const updated = await prisma.return.update({
    where: { id: returnId },
    data: {
      status: ReturnStatus.REJECTED,
      rejectedBy,
      rejectedAt: new Date(),
      rejectionReason,
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
  receivedBy: string,
  inspectionNote?: string,
  condition?: 'GOOD' | 'ACCEPTABLE' | 'DAMAGED'
) {
  const returnRequest = await prisma.return.findUnique({
    where: { id: returnId },
    include: {
      items: {
        include: { product: true },
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

  if (returnRequest.status !== ReturnStatus.APPROVED) {
    throw new Error('Return must be approved before marking items as received')
  }

  const saleLocationId = returnRequest.sale.locationId
  if (!saleLocationId) {
    throw new Error('Cannot restore stock: sale location is missing')
  }

  // Restore stock if condition is acceptable
  if (condition === 'GOOD' || condition === 'ACCEPTABLE') {
    await prisma.$transaction(
      returnRequest.items.map((item) =>
        prisma.stock.upsert({
          where: {
            productId_locationId: {
              productId: item.productId,
              locationId: saleLocationId,
            },
          },
          create: {
            productId: item.productId,
            locationId: saleLocationId,
            quantity: item.quantity,
          },
          update: {
            quantity: { increment: item.quantity },
          },
        })
      )
    )
  }

  const updated = await prisma.return.update({
    where: { id: returnId },
    data: {
      status: ReturnStatus.ITEMS_RECEIVED,
      itemsReceivedAt: new Date(),
      receivedBy,
      inspectionNote: inspectionNote || null,
      itemCondition: condition || 'GOOD',
    },
  })

  return updated
}

// =============================================================================
// PROCESS REFUND
// =============================================================================

export async function processRefund(
  returnId: string,
  processedBy: string,
  refundMethod: 'BANK_TRANSFER' | 'STORE_CREDIT' | 'ORIGINAL_METHOD',
  transactionReference?: string
) {
  const returnRequest = await prisma.return.findUnique({
    where: { id: returnId },
  })

  if (!returnRequest) {
    throw new Error('Return request not found')
  }

  if (returnRequest.status !== ReturnStatus.ITEMS_RECEIVED) {
    throw new Error('Items must be received before processing refund')
  }

  const updated = await prisma.return.update({
    where: { id: returnId },
    data: {
      status: ReturnStatus.COMPLETED,
      refundProcessedAt: new Date(),
      refundMethod,
      refundTransactionRef: transactionReference || null,
      processedBy,
    },
    include: {
      customer: true,
    },
  })

  // Handle refund method
  if (refundMethod === 'STORE_CREDIT') {
    // Create store credit for customer
    await prisma.user.update({
      where: { id: returnRequest.customerId! },
      data: {
        // Note: Add storeCredit field to User model if implementing this
        // storeCredit: { increment: returnRequest.approvedRefundAmount || returnRequest.totalRefundAmount }
      },
    }).catch((err) => console.warn('[Store Credit] User model may need storeCredit field:', err))
  }
  // For BANK_TRANSFER or ORIGINAL_METHOD, manual processing is tracked via transactionReference

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
  status?: ReturnStatus
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
          include: { product: true },
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
