/**
 * Advanced Analytics Service
 * Provides business intelligence, forecasting, and insights
 */

import { prisma } from '@/lib/db'
import { num } from '@/lib/money'
import { startOfDay, endOfDay, subDays, format } from 'date-fns'

export interface DateRange {
  startDate: Date
  endDate: Date
}

export interface BusinessMetrics {
  revenue: RevenueMetrics
  profit: ProfitMetrics
  inventory: InventoryMetrics
  customers: CustomerMetrics
  sales: SalesMetrics
  topProducts: ProductPerformance[]
  topCustomers: CustomerPerformance[]
  cashFlow: CashFlowMetrics
  predictions: PredictiveInsights
}

export interface RevenueMetrics {
  total: number
  taxCollected: number
  netRevenue: number
  growthRate: number
  dailyAverage: number
  byPaymentMode: Record<string, number>
}

export interface ProfitMetrics {
  grossProfit: number
  grossMargin: number
  netProfit: number
  netMargin: number
  costOfGoodsSold: number
}

export interface InventoryMetrics {
  totalValue: number
  turnoverRate: number
  stockouts: number
  lowStockItems: number
  deadStock: ProductDeadStock[]
  fastMoving: string[]
  slowMoving: string[]
}

export interface CustomerMetrics {
  totalCustomers: number
  newCustomers: number
  retentionRate: number
  churnRate: number
  avgLifetimeValue: number
  avgOrderValue: number
  repeatCustomerRate: number
}

export interface SalesMetrics {
  totalOrders: number
  completedOrders: number
  avgOrderSize: number
  conversionRate: number
  cancelledOrders: number
  pendingOrders: number
}

export interface ProductPerformance {
  productId: string
  productName: string
  sku: string
  unitsSold: number
  revenue: number
  profit: number
  profitMargin: number
}

export interface CustomerPerformance {
  customerId: string
  customerName: string
  email: string
  totalSpent: number
  orderCount: number
  avgOrderValue: number
  lastPurchaseDate: Date | null
}

export interface ProductDeadStock {
  productId: string
  productName: string
  quantity: number
  lastSoldDate: Date | null
  daysWithoutSale: number
  estimatedValue: number
}

export interface CashFlowMetrics {
  cashIn: number
  cashOut: number
  netCashFlow: number
  dailyBreakdown: DailyCashFlow[]
}

export interface DailyCashFlow {
  date: string
  cashIn: number
  cashOut: number
  net: number
}

export interface PredictiveInsights {
  stockAlerts: StockAlert[]
  demandForecast: DemandForecast[]
  reorderSuggestions: ReorderSuggestion[]
}

export interface StockAlert {
  productId: string
  productName: string
  currentStock: number
  reorderPoint: number
  daysUntilStockout: number
  urgency: 'critical' | 'high' | 'medium'
}

export interface DemandForecast {
  productId: string
  productName: string
  forecastedDemand: number
  confidence: number
  trend: 'increasing' | 'stable' | 'decreasing'
}

export interface ReorderSuggestion {
  productId: string
  productName: string
  suggestedQuantity: number
  estimatedCost: number
  expectedStockoutDate: Date
}

// =============================================================================
// MAIN ANALYTICS FUNCTION
// =============================================================================

export async function getBusinessMetrics(
  tenantId: string | null,
  dateRange: DateRange
): Promise<BusinessMetrics> {
  const { startDate, endDate } = dateRange

  const [
    revenue,
    profit,
    inventory,
    customers,
    sales,
    topProducts,
    topCustomers,
    cashFlow,
    predictions,
  ] = await Promise.all([
    calculateRevenue(startDate, endDate),
    calculateProfit(startDate, endDate),
    calculateInventoryMetrics(),
    calculateCustomerMetrics(startDate, endDate),
    calculateSalesMetrics(startDate, endDate),
    getTopSellingProducts(startDate, endDate, 10),
    getTopCustomers(startDate, endDate, 10),
    getCashFlowAnalysis(startDate, endDate),
    getPredictiveInsights(),
  ])

  return {
    revenue,
    profit,
    inventory,
    customers,
    sales,
    topProducts,
    topCustomers,
    cashFlow,
    predictions,
  }
}

