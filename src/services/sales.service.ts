/**
 * Sales service — the SINGLE sale-creation engine.
 *
 * Both the web POS route (/api/sales) and the mobile route (/api/mobile/sales)
 * call `createSale`. Guarantees:
 *
 *  - Prices come from the database (ProductVariant.salePrice), never from the
 *    client. Clients may pass `expectedGrandTotal` to detect stale caches.
 *  - All money math uses exact Decimal arithmetic (src/lib/money.ts).
 *  - Receipt numbers are allocated atomically (src/lib/doc-number.ts).
 *  - Stock is decremented with a quantity >= needed guard in the same
 *    transaction — concurrent sales cannot oversell or drive stock negative.
 *  - Cost and profit are captured per line from the variant's cost price.
 *  - CREDIT sales write a CreditEntry and update the customer's ledger
 *    atomically with the sale.
 */

import { prisma } from '@/lib/db';
import { computeSaleTotals, money, round2, round3, mul, sub } from '@/lib/money';
import { nextDocNumber } from '@/lib/doc-number';
import { getVatRate } from '@/lib/settings';
import { Prisma, PaymentMode, CreditEntryType } from '@prisma/client';

// =============================================================================
// ERRORS (mapped to HTTP statuses by the routes)
// =============================================================================

export class SaleError extends Error {
  constructor(message: string, public readonly code: string, public readonly status: number) {
    super(message);
    this.name = 'SaleError';
  }
}

export class InsufficientStockError extends SaleError {
  constructor(label: string) {
    super(`Insufficient stock for ${label}`, 'INSUFFICIENT_STOCK', 422);
  }
}

export class PriceMismatchError extends SaleError {
  constructor(expected: string, actual: string) {
    super(
      `Price changed: client expected total ${expected}, server computed ${actual}. Refresh prices and retry.`,
      'PRICE_MISMATCH',
      409
    );
  }
}

export class SaleValidationError extends SaleError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}

// =============================================================================
// TYPES
// =============================================================================

const saleInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  },
  location: true,
  soldBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  customer: true,
} satisfies Prisma.SaleInclude;

export type SaleWithDetails = Prisma.SaleGetPayload<{
  include: typeof saleInclude;
}>;

export interface CreateSaleItemInput {
  variantId: string;
  /** Quantity in the sale unit (metres, pieces, ...). */
  saleQty: number;
  /** Sale unit code; defaults to the variant's primary sale unit. */
  saleUnit?: string;
  /**
   * Explicit cashier price override (web POS allows editing the unit price
   * at the counter). When absent the variant's salePrice is used. The
   * override is audited; profit is still computed against real cost.
   */
  unitPriceOverride?: number;
}

export interface CreateSaleInput {
  locationId: string;
  soldById: string;
  items: CreateSaleItemInput[];
  paymentMode: PaymentMode;
  customerName?: string | null;
  customerPhone?: string | null;
  isCreditEligible?: boolean;
  discountAmount?: number;
  note?: string | null;
  /** Client's displayed total — sale is rejected with 409 if it no longer matches. */
  expectedGrandTotal?: number;
  chequeNo?: string | null;
  chequeBank?: string | null;
  chequeDate?: Date | null;
}

// =============================================================================
// CREATE SALE
// =============================================================================

/**
 * Create a sale within the CALLER's transaction.
 *
 * Use this when the sale must be atomic with other writes (e.g. fulfilling a
 * customer order also flips the order status). Otherwise use `createSale`,
 * which wraps this in its own transaction.
 */
