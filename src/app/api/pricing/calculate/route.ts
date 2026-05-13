import { NextRequest, NextResponse } from 'next/server'
import { calculatePrice, calculateBulkPricing, PricingContext } from '@/services/pricing.service'
import { auth } from '@/lib/auth'

// =============================================================================
// POST /api/pricing/calculate - Calculate Price for Products
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const body = await request.json()

    // Single product calculation
    if (body.productId && body.basePrice && body.quantity) {
      const context: PricingContext = {
        productId: body.productId,
        basePrice: body.basePrice,
        quantity: body.quantity,
        customerId: session?.user?.id,
        categoryId: body.categoryId,
        stockLevel: body.stockLevel,
        maxStockLevel: body.maxStockLevel,
        timestamp: body.timestamp ? new Date(body.timestamp) : undefined,
      }

      const calculation = await calculatePrice(context)

      return NextResponse.json({
        success: true,
        calculation,
      })
    }

    // Bulk calculation
    if (body.items && Array.isArray(body.items)) {
      const results = await calculateBulkPricing(body.items, session?.user?.id)

      return NextResponse.json({
        success: true,
        results,
      })
    }

    return NextResponse.json(
      { error: 'Invalid request format' },
      { status: 400 }
    )
  } catch (error) {
    console.error('Calculate price error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to calculate price',
      },
      { status: 400 }
    )
  }
}
