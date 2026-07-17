/**
 * Tax calculation utilities (VAT).
 *
 * All arithmetic delegates to src/lib/money.ts, which uses exact decimal
 * math — never raw floating point. This module keeps a number-based API for
 * display/UI callers; the authoritative sale figures are computed by
 * services/sales.service.ts.
 *
 * The default rate here is a fallback only: the live VAT rate comes from
 * AppSetting via `getVatRate()` (src/lib/settings.ts).
 */

import { round2, computeTax as computeTaxDecimal, mul, money } from '@/lib/money';

// =============================================================================
// TAX CONFIGURATION
// =============================================================================

export const TAX_CONFIG = {
  /** Fallback only — prefer `getVatRate()` from src/lib/settings.ts. */
  DEFAULT_RATE: 18,
  ZERO_RATED_CATEGORIES: [] as string[], // Future: zero-rated product categories
  EXEMPT_CUSTOMER_IDS: [] as string[], // Future: tax-exempt customers
} as const;

// =============================================================================
// TYPES
// =============================================================================

export interface TaxCalculation {
  subTotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
}

export interface LineItemTax {
  quantity: number;
  unitPrice: number;
  subTotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export interface TaxBreakdown {
  items: LineItemTax[];
  subTotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
}

// =============================================================================
// CORE TAX FUNCTIONS
// =============================================================================

/**
 * Calculate tax amount from a subtotal
 * @param amount - Subtotal amount (before tax)
 * @param rate - Tax rate percentage (default 18%)
 * @returns Tax amount
 */
export function calculateTax(
  amount: number,
  rate: number = TAX_CONFIG.DEFAULT_RATE
): number {
  if (amount < 0) {
    throw new Error('Amount cannot be negative');
  }

  return computeTaxDecimal(amount, rate).toNumber();
}

/**
 * Calculate grand total including tax
 * @param subTotal - Subtotal amount (before tax)
 * @param taxRate - Tax rate percentage (default 18%)
 * @returns Complete tax calculation breakdown
 */
export function calculateGrandTotal(
  subTotal: number,
  taxRate: number = TAX_CONFIG.DEFAULT_RATE
): TaxCalculation {
  const taxAmount = calculateTax(subTotal, taxRate);

  return {
    subTotal,
    taxRate,
    taxAmount,
    grandTotal: round2(money(subTotal).plus(taxAmount)).toNumber(),
  };
}

/**
 * Calculate tax for a single line item
 * @param quantity - Quantity of items
 * @param unitPrice - Price per unit
 * @param taxRate - Tax rate percentage (default 18%)
 * @returns Line item tax calculation
 */
export function calculateLineItemTax(
  quantity: number,
  unitPrice: number,
  taxRate: number = TAX_CONFIG.DEFAULT_RATE
): LineItemTax {
  if (quantity <= 0) {
    throw new Error('Quantity must be greater than 0');
  }
  if (unitPrice < 0) {
    throw new Error('Unit price cannot be negative');
  }

  const subTotal = round2(mul(unitPrice, quantity)).toNumber();
  const taxAmount = calculateTax(subTotal, taxRate);

  return {
    quantity,
    unitPrice,
    subTotal,
    taxRate,
    taxAmount,
    total: round2(money(subTotal).plus(taxAmount)).toNumber(),
  };
}

/**
 * Calculate tax for multiple line items
 * @param items - Array of items with quantity and unitPrice
 * @param taxRate - Tax rate percentage (default 18%)
 * @returns Complete tax breakdown for all items
 */
export function calculateMultipleItemsTax(
  items: Array<{ quantity: number; unitPrice: number }>,
  taxRate: number = TAX_CONFIG.DEFAULT_RATE
): TaxBreakdown {
  const itemsWithTax = items.map((item) =>
    calculateLineItemTax(item.quantity, item.unitPrice, taxRate)
  );

  // Sum exactly, so the lines always add up to the totals to the cent.
  const subTotal = round2(
    itemsWithTax.reduce((sum, item) => sum.plus(item.subTotal), money(0))
  ).toNumber();
  const taxAmount = round2(
    itemsWithTax.reduce((sum, item) => sum.plus(item.taxAmount), money(0))
  ).toNumber();

  return {
    items: itemsWithTax,
    subTotal,
    taxRate,
    taxAmount,
    grandTotal: round2(money(subTotal).plus(taxAmount)).toNumber(),
  };
}

// =============================================================================
// REVERSE TAX CALCULATIONS (for price-inclusive-of-tax scenarios)
// =============================================================================

/**
 * Extract tax amount from a total that includes tax
 * @param totalWithTax - Total amount including tax
 * @param taxRate - Tax rate percentage (default 18%)
 * @returns Tax amount embedded in the total
 */
export function extractTaxFromTotal(
  totalWithTax: number,
  taxRate: number = TAX_CONFIG.DEFAULT_RATE
): number {
  if (totalWithTax < 0) {
    throw new Error('Total cannot be negative');
  }
  if (taxRate < 0 || taxRate > 100) {
    throw new Error('Tax rate must be between 0 and 100');
  }

  // Formula: taxAmount = total × (rate / (100 + rate))
  return round2(mul(totalWithTax, taxRate).dividedBy(money(100).plus(taxRate))).toNumber();
}

/**
 * Calculate subtotal from a total that includes tax
 * @param totalWithTax - Total amount including tax
 * @param taxRate - Tax rate percentage (default 18%)
 * @returns Subtotal before tax
 */
export function extractSubTotalFromTotal(
  totalWithTax: number,
  taxRate: number = TAX_CONFIG.DEFAULT_RATE
): number {
  const taxAmount = extractTaxFromTotal(totalWithTax, taxRate);
  return round2(money(totalWithTax).minus(taxAmount)).toNumber();
}

/**
 * Break down a total that includes tax into components
 * @param totalWithTax - Total amount including tax
 * @param taxRate - Tax rate percentage (default 18%)
 * @returns Complete breakdown of the total
 */
export function breakdownTotalWithTax(
  totalWithTax: number,
  taxRate: number = TAX_CONFIG.DEFAULT_RATE
): TaxCalculation {
  const subTotal = extractSubTotalFromTotal(totalWithTax, taxRate);
  const taxAmount = extractTaxFromTotal(totalWithTax, taxRate);
  
  return {
    subTotal,
    taxRate,
    taxAmount,
    grandTotal: totalWithTax,
  };
}

// =============================================================================
// FORMATTING UTILITIES
// =============================================================================

/**
 * Format currency amount (Sri Lankan Rupee)
 * @param amount - Amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-LK', {
    style: 'currency',
    currency: 'LKR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format tax rate as percentage
 * @param rate - Tax rate (e.g., 18)
 * @returns Formatted percentage string (e.g., "18%")
 */
export function formatTaxRate(rate: number): string {
  return `${rate}%`;
}

/**
 * Format a complete tax breakdown as a string
 * @param calculation - Tax calculation object
 * @returns Formatted breakdown string
 */
export function formatTaxBreakdown(calculation: TaxCalculation): string {
  return `
Subtotal: ${formatCurrency(calculation.subTotal)}
VAT (${formatTaxRate(calculation.taxRate)}): ${formatCurrency(calculation.taxAmount)}
Grand Total: ${formatCurrency(calculation.grandTotal)}
  `.trim();
}

// =============================================================================
// VALIDATION UTILITIES
// =============================================================================

/**
 * Validate that a tax calculation is correct
 * @param calculation - Tax calculation to validate
 * @returns true if valid, throws error otherwise
 */
export function validateTaxCalculation(calculation: TaxCalculation): boolean {
  const expectedTaxAmount = calculateTax(calculation.subTotal, calculation.taxRate);
  const expectedGrandTotal = round2(money(calculation.subTotal).plus(expectedTaxAmount)).toNumber();

  // Decimal math is exact — any mismatch is a real error, not rounding noise.
  if (!round2(calculation.taxAmount).equals(round2(expectedTaxAmount))) {
    throw new Error(
      `Invalid tax amount: expected ${expectedTaxAmount}, got ${calculation.taxAmount}`
    );
  }

  if (!round2(calculation.grandTotal).equals(round2(expectedGrandTotal))) {
    throw new Error(
      `Invalid grand total: expected ${expectedGrandTotal}, got ${calculation.grandTotal}`
    );
  }

  return true;
}

/**
 * Round amount to 2 decimal places (standard for currency)
 * @param amount - Amount to round
 * @returns Rounded amount
 */
export function roundCurrency(amount: number): number {
  return round2(amount).toNumber();
}

// =============================================================================
// CONVENIENCE FUNCTIONS FOR DATABASE OPERATIONS
// =============================================================================

/**
 * Prepare sale data with tax calculations
 * @param items - Array of sale items
 * @param taxRate - Tax rate percentage (default 18%)
 * @returns Sale data with calculated tax fields
 */
export function prepareSaleData(
  items: Array<{ quantity: number; unitPrice: number }>,
  taxRate: number = TAX_CONFIG.DEFAULT_RATE
) {
  const breakdown = calculateMultipleItemsTax(items, taxRate);
  
  return {
    subTotal: roundCurrency(breakdown.subTotal),
    taxRate: breakdown.taxRate,
    taxAmount: roundCurrency(breakdown.taxAmount),
    grandTotal: roundCurrency(breakdown.grandTotal),
    totalAmount: roundCurrency(breakdown.grandTotal), // Legacy field
    items: breakdown.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: roundCurrency(item.unitPrice),
      subTotal: roundCurrency(item.subTotal),
      taxRate: item.taxRate,
      taxAmount: roundCurrency(item.taxAmount),
      total: roundCurrency(item.total),
    })),
  };
}

/**
 * Calculate tax for a cart checkout
 * Same as prepareSaleData but with clearer naming for cart context
 */
export const prepareCheckoutData = prepareSaleData;

// =============================================================================
// EXPORTS
// =============================================================================

const taxUtils = {
  TAX_CONFIG,
  calculateTax,
  calculateGrandTotal,
  calculateLineItemTax,
  calculateMultipleItemsTax,
  extractTaxFromTotal,
  extractSubTotalFromTotal,
  breakdownTotalWithTax,
  formatCurrency,
  formatTaxRate,
  formatTaxBreakdown,
  validateTaxCalculation,
  roundCurrency,
  prepareSaleData,
  prepareCheckoutData,
};

export default taxUtils;
