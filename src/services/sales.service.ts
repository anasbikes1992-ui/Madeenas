/**
 * Sales Service with VAT Integration
 * 
 * Handles all sale transactions with proper VAT calculations and stock management.
 */

import { prisma } from '@/lib/db';
import { prepareSaleData, validateTaxCalculation } from '@/lib/tax';
import type { Prisma } from '@prisma/client';
import type { CreateSale } from '@/lib/validation';

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

// =============================================================================
// RECEIPT NUMBER GENERATION
// =============================================================================

/**
 * Generate a unique receipt number
 * Format: RCP-YYYYMMDD-XXXX (e.g., RCP-20260511-0001)
 */
async function generateReceiptNumber(): Promise<string> {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
  const prefix = `RCP-${dateStr}`;
  
  // Find the last receipt number for today
  const lastSale = await prisma.sale.findFirst({
    where: {
      receiptNo: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptNo: 'desc',
    },
  });
  
  let sequence = 1;
  if (lastSale) {
    const lastSequence = parseInt(lastSale.receiptNo.split('-')[2], 10);
    if (!isNaN(lastSequence)) {
      sequence = lastSequence + 1;
    }
  }
  
  return `${prefix}-${sequence.toString().padStart(4, '0')}`;
}

// =============================================================================
// CREATE SALE WITH VAT
// =============================================================================

/**
 * Create a new sale with automatic VAT calculation and stock deduction
 */
export async function createSale(data: CreateSale, soldById: string) {
  // Validate input
  if (!data.items || data.items.length === 0) {
    throw new Error('Sale must have at least one item');
  }
  
  // Calculate tax for all items
  const taxRate = data.taxRate ?? 18; // Default 18% VAT
  const saleData = prepareSaleData(
    data.items.map((item) => ({
      quantity: item.quantity,
      unitPrice: item.unitPrice,
    })),
    taxRate
  );
  
  // Validate the calculation
  validateTaxCalculation({
    subTotal: saleData.subTotal,
    taxRate: saleData.taxRate,
    taxAmount: saleData.taxAmount,
    grandTotal: saleData.grandTotal,
  });
  
  // Generate receipt number
  const receiptNo = await generateReceiptNumber();
  
  // Create sale in a transaction
  const sale = await prisma.$transaction(async (tx) => {
    // Create the sale
    const newSale = await tx.sale.create({
      data: {
        receiptNo,
        locationId: data.locationId,
        soldById,
        customerId: data.customerId,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        subTotal: saleData.subTotal,
        taxRate: saleData.taxRate,
        taxAmount: saleData.taxAmount,
        grandTotal: saleData.grandTotal,
        paymentMode: data.paymentMode,
        note: data.note,
        items: {
          create: data.items.map((item, index) => ({
            variantId: (item as any).variantId || (item as any).productId, // Fallback if CreateSale not fully updated
            saleUnit: (item as any).saleUnit || 'PCS',
            saleQty: item.quantity,
            saleToStockFactor: (item as any).saleToStockFactor || 1,
            stockQtyDeducted: item.quantity * ((item as any).saleToStockFactor || 1),
            costAtSale: (item as any).costPrice || 0,
            profitAmount: saleData.items[index].subTotal - (((item as any).costPrice || 0) * item.quantity),
            unitPrice: item.unitPrice,
            subTotal: saleData.items[index].subTotal,
            taxRate: saleData.items[index].taxRate,
            taxAmount: saleData.items[index].taxAmount,
            total: saleData.items[index].total,
          })),
        },
      },
      include: saleInclude,
    });
    
    // Deduct stock for each item
    for (const item of data.items) {
      const variantId = (item as any).variantId || (item as any).productId;
      const stockQtyToDeduct = item.quantity * ((item as any).saleToStockFactor || 1);

      const stock = await tx.stock.findUnique({
        where: {
          variantId_locationId: {
            variantId,
            locationId: data.locationId,
          },
        },
      });
      
      if (!stock) {
        throw new Error(`No stock found for variant ${variantId} at location ${data.locationId}`);
      }
      
      if (stock.quantity < stockQtyToDeduct) {
        throw new Error(
          `Insufficient stock for variant ${variantId}. Available: ${stock.quantity}, Requested: ${stockQtyToDeduct}`
        );
      }
      
      await tx.stock.update({
        where: {
          variantId_locationId: {
            variantId,
            locationId: data.locationId,
          },
        },
        data: {
          quantity: {
            decrement: stockQtyToDeduct,
          },
        },
      });
    }
    
    // Create audit log
    await tx.auditLog.create({
      data: {
        userId: soldById,
        action: 'CREATE_SALE',
        entity: 'Sale',
        entityId: newSale.id,
        details: JSON.stringify({
          receiptNo: newSale.receiptNo,
          grandTotal: newSale.grandTotal,
          itemCount: data.items.length,
          taxAmount: newSale.taxAmount,
        }),
      },
    });
    
    return newSale;
  });
  
  return sale;
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

/**
 * List sales with filters and pagination
 */
export async function listSales(params: ListSalesParams) {
  const { locationId, startDate, endDate, customerId, page, limit } = params;
  
  const where: Prisma.SaleWhereInput = {};
  
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
// GET SALE BY ID
// =============================================================================

/**
 * Get a single sale by ID with all details
 */
export async function getSaleById(id: string): Promise<SaleWithDetails | null> {
  return prisma.sale.findUnique({
    where: { id },
    include: saleInclude,
  });
}

/**
 * Get a sale by receipt number
 */
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
  averageSaleValue: number;
  salesCount: number;
}

/**
 * Get sales analytics for a date range
 */
export async function getSalesAnalytics(
  locationId?: string,
  startDate?: Date,
  endDate?: Date
): Promise<SalesAnalytics> {
  const where: Prisma.SaleWhereInput = {};
  
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
  
  const result = await prisma.sale.aggregate({
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
  });
  
  return {
    totalSales: result._sum.grandTotal ?? 0,
    totalRevenue: result._sum.subTotal ?? 0,
    totalTaxCollected: result._sum.taxAmount ?? 0,
    averageSaleValue: result._avg.grandTotal ?? 0,
    salesCount: result._count.id ?? 0,
  };
}

/**
 * Get sales grouped by payment mode
 */
export async function getSalesByPaymentMode(
  locationId?: string,
  startDate?: Date,
  endDate?: Date
) {
  const where: Prisma.SaleWhereInput = {};
  
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
    totalAmount: result._sum.grandTotal ?? 0,
    taxAmount: result._sum.taxAmount ?? 0,
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

/**
 * Generate a tax report for a date range
 */
export async function generateTaxReport(
  startDate: Date,
  endDate: Date,
  includeLocationBreakdown = false
): Promise<TaxReport> {
  const where: Prisma.SaleWhereInput = {
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
    averageTaxRate: analytics.totalRevenue > 0
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
      taxCollected: result._sum.taxAmount ?? 0,
      salesCount: result._count.id,
    }));
  }
  
  return report;
}
