import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getBusinessMetrics } from '@/services/analytics.service'
import { subDays, startOfDay, endOfDay } from 'date-fns'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE']

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const role = session.user.role as string
    if (!ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')

    let startDate: Date
    let endDate: Date

    if (startDateParam && endDateParam) {
      startDate = startOfDay(new Date(startDateParam))
      endDate = endOfDay(new Date(endDateParam))
    } else {
      endDate = endOfDay(new Date())
      startDate = startOfDay(subDays(endDate, days))
    }

    // Multi-tenant support (placeholder for now)
    const tenantId = (session.user as any).tenantId || null

    const metrics = await getBusinessMetrics(tenantId, { startDate, endDate })

    return NextResponse.json({
      success: true,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      metrics,
    })
  } catch (error) {
    console.error('[Analytics API] Error:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch analytics',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
