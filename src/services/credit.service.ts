/**
 * Credit (accounts receivable) service.
 *
 * Credit sales create a CreditEntry via the sale engine; this service is how
 * that debt is queried and repaid. Before this existed, credit sales recorded
 * no receivable at all and there was no way to record a repayment.
 *
 * Balances use exact decimal arithmetic (src/lib/money.ts). Payments are
 * applied oldest-entry-first, which is the conventional treatment for a
 * running shop account.
 */
import { prisma } from '@/lib/db'
import { money, round2, num } from '@/lib/money'
import { Prisma, PaymentMode, CreditEntryType } from '@prisma/client'

export class CreditError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number) {
    super(message)
    this.name = 'CreditError'
  }
}

export interface CreditSummary {
  customerId: string
  customerName: string
  customerPhone: string | null
  totalOwed: number
  creditLimit: number | null
  availableCredit: number | null
  lastActivity: Date | null
  entries: Array<{
    id: string
    type: CreditEntryType
    amount: number
    balance: number
    saleId: string | null
    receiptNo: string | null
    note: string | null
    createdAt: Date
  }>
  payments: Array<{
    id: string
    amount: number
    paymentMode: PaymentMode
    reference: string | null
    recordedByName: string
    createdAt: Date
  }>
}

/** Full receivable picture for one customer: outstanding entries and payments. */
export async function getCustomerCredit(customerId: string): Promise<CreditSummary | null> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: { id: true, name: true, phone: true, creditLimit: true },
  })
  if (!customer) return null

  const ledger = await prisma.creditLedger.findUnique({
    where: { customerId },
    include: {
      entries: {
        orderBy: { createdAt: 'desc' },
        include: { sale: { select: { receiptNo: true } } },
      },
      payments: {
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { name: true } } },
      },
    },
  })

  const totalOwed = num(ledger?.totalOwed)
  const creditLimit = customer.creditLimit === null ? null : num(customer.creditLimit)

  return {
    customerId: customer.id,
    customerName: customer.name,
    customerPhone: customer.phone,
    totalOwed,
    creditLimit,
    availableCredit: creditLimit === null ? null : round2(creditLimit - totalOwed).toNumber(),
    lastActivity: ledger?.lastActivity ?? null,
    entries: (ledger?.entries ?? []).map((entry) => ({
      id: entry.id,
      type: entry.type,
      amount: num(entry.amount),
      balance: num(entry.balance),
      saleId: entry.saleId,
      receiptNo: entry.sale?.receiptNo ?? null,
      note: entry.note,
      createdAt: entry.createdAt,
    })),
    payments: (ledger?.payments ?? []).map((payment) => ({
      id: payment.id,
      amount: num(payment.amount),
      paymentMode: payment.paymentMode,
      reference: payment.reference,
      recordedByName: payment.user.name,
      createdAt: payment.createdAt,
    })),
  }
}

export interface RecordCreditPaymentInput {
  customerId: string
  amount: number
  paymentMode: PaymentMode
  recordedBy: string
  reference?: string | null
  note?: string | null
}

export interface RecordCreditPaymentResult {
  paymentId: string
  amountApplied: number
  remainingOwed: number
  settledEntryIds: string[]
}

/**
 * Record a repayment against a customer's account.
 *
 * The payment is applied to outstanding entries oldest-first, the ledger total
 * is recomputed, and the payment row is written — all in one transaction, so a
 * payment can never be recorded without reducing the balance (or vice versa).
 */
