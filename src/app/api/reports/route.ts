import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'reports.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'movement'
  const days = parseInt(searchParams.get('days') || '30')
  const startDate = new Date()
  startDate.setDate(startDate.getDate() - days)

  if (type === 'movement') {
    const [stockIns, stockOuts] = await Promise.all([
      prisma.stockIn.groupBy({
        by: ['createdAt'],
        _sum: { quantity: true },
        where: { createdAt: { gte: startDate } },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.stockOutRequest.groupBy({
        by: ['createdAt'],
        _sum: { quantityApproved: true },
        where: {
          status: { in: ['DISPATCHED', 'IN_TRANSIT', 'ACKNOWLEDGED', 'RECEIVED'] },
          createdAt: { gte: startDate },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ])
    return NextResponse.json({ stockIns, stockOuts })
  }

  if (type === 'top-products') {
    const topProducts = await prisma.stockIn.groupBy({
      by: ['productId'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 10,
    })
    const productIds = topProducts.map(p => p.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { category: true },
    })
    return NextResponse.json({ topProducts, products })
  }

  if (type === 'inventory') {
    const inventoryMatrix = await prisma.stock.findMany({
      include: {
        product: { include: { category: true } },
        location: true,
      },
      orderBy: [{ product: { name: 'asc' } }, { location: { name: 'asc' } }],
    })
    return NextResponse.json({ inventoryMatrix })
  }

  return NextResponse.json({ error: 'Unknown report type' }, { status: 400 })
}
