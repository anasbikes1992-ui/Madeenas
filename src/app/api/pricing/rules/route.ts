import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import {
  createPriceRule,
  updatePriceRule,
  deletePriceRule,
  listPriceRules,
  RuleType,
  DiscountType,
} from '@/services/pricing.service'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

// =============================================================================
// POST /api/pricing/rules - Create Price Rule
// =============================================================================

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user || !ADMIN_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const rule = await createPriceRule(body)

    return NextResponse.json({
      success: true,
      rule,
      message: 'Price rule created successfully',
    })
  } catch (error) {
    console.error('Create price rule error:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to create price rule',
      },
      { status: 400 }
    )
  }
}

// =============================================================================
// GET /api/pricing/rules - List Price Rules
// =============================================================================

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ruleType = searchParams.get('ruleType') as RuleType | null
    const isActive = searchParams.get('isActive')
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)

    const result = await listPriceRules({
      ruleType: ruleType || undefined,
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      page,
      limit,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })
  } catch (error) {
    console.error('List price rules error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch price rules' },
      { status: 500 }
    )
  }
}