// =============================================================================
// REVENUE CALCULATION
// =============================================================================

async function calculateRevenue(startDate: Date, endDate: Date): Promise<RevenueMetrics> {
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    select: {
      grandTotal: true,
      taxAmount: true,
      subTotal: true,
      paymentMode: true,
    },
  })

  const total = sales.reduce((sum, sale) => sum + num(sale.grandTotal), 0)
  const taxCollected = sales.reduce((sum, sale) => sum + num(sale.taxAmount), 0)
  const netRevenue = total - taxCollected

  // Previous period for growth calculation
  const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const previousStart = subDays(startDate, daysDiff)
  const previousEnd = subDays(endDate, daysDiff)

  const previousSales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startOfDay(previousStart),
        lte: endOfDay(previousEnd),
      },
    },
    select: { grandTotal: true },
  })

  const previousTotal = previousSales.reduce((sum, sale) => sum + num(sale.grandTotal), 0)
  const growthRate = previousTotal > 0 ? ((total - previousTotal) / previousTotal) * 100 : 0

  // By payment mode
  const byPaymentMode: Record<string, number> = {}
  sales.forEach((sale) => {
    byPaymentMode[sale.paymentMode] = (byPaymentMode[sale.paymentMode] || 0) + num(sale.grandTotal)
  })

  return {
    total,
    taxCollected,
    netRevenue,
    growthRate,
    dailyAverage: total / Math.max(daysDiff, 1),
    byPaymentMode,
  }
}

// =============================================================================
// PROFIT CALCULATION
// =============================================================================

