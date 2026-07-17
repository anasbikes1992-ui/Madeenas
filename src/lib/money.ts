/**
 * Exact money arithmetic for LKR amounts.
 *
 * All financial computation (sale totals, tax, credit balances, refunds)
 * MUST go through this module. Never use raw JS floating-point arithmetic
 * on money — `0.1 + 0.2 !== 0.3`.
 *
 * Built on Prisma.Decimal (decimal.js), which Prisma bundles. Amounts are
 * rounded half-up to 2 decimal places at every boundary that produces a
 * money value; quantities keep 3 decimal places (textiles sell in metres).
 */
import { Prisma } from '@prisma/client'

export type MoneyInput = Prisma.Decimal | number | string

const D = Prisma.Decimal

/** Create a Decimal from any accepted input. Throws on NaN / Infinity / garbage. */
export function money(value: MoneyInput): Prisma.Decimal {
  let d: Prisma.Decimal
  try {
    d = new D(value)
  } catch {
    // decimal.js raises its own DecimalError for unparseable input; normalise it
    // so callers only ever have to catch one error shape.
    throw new Error(`Invalid money value: ${String(value)}`)
  }
  if (!d.isFinite()) {
    throw new Error(`Invalid money value: ${String(value)}`)
  }
  return d
}

/** Round to 2 decimal places (currency), half-up. */
export function round2(value: MoneyInput): Prisma.Decimal {
  return money(value).toDecimalPlaces(2, D.ROUND_HALF_UP)
}

/** Round to 3 decimal places (stock quantity), half-up. */
export function round3(value: MoneyInput): Prisma.Decimal {
  return money(value).toDecimalPlaces(3, D.ROUND_HALF_UP)
}

export function add(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  return money(a).plus(money(b))
}

export function sub(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  return money(a).minus(money(b))
}

export function mul(a: MoneyInput, b: MoneyInput): Prisma.Decimal {
  return money(a).times(money(b))
}

export function isNegative(value: MoneyInput): boolean {
  return money(value).isNegative()
}

/** a >= b */
export function gte(a: MoneyInput, b: MoneyInput): boolean {
  return money(a).greaterThanOrEqualTo(money(b))
}

/** Line subtotal: unitPrice x quantity, rounded to currency. */
export function computeLineSubTotal(unitPrice: MoneyInput, quantity: MoneyInput): Prisma.Decimal {
  return round2(mul(unitPrice, quantity))
}

/** Tax on an amount at a percentage rate, rounded to currency. */
export function computeTax(amount: MoneyInput, ratePercent: MoneyInput): Prisma.Decimal {
  const rate = money(ratePercent)
  if (rate.isNegative() || rate.greaterThan(100)) {
    throw new Error(`Tax rate must be between 0 and 100, got ${rate.toString()}`)
  }
  return round2(mul(amount, rate).dividedBy(100))
}

export interface SaleLineInput {
  unitPrice: MoneyInput
  quantity: MoneyInput
}

export interface SaleLineTotals {
  unitPrice: Prisma.Decimal
  quantity: Prisma.Decimal
  subTotal: Prisma.Decimal
  taxRate: Prisma.Decimal
  taxAmount: Prisma.Decimal
  total: Prisma.Decimal
}

export interface SaleTotals {
  items: SaleLineTotals[]
  subTotal: Prisma.Decimal
  taxRate: Prisma.Decimal
  taxAmount: Prisma.Decimal
  discountAmount: Prisma.Decimal
  grandTotal: Prisma.Decimal
}

/**
 * Compute all totals for a sale from its lines.
 *
 * Strategy: tax is computed and rounded PER LINE, then summed — so the
 * stored line records always add up exactly to the sale totals (receipt
 * lines match the receipt total to the cent).
 *
 * The discount applies to the grand total after tax and may not exceed
 * subTotal + tax.
 */
export function computeSaleTotals(
  lines: SaleLineInput[],
  taxRatePercent: MoneyInput,
  discount: MoneyInput = 0
): SaleTotals {
  if (lines.length === 0) {
    throw new Error('A sale must have at least one line')
  }
  const taxRate = money(taxRatePercent)
  const discountAmount = round2(discount)
  if (discountAmount.isNegative()) {
    throw new Error('Discount cannot be negative')
  }

  const items: SaleLineTotals[] = lines.map((line) => {
    const unitPrice = round2(line.unitPrice)
    const quantity = round3(line.quantity)
    if (unitPrice.isNegative()) throw new Error('Unit price cannot be negative')
    if (quantity.lessThanOrEqualTo(0)) throw new Error('Quantity must be positive')

    const subTotal = computeLineSubTotal(unitPrice, quantity)
    const taxAmount = computeTax(subTotal, taxRate)
    return {
      unitPrice,
      quantity,
      subTotal,
      taxRate,
      taxAmount,
      total: add(subTotal, taxAmount),
    }
  })

  const subTotal = items.reduce((acc, i) => acc.plus(i.subTotal), new D(0))
  const taxAmount = items.reduce((acc, i) => acc.plus(i.taxAmount), new D(0))
  const beforeDiscount = add(subTotal, taxAmount)

  if (discountAmount.greaterThan(beforeDiscount)) {
    throw new Error(
      `Discount (${discountAmount.toFixed(2)}) cannot exceed total (${beforeDiscount.toFixed(2)})`
    )
  }

  return {
    items,
    subTotal,
    taxRate,
    taxAmount,
    discountAmount,
    grandTotal: sub(beforeDiscount, discountAmount),
  }
}

/** Format an amount for display / receipts (no currency symbol). */
export function formatAmount(value: MoneyInput): string {
  return round2(value).toFixed(2)
}

/**
 * Convert a Decimal (or nullable Decimal) to a plain number for display,
 * comparison, or aggregation in non-financial code paths.
 *
 * Safe for DECIMAL(12,2)/(12,3) values — they are exactly representable as
 * doubles. Do NOT use this to perform money arithmetic: use the Decimal
 * helpers above so results stay exact.
 */
export function num(value: MoneyInput | null | undefined, fallback = 0): number {
  if (value === null || value === undefined) return fallback
  return typeof value === 'number' ? value : Number(value)
}