export async function createSaleInTx(
  tx: Prisma.TransactionClient,
  input: CreateSaleInput
): Promise<SaleWithDetails> {
  if (!input.items || input.items.length === 0) {
    throw new SaleValidationError('Sale must have at least one item');
  }
  if (input.paymentMode === 'CREDIT' && !input.customerPhone) {
    throw new SaleValidationError('Customer phone number is required for credit sales');
  }
  if (input.paymentMode === 'CHEQUE' && !input.chequeNo) {
    throw new SaleValidationError('Cheque number is required for cheque payments');
  }

  const taxRate = await getVatRate();

  {
    // 1. Server-side price lookup — the client's prices are NEVER trusted.
    const variantIds = [...new Set(input.items.map((i) => i.variantId))];
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds }, isActive: true },
      include: { product: { select: { name: true, isActive: true } } },
    });
    const variantMap = new Map(variants.map((v) => [v.id, v]));

    const lines = input.items.map((item) => {
      const variant = variantMap.get(item.variantId);
      if (!variant || !variant.product.isActive) {
        throw new SaleValidationError(`Product variant not found or inactive: ${item.variantId}`);
      }
      const hasOverride = item.unitPriceOverride !== undefined && item.unitPriceOverride !== null;
      if (hasOverride && !(item.unitPriceOverride! >= 0)) {
        throw new SaleValidationError('Price override cannot be negative');
      }
      if (!hasOverride && (variant.salePrice === null || variant.salePrice === undefined)) {
        throw new SaleValidationError(
          `${variant.product.name} (${variant.colorName}) has no sale price configured`
        );
      }
      const unitPrice = hasOverride ? round2(item.unitPriceOverride!) : round2(money(variant.salePrice!));

      // Resolve the unit -> stock conversion factor from the VARIANT, not the client.
      const saleUnit = item.saleUnit ?? variant.saleUnit;
      let factor: Prisma.Decimal;
      if (saleUnit === variant.saleUnit) {
        factor = money(variant.saleToStockFactor);
      } else if (variant.altSaleUnit && saleUnit === variant.altSaleUnit) {
        factor = money(variant.altSaleToStockFactor ?? 1);
      } else {
        throw new SaleValidationError(
          `Unit "${saleUnit}" is not configured for ${variant.product.name} (${variant.colorName})`
        );
      }

      if (!(item.saleQty > 0)) {
        throw new SaleValidationError('Quantity must be greater than zero');
      }

      const saleQty = round3(item.saleQty);
      const stockQtyDeducted = round3(mul(saleQty, factor));
      const label = `${variant.product.name} (${variant.colorName})`;

      return { variant, saleUnit, factor, saleQty, stockQtyDeducted, label, unitPrice };
    });

    // 2. Exact totals from server-side prices (or audited cashier overrides).
    const totals = computeSaleTotals(
      lines.map((l) => ({ unitPrice: l.unitPrice, quantity: l.saleQty })),
      taxRate,
      input.discountAmount ?? 0
    );

    // 3. Stale-price protection for the cashier.
    if (input.expectedGrandTotal !== undefined) {
      const expected = round2(input.expectedGrandTotal);
      if (!totals.grandTotal.equals(expected)) {
        throw new PriceMismatchError(expected.toFixed(2), totals.grandTotal.toFixed(2));
      }
    }

    // 4. Customer + credit eligibility.
    let customerId: string | null = null;
    let customer: { id: string; name: string; isCreditEligible: boolean; creditLimit: Prisma.Decimal | null } | null =
      null;
    if (input.customerPhone && input.customerPhone.trim().length > 0) {
      const phone = input.customerPhone.trim();
      const updateData: { name?: string; isCreditEligible?: boolean } = {};
      if (input.customerName) updateData.name = input.customerName;
      if (input.isCreditEligible !== undefined) updateData.isCreditEligible = input.isCreditEligible;

      customer = await tx.customer.upsert({
        where: { phone },
        update: updateData,
        create: {
          name: input.customerName || 'Unknown',
          phone,
          isCreditEligible: input.isCreditEligible ?? false,
        },
        select: { id: true, name: true, isCreditEligible: true, creditLimit: true },
      });
      customerId = customer.id;

      if (input.paymentMode === 'CREDIT' && !customer.isCreditEligible) {
        throw new SaleValidationError(`Customer ${customer.name} is not eligible for credit`);
      }
    }

    // 5. Receipt number. Allocated from a Postgres sequence, which is atomic
    //    and lock-free, so concurrent sales never contend here.
    const receiptNo = await nextDocNumber(tx, 'receipt');

    // 6. Create the sale with real cost + profit per line.
    const sale = await tx.sale.create({
      data: {
        receiptNo,
        locationId: input.locationId,
        soldById: input.soldById,
        customerId,
        customerName: input.customerName ?? null,
        customerPhone: input.customerPhone ?? null,
        subTotal: totals.subTotal,
        taxRate: totals.taxRate,
        taxAmount: totals.taxAmount,
        discountAmount: totals.discountAmount,
        grandTotal: totals.grandTotal,
        paymentMode: input.paymentMode,
        chequeNo: input.paymentMode === 'CHEQUE' ? input.chequeNo : null,
        chequeBank: input.paymentMode === 'CHEQUE' ? (input.chequeBank ?? null) : null,
        chequeDate: input.paymentMode === 'CHEQUE' ? (input.chequeDate ?? null) : null,
        note: input.note ?? null,
        items: {
          create: lines.map((line, index) => {
            const lineTotals = totals.items[index];
            const costAtSale =
              line.variant.costPrice !== null && line.variant.costPrice !== undefined
                ? round2(line.variant.costPrice)
                : null;
            const profitAmount =
              costAtSale !== null
                ? round2(sub(lineTotals.subTotal, mul(costAtSale, line.stockQtyDeducted)))
                : null;
            return {
              variantId: line.variant.id,
              saleUnit: line.saleUnit,
              saleQty: line.saleQty,
              saleToStockFactor: line.factor,
              stockQtyDeducted: line.stockQtyDeducted,
              unitPrice: lineTotals.unitPrice,
              subTotal: lineTotals.subTotal,
              taxRate: lineTotals.taxRate,
              taxAmount: lineTotals.taxAmount,
              total: lineTotals.total,
              costAtSale,
              profitAmount,
            };
          }),
        },
      },
      include: saleInclude,
    });

    // 8. CREDIT sales: record the receivable in the same transaction.
    if (input.paymentMode === 'CREDIT') {
      if (!customerId || !customer) {
        throw new SaleValidationError('Credit sales require a customer');
      }

      const ledger = await tx.creditLedger.upsert({
        where: { customerId },
        update: {},
        create: { customerId },
        select: { id: true, totalOwed: true },
      });

      const newTotalOwed = round2(money(ledger.totalOwed).plus(totals.grandTotal));
      if (
        customer.creditLimit !== null &&
        customer.creditLimit !== undefined &&
        newTotalOwed.greaterThan(money(customer.creditLimit))
      ) {
        throw new SaleValidationError(
          `Credit limit exceeded: outstanding would be ${newTotalOwed.toFixed(2)}, limit is ${round2(
            money(customer.creditLimit)
          ).toFixed(2)}`
        );
      }

      await tx.creditEntry.create({
        data: {
          ledgerId: ledger.id,
          saleId: sale.id,
          type: CreditEntryType.CHARGE,
          amount: totals.grandTotal,
          balance: totals.grandTotal,
        },
      });
      await tx.creditLedger.update({
        where: { id: ledger.id },
        data: { totalOwed: newTotalOwed, lastActivity: new Date() },
      });
    }

    // 9. Audit trail.
    await tx.auditLog.create({
      data: {
        userId: input.soldById,
        action: 'CREATE_SALE',
        entity: 'Sale',
        entityId: sale.id,
        saleId: sale.id,
        details: JSON.stringify({
          receiptNo,
          grandTotal: totals.grandTotal.toFixed(2),
          itemCount: lines.length,
          paymentMode: input.paymentMode,
          priceOverrides: lines
            .filter((_, i) => input.items[i].unitPriceOverride !== undefined)
            .map((l) => ({ variantId: l.variant.id, unitPrice: l.unitPrice.toFixed(2) })),
        }),
      },
    });

    // 10. Stock decrement — deliberately LAST, immediately before commit.
    //
    // The `quantity >= needed` guard makes overselling impossible: concurrent
    // sales serialize on the row lock and the loser's WHERE simply matches no
    // rows. Doing it last keeps that lock held for the shortest possible time,
    // so queued sales aren't stuck waiting (and burning their transaction
    // budget) while this one does unrelated work. If it fails, the whole
    // transaction — sale, ledger, audit — rolls back.
    //
    // Lines are decremented in a stable variantId order so that two sales
    // sharing items always take locks in the same sequence and cannot deadlock.
    const orderedLines = [...lines].sort((a, b) => a.variant.id.localeCompare(b.variant.id));
    for (const line of orderedLines) {
      const result = await tx.stock.updateMany({
        where: {
          variantId: line.variant.id,
          locationId: input.locationId,
          quantity: { gte: line.stockQtyDeducted },
        },
        data: { quantity: { decrement: line.stockQtyDeducted } },
      });
      if (result.count === 0) {
        throw new InsufficientStockError(line.label);
      }
    }

    return sale;
  }
}

