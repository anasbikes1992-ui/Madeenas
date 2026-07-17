/**
 * Dynamic Pricing Engine
 * Supports bulk discounts, customer segments, stock levels, and time-based pricing
 */

import { prisma } from '@/lib/db'
import { num } from '@/lib/money'
import { z } from 'zod'

// =============================================================================
// TYPES & SCHEMAS
// =============================================================================

export enum RuleType {
  BULK_DISCOUNT = 'BULK_DISCOUNT', // Quantity-based
  CUSTOMER_SEGMENT = 'CUSTOMER_SEGMENT', // VIP, wholesale, etc.
  STOCK_LEVEL = 'STOCK_LEVEL', // Clearance for overstocked items
  TIME_BASED = 'TIME_BASED', // Flash sales, seasonal
  PRODUCT_CATEGORY = 'PRODUCT_CATEGORY', // Category-wide discounts
}

export enum DiscountType {
  PERCENTAGE = 'PERCENTAGE', // 10% off
  FIXED_AMOUNT = 'FIXED_AMOUNT', // Rs. 500 off
  FIXED_PRICE = 'FIXED_PRICE', // Set price to Rs. 2000
}

export interface PriceRule {
  id: string
  name: string
  ruleType: RuleType
  discountType: DiscountType
  discountValue: number
  priority: number // Higher = applied first
  conditions: RuleConditions
  isActive: boolean
  startsAt?: Date
  endsAt?: Date
}

export interface RuleConditions {
  minQuantity?: number
  maxQuantity?: number
  customerSegments?: string[] // ['VIP', 'WHOLESALE']
  productIds?: string[]
  categoryIds?: string[]
  stockPercentageAbove?: number // e.g., 80% - clearance
  stockPercentageBelow?: number // e.g., 20% - premium pricing
  daysOfWeek?: number[] // [0-6] Sunday-Saturday
  timeRange?: { start: string; end: string } // '09:00'-'17:00'
}

export interface PricingContext {
  productId: string
  basePrice: number
  quantity: number
  customerId?: string
  categoryId?: string
  stockLevel?: number
  maxStockLevel?: number
  timestamp?: Date
}

export interface PriceCalculation {
  originalPrice: number
  finalPrice: number
  totalDiscount: number
  appliedRules: {
    ruleId: string
    ruleName: string
    discount: number
  }[]
}

// =============================================================================
// PRICE CALCULATION ENGINE
// =============================================================================

export async function calculatePrice(
  context: PricingContext
): Promise<PriceCalculation> {
  // Fetch active rules
  const rules = await getActiveRules()

  // Filter applicable rules
  const applicableRules = await filterApplicableRules(rules, context)

  // Sort by priority (highest first)
  const sortedRules = applicableRules.sort((a, b) => b.priority - a.priority)

  // Apply rules sequentially
  let currentPrice = context.basePrice * context.quantity
  const appliedRules: { ruleId: string; ruleName: string; discount: number }[] = []

  for (const rule of sortedRules) {
    const discount = applyRule(rule, currentPrice, context)
    if (discount > 0) {
      currentPrice -= discount
      appliedRules.push({
        ruleId: rule.id,
        ruleName: rule.name,
        discount,
      })
    }
  }

  return {
    originalPrice: context.basePrice * context.quantity,
    finalPrice: Math.max(0, currentPrice),
    totalDiscount: context.basePrice * context.quantity - currentPrice,
    appliedRules,
  }
}

// =============================================================================
// RULE FILTERING
// =============================================================================

async function filterApplicableRules(
  rules: PriceRule[],
  context: PricingContext
): Promise<PriceRule[]> {
  const now = context.timestamp || new Date()

  const applicable: PriceRule[] = []

  for (const rule of rules) {
    // Check time validity
    if (rule.startsAt && now < rule.startsAt) continue
    if (rule.endsAt && now > rule.endsAt) continue

    // Check conditions
    if (!evaluateConditions(rule.conditions, context)) continue

    applicable.push(rule)
  }

  return applicable
}