async function calculateProfit(startDate: Date, endDate: Date): Promise<ProfitMetrics> {
  const saleItems = await prisma.saleItem.findMany({
    where: {
      sale: {
        createdAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
    },
    include: {
      variant: {
        select: {
          costPrice: true,
        },
      },
      sale: {
        select: {
          grandTotal: true,
        },
      },
    },
  })

  const totalRevenue = saleItems.reduce((sum, item) => sum + num(item.total), 0)
  const costOfGoodsSold = saleItems.reduce(
    (sum, item) => sum + num(item.costAtSale ?? item.variant?.costPrice) * num(item.saleQty),
    0
  )

  const grossProfit = totalRevenue - costOfGoodsSold
  const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0

  // For net profit, we'd subtract operating expenses (not tracked yet)
  const netProfit = grossProfit // Simplified
  const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0

  return {
    grossProfit,
    grossMargin,
    netProfit,
    netMargin,
    costOfGoodsSold,
  }
}

// =============================================================================
// INVENTORY METRICS
// =============================================================================

async function calculateInventoryMetrics(): Promise<InventoryMetrics> {
  const variants = await prisma.productVariant.findMany({
    include: {
      product: true,
      stocks: true,
      saleItems: {
        where: {
          sale: {
            createdAt: {
              gte: subDays(new Date(), 90), // Last 90 days
            },
          },
        },
      },
    },
  })

  const totalValue = variants.reduce((sum, variant) => {
    const totalStock = variant.stocks.reduce((s, stock) => s + num(stock.quantity), 0)
    return sum + totalStock * num(variant.costPrice)
  }, 0)

  const stockouts = variants.filter((v) =>
    v.stocks.every((s) => num(s.quantity) <= 0)
  ).length

  const lowStockItems = variants.filter((v) => {
    const totalStock = v.stocks.reduce((s, stock) => s + num(stock.quantity), 0)
    return totalStock > 0 && totalStock <= num(v.lowStockAt)
  }).length

  // Dead stock: no sales in 90 days
  const deadStock: ProductDeadStock[] = []
  const fastMoving: string[] = []
  const slowMoving: string[] = []

  for (const variant of variants) {
    const salesLast90Days = variant.saleItems.length
    const totalStock = variant.stocks.reduce((s, stock) => s + num(stock.quantity), 0)

    if (salesLast90Days === 0 && totalStock > 0) {
      deadStock.push({
        productId: variant.id,
        productName: variant.product.name + ' - ' + variant.colorName,
        quantity: totalStock,
        lastSoldDate: null,
        daysWithoutSale: 90,
        estimatedValue: totalStock * num(variant.costPrice),
      })
    } else if (salesLast90Days > 20) {
      fastMoving.push(variant.id)
    } else if (salesLast90Days < 5 && salesLast90Days > 0) {
      slowMoving.push(variant.id)
    }
  }

  // Simple turnover rate calculation
  const avgInventoryValue = totalValue
  const cogs = await prisma.saleItem.aggregate({
    where: {
      sale: {
        createdAt: {
          gte: subDays(new Date(), 90),
        },
      },
    },
    _sum: { subTotal: true },
  })

  const turnoverRate = avgInventoryValue > 0 ? num(cogs._sum.subTotal) / avgInventoryValue : 0

  return {
    totalValue,
    turnoverRate,
    stockouts,
    lowStockItems,
    deadStock: deadStock.slice(0, 10),
    fastMoving,
    slowMoving,
  }
}

// =============================================================================
// CUSTOMER METRICS
// =============================================================================

async function calculateCustomerMetrics(
  startDate: Date,
  endDate: Date
): Promise<CustomerMetrics> {
  const allCustomers = await prisma.user.count({
    where: { role: 'CUSTOMER' },
  })

  const newCustomers = await prisma.user.count({
    where: {
      role: 'CUSTOMER',
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
  })

  // Customer purchases
  const sales = await prisma.sale.findMany({
    where: {
      customerId: { not: null },
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    select: {
      customerId: true,
      grandTotal: true,
    },
  })

  const customerSpending = new Map<string, number>()
  const customerOrderCounts = new Map<string, number>()

  sales.forEach((sale) => {
    if (!sale.customerId) return
    customerSpending.set(sale.customerId, (customerSpending.get(sale.customerId) || 0) + num(sale.grandTotal))
    customerOrderCounts.set(sale.customerId, (customerOrderCounts.get(sale.customerId) || 0) + 1)
  })

  const totalSpent = Array.from(customerSpending.values()).reduce((sum, amt) => sum + amt, 0)
  const avgLifetimeValue = allCustomers > 0 ? totalSpent / allCustomers : 0
  const avgOrderValue = sales.length > 0 ? totalSpent / sales.length : 0

  const repeatCustomers = Array.from(customerOrderCounts.values()).filter((count) => count > 1).length
  const repeatCustomerRate = allCustomers > 0 ? (repeatCustomers / allCustomers) * 100 : 0

  return {
    totalCustomers: allCustomers,
    newCustomers,
    retentionRate: 0, // Would require historical cohort analysis
    churnRate: 0,
    avgLifetimeValue,
    avgOrderValue,
    repeatCustomerRate,
  }
}

// =============================================================================
// SALES METRICS
// =============================================================================

async function calculateSalesMetrics(startDate: Date, endDate: Date): Promise<SalesMetrics> {
  const [totalOrders, completedOrders, cancelledOrders, pendingOrders] = await Promise.all([
    prisma.customerOrder.count({
      where: {
        createdAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
    }),
    prisma.sale.count({
      where: {
        createdAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
    }),
    prisma.customerOrder.count({
      where: {
        status: 'CANCELLED',
        createdAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
    }),
    prisma.customerOrder.count({
      where: {
        status: 'PENDING',
        createdAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
    }),
  ])

  const avgOrderSize = completedOrders > 0 ? totalOrders / completedOrders : 0
  const conversionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0

  return {
    totalOrders,
    completedOrders,
    avgOrderSize,
    conversionRate,
    cancelledOrders,
    pendingOrders,
  }
}

// =============================================================================
// TOP PERFORMERS
// =============================================================================

async function getTopSellingProducts(
  startDate: Date,
  endDate: Date,
  limit: number
): Promise<ProductPerformance[]> {
  const saleItems = await prisma.saleItem.groupBy({
    by: ['variantId'],
    where: {
      sale: {
        createdAt: {
          gte: startOfDay(startDate),
          lte: endOfDay(endDate),
        },
      },
    },
    _sum: {
      saleQty: true,
      total: true,
      subTotal: true,
    },
    orderBy: {
      _sum: {
        total: 'desc',
      },
    },
    take: limit,
  })

  const variantIds = saleItems.map((item) => item.variantId)
  const variants = await prisma.productVariant.findMany({
    where: { id: { in: variantIds } },
    include: { product: true },
  })

  const variantMap = new Map(variants.map((v) => [v.id, v]))

  return saleItems.map((item) => {
    const variant = variantMap.get(item.variantId)
    const revenue = num(item._sum.total)
    const cost = num(variant?.costPrice) * num(item._sum.saleQty)
    const profit = revenue - cost
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0

    return {
      productId: item.variantId,
      productName: variant ? `${variant.product.name} - ${variant.colorName}` : 'Unknown',
      sku: variant?.sku || '',
      unitsSold: num(item._sum.saleQty),
      revenue,
      profit,
      profitMargin,
    }
  })
}

async function getTopCustomers(
  startDate: Date,
  endDate: Date,
  limit: number
): Promise<CustomerPerformance[]> {
  const sales = await prisma.sale.groupBy({
    by: ['customerId'],
    where: {
      customerId: { not: null },
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    _sum: {
      grandTotal: true,
    },
    _count: {
      id: true,
    },
    orderBy: {
      _sum: {
        grandTotal: 'desc',
      },
    },
    take: limit,
  })

  const customerIds = sales.map((s) => s.customerId).filter((id): id is string => id !== null)
  const customers = await prisma.user.findMany({
    where: { id: { in: customerIds } },
    select: {
      id: true,
      name: true,
      email: true,
    },
  })

  const customerMap = new Map(customers.map((c) => [c.id, c]))

  const lastPurchases = await prisma.sale.groupBy({
    by: ['customerId'],
    where: {
      customerId: { in: customerIds },
    },
    _max: {
      createdAt: true,
    },
  })

  const lastPurchaseMap = new Map(
    lastPurchases.map((lp) => [lp.customerId, lp._max.createdAt])
  )

  return sales
    .map((sale) => {
      if (!sale.customerId) return null
      const customer = customerMap.get(sale.customerId)
      const totalSpent = num(sale._sum.grandTotal)
      const orderCount = sale._count.id
      const avgOrderValue = orderCount > 0 ? totalSpent / orderCount : 0

      return {
        customerId: sale.customerId,
        customerName: customer?.name || 'Unknown',
        email: customer?.email || '',
        totalSpent,
        orderCount,
        avgOrderValue,
        lastPurchaseDate: lastPurchaseMap.get(sale.customerId) || null,
      }
    })
    .filter((c): c is CustomerPerformance => c !== null)
}

// =============================================================================
// CASH FLOW ANALYSIS
// =============================================================================

async function getCashFlowAnalysis(
  startDate: Date,
  endDate: Date
): Promise<CashFlowMetrics> {
  // Cash in: sales
  const sales = await prisma.sale.findMany({
    where: {
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
    },
    select: {
      grandTotal: true,
      createdAt: true,
    },
  })

  // Cash out: stock purchases (from StockIn with costPrice)
  const stockIns = await prisma.stockIn.findMany({
    where: {
      createdAt: {
        gte: startOfDay(startDate),
        lte: endOfDay(endDate),
      },
      costPrice: { not: null },
    },
    select: {
      quantityAddedToStock: true,
      costPrice: true,
      createdAt: true,
    },
  })

  const cashIn = sales.reduce((sum, sale) => sum + num(sale.grandTotal), 0)
  const cashOut = stockIns.reduce((sum, si) => sum + num(si.costPrice) * num(si.quantityAddedToStock), 0)

  // Daily breakdown
  const dailyMap = new Map<string, { cashIn: number; cashOut: number }>()

  sales.forEach((sale) => {
    const dateKey = format(sale.createdAt, 'yyyy-MM-dd')
    const existing = dailyMap.get(dateKey) || { cashIn: 0, cashOut: 0 }
    existing.cashIn += num(sale.grandTotal)
    dailyMap.set(dateKey, existing)
  })

  stockIns.forEach((si) => {
    const dateKey = format(si.createdAt, 'yyyy-MM-dd')
    const existing = dailyMap.get(dateKey) || { cashIn: 0, cashOut: 0 }
    existing.cashOut += num(si.costPrice) * num(si.quantityAddedToStock)
    dailyMap.set(dateKey, existing)
  })

  const dailyBreakdown: DailyCashFlow[] = Array.from(dailyMap.entries())
    .map(([date, { cashIn, cashOut }]) => ({
      date,
      cashIn,
      cashOut,
      net: cashIn - cashOut,
    }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return {
    cashIn,
    cashOut,
    netCashFlow: cashIn - cashOut,
    dailyBreakdown,
  }
}

// =============================================================================
// PREDICTIVE INSIGHTS
// =============================================================================

async function getPredictiveInsights(): Promise<PredictiveInsights> {
  const variants = await prisma.productVariant.findMany({
    include: {
      product: true,
      stocks: true,
      saleItems: {
        where: {
          sale: {
            createdAt: {
              gte: subDays(new Date(), 30),
            },
          },
        },
        select: {
          saleQty: true,
        },
      },
    },
  })

  const stockAlerts: StockAlert[] = []
  const demandForecast: DemandForecast[] = []
  const reorderSuggestions: ReorderSuggestion[] = []

  for (const variant of variants) {
    const totalStock = variant.stocks.reduce((sum, s) => sum + num(s.quantity), 0)
    const salesLast30Days = variant.saleItems.reduce((sum, item) => sum + num(item.saleQty), 0)
    const avgDailyDemand = salesLast30Days / 30
    const lowStockAt = num(variant.lowStockAt)

    // Stock alerts
    if (totalStock <= lowStockAt && totalStock > 0) {
      const daysUntilStockout = avgDailyDemand > 0 ? Math.floor(totalStock / avgDailyDemand) : 999
      const urgency =
        daysUntilStockout <= 3 ? 'critical' : daysUntilStockout <= 7 ? 'high' : 'medium'

      stockAlerts.push({
        productId: variant.id,
        productName: variant.product.name + ' - ' + variant.colorName,
        currentStock: totalStock,
        reorderPoint: lowStockAt,
        daysUntilStockout,
        urgency,
      })
    }

    // Demand forecast (simple 30-day projection)
    if (salesLast30Days > 0) {
      const trend =
        salesLast30Days > 20 ? 'increasing' : salesLast30Days < 5 ? 'decreasing' : 'stable'
      demandForecast.push({
        productId: variant.id,
        productName: variant.product.name + ' - ' + variant.colorName,
        forecastedDemand: avgDailyDemand * 30,
        confidence: 0.7, // Simplified
        trend,
      })
    }

    // Reorder suggestions
    if (totalStock <= lowStockAt) {
      const suggestedQuantity = Math.max(
        lowStockAt * 2,
        avgDailyDemand * 30 // 30 days supply
      )
      const estimatedCost = suggestedQuantity * num(variant.costPrice)
      const expectedStockoutDate =
        avgDailyDemand > 0
          ? new Date(Date.now() + (totalStock / avgDailyDemand) * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      reorderSuggestions.push({
        productId: variant.id,
        productName: variant.product.name + ' - ' + variant.colorName,
        suggestedQuantity,
        estimatedCost,
        expectedStockoutDate,
      })
    }
  }

  return {
    stockAlerts: stockAlerts.slice(0, 20),
    demandForecast: demandForecast.slice(0, 20),
    reorderSuggestions: reorderSuggestions.slice(0, 10),
  }
}
