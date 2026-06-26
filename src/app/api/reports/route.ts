import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'reports.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'movement'
  const days = parseInt(searchParams.get('days') || '30')
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  if (type === 'movement') {
    let movementWarning: string | undefined
    const [stockIns, transfers] = await Promise.all([
      prisma.stockIn.groupBy({
        by: ['createdAt'],
        _sum: { quantityAddedToStock: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.stockTransferItem.findMany({
        where: {
          transfer: {
            status: { in: ['DISPATCHED', 'RECEIVED'] },
            createdAt: { gte: startDate },
          }
        },
        include: { transfer: { select: { createdAt: true } } }
      }).then(items => {
        const grouped = items.reduce((acc, item) => {
          const date = item.transfer.createdAt.toISOString().split('T')[0]
          acc[date] = (acc[date] || 0) + (item.dispatchedQty || 0)
          return acc
        }, {} as Record<string, number>)
        return Object.entries(grouped).map(([date, qty]) => ({
          createdAt: new Date(date),
          _sum: { dispatchedQty: qty }
        }))
      }).catch((error) => {
        console.error('[reports] movement transfer query failed:', error)
        movementWarning = 'Stock-out movement is temporarily unavailable due to database schema mismatch.'
        return []
      }),
    ])
    return NextResponse.json({ stockIns, stockOuts: transfers, warning: movementWarning })
  }

  if (type === 'top-products') {
    const topVariants = await prisma.stockIn.groupBy({
      by: ['variantId'],
      _sum: { quantityAddedToStock: true },
      orderBy: { _sum: { quantityAddedToStock: 'desc' } },
      take: 10,
    })
    const variantIds = topVariants.map(v => v.variantId)
    const variants = await prisma.productVariant.findMany({
      where: { id: { in: variantIds } },
      include: { product: { include: { category: true } } },
    })
    return NextResponse.json({ topProducts: topVariants, variants })
  }

  if (type === 'inventory') {
    const inventoryMatrix = await prisma.stock.findMany({
      include: {
        variant: { include: { product: { include: { category: true } } } },
        location: true,
      },
      orderBy: [{ variant: { product: { name: 'asc' } } }, { location: { name: 'asc' } }],
    })
    return NextResponse.json({ inventoryMatrix })
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
}
