/**
 * Integration tests for the credit (accounts receivable) service against the
 * real database.
 */
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'
import { createSale } from './sales.service'
import { recordCreditPayment, getCustomerCredit, getTotalReceivables, CreditError } from './credit.service'
import { num } from '@/lib/money'

const TAG = `credit-itest-${Date.now()}`

let locationId: string
let userId: string
let categoryId: string
let productId: string
let variantId: string
let customerId: string
let customerPhone: string

async function setStock(quantity: number) {
  await prisma.stock.upsert({
    where: { variantId_locationId: { variantId, locationId } },
    update: { quantity },
    create: { variantId, locationId, quantity },
  })
}

/** A credit sale of `qty` units at 100.00 + 18% VAT = 118.00 per unit. */
async function makeCreditSale(qty: number) {
  return createSale({
    locationId,
    soldById: userId,
    items: [{ variantId, saleQty: qty }],
    paymentMode: 'CREDIT',
    customerName: 'Credit Customer',
    customerPhone,
    isCreditEligible: true,
  })
}

async function clearSalesAndLedger() {
  const sales = await prisma.sale.findMany({ where: { locationId }, select: { id: true } })
  const saleIds = sales.map((s) => s.id)
  await prisma.auditLog.deleteMany({ where: { saleId: { in: saleIds } } })
  await prisma.creditPayment.deleteMany({ where: { customerId } })
  await prisma.creditEntry.deleteMany({ where: { ledger: { customerId } } })
  await prisma.creditLedger.deleteMany({ where: { customerId } })
  await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } })
  await prisma.sale.deleteMany({ where: { locationId } })
}

beforeAll(async () => {
  const location = await prisma.location.create({
    data: { name: `${TAG}-loc`, code: `${TAG}`.slice(0, 40), type: 'SHOP' },
  })
  locationId = location.id

  const user = await prisma.user.create({
    data: {
      name: `${TAG}-user`,
      email: `${TAG}@example.test`,
      password: 'x'.repeat(20),
      role: 'ADMIN',
      locationId,
    },
  })
  userId = user.id

  const category = await prisma.category.create({ data: { name: `${TAG}-cat`, slug: `${TAG}-cat` } })
  categoryId = category.id

  const product = await prisma.product.create({ data: { name: `${TAG}-product`, categoryId } })
  productId = product.id

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku: `${TAG}-sku`,
      colorName: 'Blue',
      stockUnit: 'metres',
      stockUnitLabel: 'Metres',
      saleUnit: 'metres',
      saleUnitLabel: 'Metres',
      saleToStockFactor: 1,
      salePrice: '100.00',
      costPrice: '60.00',
    },
  })
  variantId = variant.id

  customerPhone = `+9471${Date.now().toString().slice(-7)}`
  const customer = await prisma.customer.create({
    data: { name: 'Credit Customer', phone: customerPhone, isCreditEligible: true },
  })
  customerId = customer.id
})

beforeEach(async () => {
  await clearSalesAndLedger()
  await setStock(1000)
})

