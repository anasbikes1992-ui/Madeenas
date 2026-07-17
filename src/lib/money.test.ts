import { describe, it, expect } from 'vitest'
import {
  money,
  round2,
  round3,
  add,
  sub,
  mul,
  computeLineSubTotal,
  computeTax,
  computeSaleTotals,
  formatAmount,
  num,
} from './money'

describe('money primitives', () => {
  it('adds without floating-point drift', () => {
    // The canonical float failure: 0.1 + 0.2 === 0.30000000000000004
    expect(add(0.1, 0.2).toString()).toBe('0.3')
    expect(add(0.1, 0.2).equals(money('0.3'))).toBe(true)
  })

  it('accumulates many small amounts exactly', () => {
    let total = money(0)
    for (let i = 0; i < 100; i++) total = add(total, 0.01)
    expect(total.equals(money(1))).toBe(true)
  })

  it('rejects invalid values', () => {
    expect(() => money(NaN)).toThrow(/Invalid money value/)
    expect(() => money('abc')).toThrow(/Invalid money value/)
    expect(() => money(Infinity)).toThrow(/Invalid money value/)
  })

  it('rounds half-up to 2 decimal places', () => {
    expect(round2('1.005').toFixed(2)).toBe('1.01')
    expect(round2('2.675').toFixed(2)).toBe('2.68') // float would give 2.67
    expect(round2('1.004').toFixed(2)).toBe('1.00')
  })

  it('rounds quantities to 3 decimal places for fractional metres', () => {
    expect(round3('1.2345').toFixed(3)).toBe('1.235')
    expect(round3('0.0004').toFixed(3)).toBe('0.000')
  })

  it('subtracts and multiplies exactly', () => {
    expect(sub('0.3', '0.1').equals(money('0.2'))).toBe(true)
    expect(mul('1.1', '1.1').equals(money('1.21'))).toBe(true)
  })
})

describe('computeLineSubTotal', () => {
  it('multiplies price by quantity and rounds to currency', () => {
    expect(computeLineSubTotal('333.33', 3).toFixed(2)).toBe('999.99')
  })

  it('handles fractional metre quantities', () => {
    expect(computeLineSubTotal('250.00', '2.5').toFixed(2)).toBe('625.00')
    expect(computeLineSubTotal('99.99', '0.333').toFixed(2)).toBe('33.30')
  })
})

describe('computeTax', () => {
  it('computes VAT exactly', () => {
    expect(computeTax('1000.00', 18).toFixed(2)).toBe('180.00')
    expect(computeTax('999.99', 18).toFixed(2)).toBe('180.00')
  })

  it('supports a zero rate', () => {
    expect(computeTax('1000.00', 0).toFixed(2)).toBe('0.00')
  })

  it('rejects out-of-range rates', () => {
    expect(() => computeTax(100, -1)).toThrow(/between 0 and 100/)
    expect(() => computeTax(100, 101)).toThrow(/between 0 and 100/)
  })
})

describe('computeSaleTotals', () => {
  it('produces lines that sum exactly to the sale totals', () => {
    const totals = computeSaleTotals(
      [
        { unitPrice: '333.33', quantity: 3 },
        { unitPrice: '0.10', quantity: 3 },
        { unitPrice: '19.99', quantity: 7 },
      ],
      18
    )

    const lineSubTotals = totals.items.reduce((s, i) => s.plus(i.subTotal), money(0))
    const lineTaxes = totals.items.reduce((s, i) => s.plus(i.taxAmount), money(0))

    // The invariant that matters on a receipt: the printed lines must add up
    // to the printed total, to the cent.
    expect(lineSubTotals.equals(totals.subTotal)).toBe(true)
    expect(lineTaxes.equals(totals.taxAmount)).toBe(true)
    expect(totals.grandTotal.equals(add(totals.subTotal, totals.taxAmount))).toBe(true)
  })

  it('computes a known sale exactly', () => {
    const totals = computeSaleTotals([{ unitPrice: '1000.00', quantity: 2 }], 18)
    expect(totals.subTotal.toFixed(2)).toBe('2000.00')
    expect(totals.taxAmount.toFixed(2)).toBe('360.00')
    expect(totals.grandTotal.toFixed(2)).toBe('2360.00')
  })

  it('applies a discount after tax', () => {
    const totals = computeSaleTotals([{ unitPrice: '1000.00', quantity: 1 }], 18, '180.00')
    expect(totals.discountAmount.toFixed(2)).toBe('180.00')
    expect(totals.grandTotal.toFixed(2)).toBe('1000.00')
  })

  it('allows a discount equal to the full total', () => {
    const totals = computeSaleTotals([{ unitPrice: '100.00', quantity: 1 }], 0, '100.00')
    expect(totals.grandTotal.toFixed(2)).toBe('0.00')
  })

  it('rejects a discount larger than the total', () => {
    expect(() => computeSaleTotals([{ unitPrice: '100.00', quantity: 1 }], 0, '100.01')).toThrow(
      /cannot exceed total/
    )
  })

  it('rejects a negative discount', () => {
    expect(() => computeSaleTotals([{ unitPrice: '100.00', quantity: 1 }], 0, -1)).toThrow(
      /Discount cannot be negative/
    )
  })

  it('rejects empty, negative-price, and zero-quantity sales', () => {
    expect(() => computeSaleTotals([], 18)).toThrow(/at least one line/)
    expect(() => computeSaleTotals([{ unitPrice: -1, quantity: 1 }], 18)).toThrow(
      /Unit price cannot be negative/
    )
    expect(() => computeSaleTotals([{ unitPrice: 1, quantity: 0 }], 18)).toThrow(
      /Quantity must be positive/
    )
  })
})

describe('formatAmount and num', () => {
  it('always formats to 2 decimal places', () => {
    expect(formatAmount(5)).toBe('5.00')
    expect(formatAmount('1234.5')).toBe('1234.50')
  })

  it('converts Decimals and nullish values for display', () => {
    expect(num(money('12.34'))).toBe(12.34)
    expect(num(null)).toBe(0)
    expect(num(undefined, 7)).toBe(7)
    expect(num(3.5)).toBe(3.5)
  })
})
