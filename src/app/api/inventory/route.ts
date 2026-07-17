import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'
import { num } from '@/lib/money'

/**
 * GET /api/inventory/low-stock
 * Get all products below their low stock threshold
 */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'inventory.read', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch all stocks with related data
    const allStocks = await prisma.stock.findMany({
      include: {
        variant: {
          include: { product: { include: { category: true } } },
        },
        location: true,
      },
    })

    // Filter for low stock items in JavaScript
    const lowStockItems = allStocks
      .filter((s) => num(s.quantity) < num(s.variant.lowStockAt, 10))
      .sort((a, b) => num(a.quantity) - num(b.quantity))

    return NextResponse.json({
      lowStockCount: lowStockItems.length,
      items: lowStockItems.map((item) => {
        const quantity = num(item.quantity)
        const threshold = num(item.variant.lowStockAt)
        return {
          id: item.id,
          product: {
            id: item.variant.product.id,
            name: item.variant.product.name + ' - ' + item.variant.colorName,
            sku: item.variant.sku,
            category: item.variant.product.category.name,
          },
          location: item.location.name,
          currentQuantity: quantity,
          lowStockThreshold: threshold,
          status: quantity === 0 ? 'STOCKOUT' : quantity < threshold / 2 ? 'CRITICAL' : 'LOW',
        }
      }),
    })
  } catch (error) {
    console.error('Low stock query error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch low stock items', details: String(error) },
      { status: 500 },
    )
  }
}

/**
 * POST /api/inventory/reorder
 * Create a reorder request for low stock items
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'inventory.reorder', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { variantId, locationId, reorderQuantity, supplierId } = await request.json()

    if (!variantId || !locationId || !reorderQuantity) {
      return NextResponse.json(
        { error: 'Missing required fields: variantId, locationId, reorderQuantity' },
        { status: 400 },
      )
    }

    // Verify variant exists
    const variant = await prisma.productVariant.findUnique({
      where: { id: variantId },
      include: { product: true }
    })
    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    // Verify location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    })
    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 })
    }

    // Create stock in record for reorder
    const reorderRecord = await prisma.stockIn.create({
      data: {
        variantId,
        locationId,
        receivedUnit: variant.stockUnit,
        receivedQty: reorderQuantity,
        conversionFactor: 1,
        quantityAddedToStock: reorderQuantity,
        costPrice: variant.costPrice,
        receivedBy: session.user.id,
        note: `Auto-reorder from low stock alert. Threshold: ${variant.lowStockAt}`,
        supplierId: supplierId || null,
      },
      include: {
        variant: { include: { product: true } },
        location: true,
        user: true,
      },
    })

    // Update stock quantity
    await prisma.stock.upsert({
      where: {
        variantId_locationId: {
          variantId,
          locationId,
        },
      },
      update: {
        quantity: {
          increment: reorderQuantity,
        },
      },
      create: {
        variantId,
        locationId,
        quantity: reorderQuantity,
      },
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'REORDER',
      entity: 'ProductVariant',
      entityId: variantId,
      details: `Auto-reorder created: ${reorderQuantity} units for ${variant.product.name} (${variant.colorName}) at ${location.name}`,
    })

    return NextResponse.json({
      success: true,
      reorderRecord: {
        id: reorderRecord.id,
        productName: reorderRecord.variant.product.name + ' (' + reorderRecord.variant.colorName + ')',
        quantity: reorderRecord.quantityAddedToStock,
        location: reorderRecord.location.name,
        createdAt: reorderRecord.createdAt,
      },
    })
  } catch (error) {
    console.error('Reorder creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create reorder', details: String(error) },
      { status: 500 },
    )
  }
}

/**
 * GET /api/inventory/reorder-suggestions
 * Get AI-based reorder suggestions based on sales velocity and current stock
 */
export async function getReorderSuggestions() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Get last 30 days of sales
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const salesVelocity = await prisma.saleItem.groupBy({
      by: ['variantId'],
      where: {
        sale: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      },
      _sum: {
        saleQty: true,
      },
    })

    // For each product with sales, calculate suggested reorder quantity
    const suggestions = await Promise.all(
      salesVelocity.map(async (sv) => {
        const variant = await prisma.productVariant.findUnique({
          where: { id: sv.variantId },
          include: {
            product: true,
            stocks: {
              include: { location: true },
            },
          },
        })

        if (!variant) return null

        const currentStock = variant.stocks.reduce((sum, s) => sum + num(s.quantity), 0)
        const dailyVelocity = num(sv._sum.saleQty) / 30
        const daysOfInventory = dailyVelocity > 0 ? currentStock / dailyVelocity : 999

        return {
          productId: variant.id,
          sku: variant.sku,
          name: variant.product.name + ' - ' + variant.colorName,
          currentStock,
          dailySalesVelocity: dailyVelocity.toFixed(1),
          daysOfInventory: daysOfInventory.toFixed(1),
          lowStockThreshold: num(variant.lowStockAt),
          suggestedReorderQuantity: Math.ceil(dailyVelocity * 30), // 30 days supply
          urgency:
            daysOfInventory < 5
              ? 'CRITICAL'
              : daysOfInventory < 10
                ? 'HIGH'
                : daysOfInventory < 20
                  ? 'MEDIUM'
                  : 'LOW',
        }
      }),
    )

    return NextResponse.json({
      suggestions: suggestions.filter((s) => s !== null).sort((a, b) => {
        const urgencyOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }
        return urgencyOrder[a!.urgency as keyof typeof urgencyOrder] - urgencyOrder[b!.urgency as keyof typeof urgencyOrder]
      }),
    })
  } catch (error) {
    console.error('Reorder suggestions error:', error)
    return NextResponse.json(
      { error: 'Failed to generate suggestions', details: String(error) },
      { status: 500 },
    )
  }
}
