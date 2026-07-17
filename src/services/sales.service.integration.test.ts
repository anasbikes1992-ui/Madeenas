/**
 * Integration tests for the sale engine, run against the real database.
 *
 * These cover the invariants that unit tests cannot: concurrency, atomic
 * receipt numbering, and server-side pricing. Each test creates and cleans
 * up its own fixtures.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { prisma } from '@/lib/db'
import { createSale, InsufficientStockError, PriceMismatchError } from './sales.service'
import { num } from '@/lib/money'

const TAG = `itest-${Date.now()}`

let locationId: string
let userId: string
let categoryId: string
let productId: string
let variantId: string

async function setStock(quantity: number) {
  await prisma.stock.upsert({
    where: { variantId_locationId: { variantId, locationId } },
    update: { quantity },
    create: { variantId, locationId, quantity },
  })
}

beforeAll(async () => {
  const location = await prisma.location.create({
    data: { name: `${TAG}-loc`, code: `${TAG}-code`.slice(0, 40), type: 'SHOP' },
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

  const category = await prisma.category.create({
    data: { name: `${TAG}-cat`, slug: `${TAG}-cat` },
  })
  categoryId = category.id

  const product = await prisma.product.create({
    data: { name: `${TAG}-product`, categoryId },
  })
  productId = product.id

  const variant = await prisma.productVariant.create({
    data: {
      productId,
      sku: `${TAG}-sku`,
      colorName: 'Red',
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
})

afterAll(async () => {
  // Remove in FK dependency order.
  const sales = await prisma.sale.findMany({ where: { locationId }, select: { id: true } })
  const saleIds = sales.map((s) => s.id)
  await prisma.auditLog.deleteMany({ where: { saleId: { in: saleIds } } })
  await prisma.creditEntry.deleteMany({ where: { saleId: { in: saleIds } } })
  await prisma.saleItem.deleteMany({ where: { saleId: { in: saleIds } } })
  await prisma.sale.deleteMany({ where: { locationId } })
  await prisma.auditLog.deleteMany({ where: { userId } })
  await prisma.stock.deleteMany({ where: { variantId } })
  await prisma.productVariant.deleteMany({ where: { id: variantId } })
  await prisma.product.deleteMany({ where: { id: productId } })
  await prisma.category.deleteMany({ where: { id: categoryId } })
  await prisma.user.deleteMany({ where: { id: userId } })
  await prisma.location.deleteMany({ where: { id: locationId } })
  await prisma.$disconnect()
})

describe('createSale — pricing', () => {
  it('prices from the database and ignores client-supplied totals', async () => {
    await setStock(100)

    const sale = await createSale({
      locationId,
      soldById: userId,
      items: [{ variantId, saleQty: 2 }],
      paymentMode: 'CASH',
    })

    // 2 x 100.00 = 200.00 subtotal, +18% VAT = 236.00
    expect(num(sale.subTotal)).toBe(200)
    expect(num(sale.taxAmount)).toBe(36)
    expect(num(sale.grandTotal)).toBe(236)
  })

  it('captures real cost and profit per line', async () => {
    await setStock(100)

    const sale = await createSale({
      locationId,
      soldById: userId,
      items: [{ variantId, saleQty: 2 }],
      paymentMode: 'CASH',
    })

    // Was hardcoded to 0 before the fix; profit = 200.00 - (60.00 x 2)
    expect(num(sale.items[0].costAtSale)).toBe(60)
    expect(num(sale.items[0].profitAmount)).toBe(80)
  })

  it('rejects a sale whose client total is stale', async () => {
    await setStock(100)

    await expect(
      createSale({
        locationId,
        soldById: userId,
        items: [{ variantId, saleQty: 2 }],
        paymentMode: 'CASH',
        expectedGrandTotal: 1, // client thinks it costs 1.00
      })
    ).rejects.toBeInstanceOf(PriceMismatchError)
  })
})

describe('createSale — stock guards', () => {
  it('refuses to sell more than is in stock', async () => {
    await setStock(5)

    await expect(
      createSale({
        locationId,
        soldById: userId,
        items: [{ variantId, saleQty: 6 }],
        paymentMode: 'CASH',
      })
    ).rejects.toBeInstanceOf(InsufficientStockError)

    const stock = await prisma.stock.findUnique({
      where: { variantId_locationId: { variantId, locationId } },
    })
    expect(num(stock!.quantity)).toBe(5)
  })

  it('does not oversell under concurrency and never goes negative', async () => {
    await setStock(10)

    // 20 concurrent sales of 1 unit each against 10 units of stock.
    const results = await Promise.allSettled(
      Array.from({ length: 20 }, () =>
        createSale({
          locationId,
          soldById: userId,
          items: [{ variantId, saleQty: 1 }],
          paymentMode: 'CASH',
        })
      )
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled')
    const failed = results.filter((r) => r.status === 'rejected')

    expect(succeeded).toHaveLength(10)
    expect(failed).toHaveLength(10)

    const stock = await prisma.stock.findUnique({
      where: { variantId_locationId: { variantId, locationId } },
    })
    expect(num(stock!.quantity)).toBe(0)
  })

  it('allocates unique receipt numbers under concurrency', async () => {
    await setStock(10)

    const results = await Promise.all(
      Array.from({ length: 10 }, () =>
        createSale({
          locationId,
          soldById: userId,
          items: [{ variantId, saleQty: 1 }],
          paymentMode: 'CASH',
        })
      )
    )

    const receiptNos = results.map((s) => s.receiptNo)
    expect(new Set(receiptNos).size).toBe(10)
    expect(receiptNos.every((r) => /^RCP-\d{8}-\d{6}$/.test(r))).toBe(true)
  })
})

describe('createSale — credit', () => {
  it('records a receivable for credit sales and blocks ineligible customers', async () => {
    await setStock(100)
    const phone = `+9477${Date.now().toString().slice(-7)}`

    // Not credit-eligible -> rejected.
    await expect(
      createSale({
        locationId,
        soldById: userId,
        items: [{ variantId, saleQty: 1 }],
        paymentMode: 'CREDIT',
        customerName: 'Credit Test',
        customerPhone: phone,
        isCreditEligible: false,
      })
    ).rejects.toThrow(/not eligible for credit/)

    // Eligible -> sale recorded with a matching ledger balance.
    const sale = await createSale({
      locationId,
      soldById: userId,
      items: [{ variantId, saleQty: 1 }],
      paymentMode: 'CREDIT',
      customerName: 'Credit Test',
      customerPhone: phone,
      isCreditEligible: true,
    })

    const ledger = await prisma.creditLedger.findUnique({
      where: { customerId: sale.customerId! },
      include: { entries: true },
    })

    expect(ledger).not.toBeNull()
    expect(num(ledger!.totalOwed)).toBe(num(sale.grandTotal))
    expect(ledger!.entries).toHaveLength(1)
    expect(num(ledger!.entries[0].amount)).toBe(num(sale.grandTotal))

    // Cleanup customer-scoped rows.
    await prisma.creditEntry.deleteMany({ where: { ledgerId: ledger!.id } })
    await prisma.creditLedger.delete({ where: { id: ledger!.id } })
    await prisma.auditLog.deleteMany({ where: { saleId: sale.id } })
    await prisma.saleItem.deleteMany({ where: { saleId: sale.id } })
    await prisma.sale.delete({ where: { id: sale.id } })
    await prisma.customer.delete({ where: { id: sale.customerId! } })
  })
})