afterAll(async () => {
  await clearSalesAndLedger()
  await prisma.auditLog.deleteMany({ where: { userId } })
  await prisma.stock.deleteMany({ where: { variantId } })
  await prisma.productVariant.deleteMany({ where: { id: variantId } })
  await prisma.product.deleteMany({ where: { id: productId } })
  await prisma.category.deleteMany({ where: { id: categoryId } })
  await prisma.customer.deleteMany({ where: { id: customerId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.location.deleteMany({ where: { id: locationId } })
  await prisma.$disconnect()
})

describe('credit ledger', () => {
  it('accumulates debt across multiple credit sales', async () => {
    await makeCreditSale(1) // 118.00
    await makeCreditSale(2) // 236.00

    const credit = await getCustomerCredit(customerId)
    expect(credit!.totalOwed).toBe(354)
    expect(credit!.entries).toHaveLength(2)
  })

  it('applies a partial payment oldest-entry-first', async () => {
    const first = await makeCreditSale(1) // 118.00
    await makeCreditSale(1) // 118.00 -> 236.00 owed

    const result = await recordCreditPayment({
      customerId,
      amount: 118,
      paymentMode: 'CASH',
      recordedBy: userId,
    })

    expect(result.remainingOwed).toBe(118)
    expect(result.settledEntryIds).toHaveLength(1)

    const credit = await getCustomerCredit(customerId)
    expect(credit!.totalOwed).toBe(118)

    // The oldest charge is the one that got settled.
    const settled = credit!.entries.find((e) => e.saleId === first.id)
    expect(settled!.balance).toBe(0)
  })

  it('settles the account exactly with a full payment', async () => {
    await makeCreditSale(1) // 118.00

    const result = await recordCreditPayment({
      customerId,
      amount: 118,
      paymentMode: 'BANK_TRANSFER',
      recordedBy: userId,
      reference: 'TXN-123',
    })

    expect(result.remainingOwed).toBe(0)

    const credit = await getCustomerCredit(customerId)
    expect(credit!.totalOwed).toBe(0)
    expect(credit!.payments).toHaveLength(1)
    expect(credit!.payments[0].reference).toBe('TXN-123')
  })

  it('splits one payment across several charges', async () => {
    await makeCreditSale(1) // 118.00
    await makeCreditSale(1) // 118.00
    await makeCreditSale(1) // 118.00 -> 354.00

    // 150 settles the first charge fully and part of the second.
    const result = await recordCreditPayment({
      customerId,
      amount: 150,
      paymentMode: 'CASH',
      recordedBy: userId,
    })

    expect(result.remainingOwed).toBe(204)
    expect(result.settledEntryIds).toHaveLength(1)

    const credit = await getCustomerCredit(customerId)
    const balances = credit!.entries.map((e) => e.balance).sort((a, b) => a - b)
    expect(balances).toEqual([0, 86, 118])
  })

  it('rejects an overpayment', async () => {
    await makeCreditSale(1) // 118.00

    await expect(
      recordCreditPayment({
        customerId,
        amount: 118.01,
        paymentMode: 'CASH',
        recordedBy: userId,
      })
    ).rejects.toBeInstanceOf(CreditError)

    // Balance untouched by the rejected attempt.
    const credit = await getCustomerCredit(customerId)
    expect(credit!.totalOwed).toBe(118)
  })

  it('rejects zero, negative, and credit-mode payments', async () => {
    await makeCreditSale(1)

    await expect(
      recordCreditPayment({ customerId, amount: 0, paymentMode: 'CASH', recordedBy: userId })
    ).rejects.toThrow(/greater than zero/)

    await expect(
      recordCreditPayment({ customerId, amount: -50, paymentMode: 'CASH', recordedBy: userId })
    ).rejects.toThrow(/greater than zero/)

    await expect(
      recordCreditPayment({ customerId, amount: 50, paymentMode: 'CREDIT', recordedBy: userId })
    ).rejects.toThrow(/cannot itself be on credit/)
  })

  it('does not double-credit under concurrent payments', async () => {
    await makeCreditSale(1) // 118.00 owed

    // Two simultaneous payments of 100 against a 118 balance: one must fail,
    // otherwise the customer is credited 200 against a 118 debt.
    const results = await Promise.allSettled([
      recordCreditPayment({ customerId, amount: 100, paymentMode: 'CASH', recordedBy: userId }),
      recordCreditPayment({ customerId, amount: 100, paymentMode: 'CASH', recordedBy: userId }),
    ])

    const succeeded = results.filter((r) => r.status === 'fulfilled')
    expect(succeeded).toHaveLength(1)

    const credit = await getCustomerCredit(customerId)
    expect(credit!.totalOwed).toBe(18)
  })

  it('enforces the customer credit limit at sale time', async () => {
    await prisma.customer.update({ where: { id: customerId }, data: { creditLimit: '200.00' } })

    await makeCreditSale(1) // 118.00 -> within limit

    // A second sale would take the balance to 236.00, over the 200.00 limit.
    await expect(makeCreditSale(1)).rejects.toThrow(/Credit limit exceeded/)

    const credit = await getCustomerCredit(customerId)
    expect(credit!.totalOwed).toBe(118)
    expect(credit!.availableCredit).toBe(82)

    await prisma.customer.update({ where: { id: customerId }, data: { creditLimit: null } })
  })

  it('reports total receivables across customers', async () => {
    await makeCreditSale(1)
    const total = await getTotalReceivables()
    expect(total).toBeGreaterThanOrEqual(118)
  })
})