export async function recordCreditPayment(
  input: RecordCreditPaymentInput
): Promise<RecordCreditPaymentResult> {
  const amount = round2(input.amount)
  if (amount.lessThanOrEqualTo(0)) {
    throw new CreditError('Payment amount must be greater than zero', 'INVALID_AMOUNT', 400)
  }
  if (input.paymentMode === 'CREDIT') {
    throw new CreditError('A credit payment cannot itself be on credit', 'INVALID_PAYMENT_MODE', 400)
  }

  return prisma.$transaction(async (tx) => {
    // Lock the ledger row so two concurrent payments cannot both read the same
    // balance and double-credit the customer.
    const locked = await tx.$queryRaw<Array<{ id: string; totalOwed: Prisma.Decimal }>>`
      SELECT "id", "totalOwed" FROM "CreditLedger"
      WHERE "customerId" = ${input.customerId}
      FOR UPDATE
    `
    const ledgerRow = locked[0]
    if (!ledgerRow) {
      throw new CreditError('Customer has no credit account', 'NO_LEDGER', 404)
    }

    const totalOwed = money(ledgerRow.totalOwed)
    if (amount.greaterThan(totalOwed)) {
      throw new CreditError(
        `Payment (${amount.toFixed(2)}) exceeds the outstanding balance (${totalOwed.toFixed(2)})`,
        'OVERPAYMENT',
        400
      )
    }

    // Apply oldest-first across entries that still carry a balance.
    const openEntries = await tx.creditEntry.findMany({
      where: { ledgerId: ledgerRow.id, type: CreditEntryType.CHARGE, balance: { gt: 0 } },
      orderBy: { createdAt: 'asc' },
    })

    let remaining = amount
    const settledEntryIds: string[] = []

    for (const entry of openEntries) {
      if (remaining.lessThanOrEqualTo(0)) break

      const entryBalance = money(entry.balance)
      const applied = entryBalance.lessThanOrEqualTo(remaining) ? entryBalance : remaining
      const newBalance = round2(entryBalance.minus(applied))

      await tx.creditEntry.update({
        where: { id: entry.id },
        data: { balance: newBalance },
      })

      if (newBalance.isZero()) settledEntryIds.push(entry.id)
      remaining = round2(remaining.minus(applied))
    }

    const newTotalOwed = round2(totalOwed.minus(amount))
    await tx.creditLedger.update({
      where: { id: ledgerRow.id },
      data: { totalOwed: newTotalOwed, lastActivity: new Date() },
    })

    const payment = await tx.creditPayment.create({
      data: {
        ledgerId: ledgerRow.id,
        customerId: input.customerId,
        amount,
        paymentMode: input.paymentMode,
        reference: input.reference ?? null,
        note: input.note ?? null,
        recordedBy: input.recordedBy,
      },
    })

    await tx.auditLog.create({
      data: {
        userId: input.recordedBy,
        action: 'RECORD_CREDIT_PAYMENT',
        entity: 'CreditPayment',
        entityId: payment.id,
        details: JSON.stringify({
          customerId: input.customerId,
          amount: amount.toFixed(2),
          remainingOwed: newTotalOwed.toFixed(2),
          paymentMode: input.paymentMode,
        }),
      },
    })

    return {
      paymentId: payment.id,
      amountApplied: amount.toNumber(),
      remainingOwed: newTotalOwed.toNumber(),
      settledEntryIds,
    }
  })
}

export interface OutstandingCustomer {
  customerId: string
  customerName: string
  customerPhone: string | null
  totalOwed: number
  creditLimit: number | null
  lastActivity: Date
  oldestUnpaidAt: Date | null
  daysOutstanding: number | null
}

/** Every customer with money owed, largest balance first — the AR worklist. */
export async function listOutstandingCredit(): Promise<OutstandingCustomer[]> {
  const ledgers = await prisma.creditLedger.findMany({
    where: { totalOwed: { gt: 0 } },
    include: {
      customer: { select: { id: true, name: true, phone: true, creditLimit: true } },
      entries: {
        where: { type: CreditEntryType.CHARGE, balance: { gt: 0 } },
        orderBy: { createdAt: 'asc' },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { totalOwed: 'desc' },
  })

  const now = Date.now()
  return ledgers.map((ledger) => {
    const oldestUnpaidAt = ledger.entries[0]?.createdAt ?? null
    return {
      customerId: ledger.customer.id,
      customerName: ledger.customer.name,
      customerPhone: ledger.customer.phone,
      totalOwed: num(ledger.totalOwed),
      creditLimit: ledger.customer.creditLimit === null ? null : num(ledger.customer.creditLimit),
      lastActivity: ledger.lastActivity,
      oldestUnpaidAt,
      daysOutstanding: oldestUnpaidAt
        ? Math.floor((now - oldestUnpaidAt.getTime()) / 86_400_000)
        : null,
    }
  })
}

/** Total receivables across all customers — a dashboard KPI. */
export async function getTotalReceivables(): Promise<number> {
  const result = await prisma.creditLedger.aggregate({ _sum: { totalOwed: true } })
  return num(result._sum.totalOwed)
}