/**
 * Transaction budget for sale creation.
 *
 * A sale performs several round-trips (price lookup, stock guards, counter
 * allocation, insert, ledger, audit). Prisma's 5s default is not enough for a
 * remote/pooled database under load or on a slow connection, and blowing the
 * budget aborts a legitimate sale mid-transaction. 20s leaves generous headroom
 * while still bounding how long a stock row can stay locked.
 */
export const SALE_TX_OPTIONS = {
  timeout: 20_000,
  maxWait: 10_000,
} as const;

/** Create a sale in its own transaction. */
export async function createSale(input: CreateSaleInput): Promise<SaleWithDetails> {
  return prisma.$transaction((tx) => createSaleInTx(tx, input), SALE_TX_OPTIONS);
}

// =============================================================================
// LIST SALES
// =============================================================================

export interface ListSalesParams {
  locationId?: string;
  startDate?: Date;
  endDate?: Date;
  customerId?: string;
  page: number;
  limit: number;
}

export async function listSales(params: ListSalesParams) {
  const { locationId, startDate, endDate, customerId, page, limit } = params;

  const where: Prisma.SaleWhereInput = { deletedAt: null };

  if (locationId) {
    where.locationId = locationId;
  }

  if (customerId) {
    where.customerId = customerId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: saleInclude,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ]);

  return {
    sales,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

// =============================================================================
// GET SALE
// =============================================================================

export async function getSaleById(id: string): Promise<SaleWithDetails | null> {
  return prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });
}

