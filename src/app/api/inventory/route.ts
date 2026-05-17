import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { logActivity } from '@/lib/audit'
import { hasPermission } from '@/lib/permissions'

/**
 * GET /api/inventory/low-stock
 * Get all products below their low stock threshold
 */
export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'inventory.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    // Fetch all stocks with related data
    const allStocks = await prisma.stock.findMany({
      include: {
        product: {
          include: { category: true },
        },
        location: true,
      },
    })

    // Filter for low stock items in JavaScript
    const lowStockItems = allStocks
      .filter((s) => s.quantity < (s.product.lowStockAt || 10))
      .sort((a, b) => a.quantity - b.quantity)

    return NextResponse.json({
      lowStockCount: lowStockItems.length,
      items: lowStockItems.map((item) => ({
        id: item.id,
        product: {
          id: item.product.id,
          name: item.product.name,
          sku: item.product.sku,
          category: item.product.category.name,
        },
        location: item.location.name,
        currentQuantity: item.quantity,
        lowStockThreshold: item.product.lowStockAt,
        status: item.quantity === 0 ? 'STOCKOUT' : item.quantity < item.product.lowStockAt / 2 ? 'CRITICAL' : 'LOW',
      })),
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
  if (!hasPermission(session.user.role as string, 'inventory.reorder')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { productId, locationId, reorderQuantity, supplierId } = await request.json()

    if (!productId || !locationId || !reorderQuantity) {
      return NextResponse.json(
        { error: 'Missing required fields: productId, locationId, reorderQuantity' },
        { status: 400 },
      )
    }

    // Verify product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    })
    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
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
        productId,
        locationId,
        quantity: reorderQuantity,
        costPrice: product.costPrice,
        receivedBy: session.user.id,
        note: `Auto-reorder from low stock alert. Threshold: ${product.lowStockAt}`,
        supplierId: supplierId || null,
      },
      include: {
        product: true,
        location: true,
        user: true,
      },
    })

    // Update stock quantity
    await prisma.stock.upsert({
      where: {
        productId_locationId: {
          productId,
          locationId,
        },
      },
      update: {
        quantity: {
          increment: reorderQuantity,
        },
      },
      create: {
        productId,
        locationId,
        quantity: reorderQuantity,
      },
    })

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'REORDER',
      entity: 'Product',
      entityId: productId,
      details: `Auto-reorder created: ${reorderQuantity} units for ${product.name} at ${location.name}`,
    })

    return NextResponse.json({
      success: true,
      reorderRecord: {
        id: reorderRecord.id,
        productName: reorderRecord.product.name,
        quantity: reorderRecord.quantity,
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
      by: ['productId'],
      where: {
        sale: {
          createdAt: {
            gte: thirtyDaysAgo,
          },
        },
      },
      _sum: {
        quantity: true,
      },
    })

    // For each product with sales, calculate suggested reorder quantity
    const suggestions = await Promise.all(
      salesVelocity.map(async (sv) => {
        const product = await prisma.product.findUnique({
          where: { id: sv.productId },
          include: {
            stocks: {
              include: { location: true },
            },
          },
        })

        if (!product) return null

        const dailyVelocity = (sv._sum.quantity || 0) / 30
        const daysOfInventory = dailyVelocity > 0 ? product.stocks.reduce((sum, s) => sum + s.quantity, 0) / dailyVelocity : 999

        return {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          currentStock: product.stocks.reduce((sum, s) => sum + s.quantity, 0),
          dailySalesVelocity: dailyVelocity.toFixed(1),
          daysOfInventory: daysOfInventory.toFixed(1),
          lowStockThreshold: product.lowStockAt,
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