function evaluateConditions(
  conditions: RuleConditions,
  context: PricingContext
): boolean {
  // Quantity check
  if (conditions.minQuantity && context.quantity < conditions.minQuantity) {
    return false
  }
  if (conditions.maxQuantity && context.quantity > conditions.maxQuantity) {
    return false
  }

  // Product/Category check
  if (conditions.productIds && conditions.productIds.length > 0) {
    if (!conditions.productIds.includes(context.productId)) return false
  }
  if (conditions.categoryIds && conditions.categoryIds.length > 0) {
    if (!context.categoryId || !conditions.categoryIds.includes(context.categoryId)) {
      return false
    }
  }

  // Stock level check
  if (context.stockLevel !== undefined && context.maxStockLevel !== undefined) {
    const stockPercentage = (context.stockLevel / context.maxStockLevel) * 100

    if (
      conditions.stockPercentageAbove &&
      stockPercentage < conditions.stockPercentageAbove
    ) {
      return false
    }
    if (
      conditions.stockPercentageBelow &&
      stockPercentage > conditions.stockPercentageBelow
    ) {
      return false
    }
  }

  // Time-based checks
  const timestamp = context.timestamp || new Date()
  if (conditions.daysOfWeek && conditions.daysOfWeek.length > 0) {
    const dayOfWeek = timestamp.getDay()
    if (!conditions.daysOfWeek.includes(dayOfWeek)) return false
  }

  if (conditions.timeRange) {
    const currentTime = timestamp.toTimeString().slice(0, 5) // HH:MM
    if (
      currentTime < conditions.timeRange.start ||
      currentTime > conditions.timeRange.end
    ) {
      return false
    }
  }

  return true
}

// =============================================================================
// RULE APPLICATION
// =============================================================================

function applyRule(
  rule: PriceRule,
  currentPrice: number,
  context: PricingContext
): number {
  switch (rule.discountType) {
    case DiscountType.PERCENTAGE:
      return (currentPrice * rule.discountValue) / 100

    case DiscountType.FIXED_AMOUNT:
      return Math.min(rule.discountValue, currentPrice)

    case DiscountType.FIXED_PRICE:
      const fixedTotal = rule.discountValue * context.quantity
      return Math.max(0, currentPrice - fixedTotal)

    default:
      return 0
  }
}

// =============================================================================
// RULE MANAGEMENT
// =============================================================================

export async function createPriceRule(data: {
  name: string
  ruleType: RuleType
  discountType: DiscountType
  discountValue: number
  priority: number
  conditions: RuleConditions
  startsAt?: Date
  endsAt?: Date
}): Promise<PriceRule> {
  throw new Error('Price rules are no longer supported');
}

export async function updatePriceRule(
  id: string,
  data: Partial<PriceRule>
): Promise<PriceRule> {
  throw new Error('Price rules are no longer supported');
}

export async function deletePriceRule(id: string): Promise<void> {
  throw new Error('Price rules are no longer supported');
}

export async function getActiveRules(): Promise<PriceRule[]> {
  return [];
}

export async function listPriceRules(filters: {
  ruleType?: RuleType
  isActive?: boolean
  page?: number
  limit?: number
}): Promise<{ rules: PriceRule[]; total: number }> {
  return { rules: [], total: 0 };
}

// =============================================================================
// BULK PRICING HELPER
// =============================================================================

export async function calculateBulkPricing(
  items: { productId: string; quantity: number; basePrice: number }[],
  customerId?: string
): Promise<
  {
    productId: string
    quantity: number
    calculation: PriceCalculation
  }[]
> {
  // Fetch product details (category, stock) for all items
  const productIds = items.map((item) => item.productId)
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: {
      category: true,
      variants: { include: { stocks: true } },
    },
  })

  const results = await Promise.all(
    items.map(async (item) => {
      const product = products.find((p) => p.id === item.productId)
      if (!product) {
        throw new Error(`Product ${item.productId} not found`)
      }

      let totalStock = 0
      product.variants.forEach((v) => {
        totalStock += v.stocks.reduce((sum, s) => sum + num(s.quantity), 0)
      })

      const lowStockAt = product.variants.length > 0 ? num(product.variants[0].lowStockAt, 10) : 10
      const maxStock = lowStockAt * 10 // Rough estimate

      const context: PricingContext = {
        productId: item.productId,
        basePrice: item.basePrice,
        quantity: item.quantity,
        customerId,
        categoryId: product.categoryId,
        stockLevel: totalStock,
        maxStockLevel: maxStock,
      }

      const calculation = await calculatePrice(context)

      return {
        productId: item.productId,
        quantity: item.quantity,
        calculation,
      }
    })
  )

  return results
}