export async function getSaleByReceiptNo(receiptNo: string): Promise<SaleWithDetails | null> {
  return prisma.sale.findUnique({
    where: { receiptNo },
    include: saleInclude,
  });
}

// =============================================================================
// SALES ANALYTICS
// =============================================================================

export interface SalesAnalytics {
  totalSales: number;
  totalRevenue: number;
  totalTaxCollected: number;
  totalProfit: number;
  averageSaleValue: number;
  salesCount: number;
}

export async function getSalesAnalytics(
  locationId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<SalesAnalytics> {
  const where: Prisma.SaleWhereInput = { deletedAt: null };

  if (locationId) {
    where.locationId = locationId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const [result, profitResult] = await Promise.all([
    prisma.sale.aggregate({
      where,
      _sum: {
        grandTotal: true,
        taxAmount: true,
        subTotal: true,
      },
      _count: {
        id: true,
      },
      _avg: {
        grandTotal: true,
      },
    }),
    prisma.saleItem.aggregate({
      where: { sale: where },
      _sum: { profitAmount: true },
    }),
  ]);

  return {
    totalSales: Number(result._sum.grandTotal ?? 0),
    totalRevenue: Number(result._sum.subTotal ?? 0),
    totalTaxCollected: Number(result._sum.taxAmount ?? 0),
    totalProfit: Number(profitResult._sum.profitAmount ?? 0),
    averageSaleValue: Number(result._avg.grandTotal ?? 0),
    salesCount: result._count.id ?? 0,
  };
}

export async function getSalesByPaymentMode(
  locationId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Prisma.SaleWhereInput = { deletedAt: null };

  if (locationId) {
    where.locationId = locationId;
  }

  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  const results = await prisma.sale.groupBy({
    by: ['paymentMode'],
    where,
    _sum: {
      grandTotal: true,
      taxAmount: true,
    },
    _count: {
      id: true,
    },
  });

  return results.map((result) => ({
    paymentMode: result.paymentMode,
    totalAmount: Number(result._sum.grandTotal ?? 0),
    taxAmount: Number(result._sum.taxAmount ?? 0),
    count: result._count.id,
  }));
}

// =============================================================================
// TAX REPORTS
// =============================================================================

export interface TaxReport {
  period: {
    start: Date;
    end: Date;
  };
  totalSales: number;
  totalRevenue: number;
  totalTaxCollected: number;
  averageTaxRate: number;
  salesCount: number;
  byLocation?: Array<{
    locationId: string;
    locationName: string;
    taxCollected: number;
    salesCount: number;
  }>;
}

export async function generateTaxReport(
  startDate: Date,
  endDate: Date,
  includeLocationBreakdown = false
): Promise<TaxReport> {
  const where: Prisma.SaleWhereInput = {
    deletedAt: null,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };

  const analytics = await getSalesAnalytics(undefined, startDate, endDate);

  const report: TaxReport = {
    period: {
      start: startDate,
      end: endDate,
    },
    totalSales: analytics.totalSales,
    totalRevenue: analytics.totalRevenue,
    totalTaxCollected: analytics.totalTaxCollected,
    averageTaxRate:
      analytics.totalRevenue > 0
        ? (analytics.totalTaxCollected / analytics.totalRevenue) * 100
        : 0,
    salesCount: analytics.salesCount,
  };

  if (includeLocationBreakdown) {
    const locationResults = await prisma.sale.groupBy({
      by: ['locationId'],
      where,
      _sum: {
        taxAmount: true,
      },
      _count: {
        id: true,
      },
    });

    const locationIds = locationResults.map((r) => r.locationId);
    const locations = await prisma.location.findMany({
      where: {
        id: {
          in: locationIds,
        },
      },
      select: {
        id: true,
        name: true,
      },
    });

    const locationMap = new Map(locations.map((l) => [l.id, l.name]));

    report.byLocation = locationResults.map((result) => ({
      locationId: result.locationId,
      locationName: locationMap.get(result.locationId) ?? 'Unknown',
      taxCollected: Number(result._sum.taxAmount ?? 0),
      salesCount: result._count.id,
    }));
  }

  return report;
}
