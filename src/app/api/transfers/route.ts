import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')

  const where: any = {}
  
  const [requests, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where,
      include: {
        fromLocation: true,
        toLocation: true,
        requestedByUser: { select: { id: true, name: true, role: true } },
        items: {
          include: { variant: { include: { product: true } } }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockTransfer.count({ where }),
  ])
  return NextResponse.json({ requests, total })
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const role = session.user.role as string
  if (!hasPermission(role, 'stock.request')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  if (!body.fromLocationId || !body.toLocationId || !body.items || !body.items.length) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const transferNo = `TRF-${Date.now()}`

  const transfer = await prisma.stockTransfer.create({
    data: {
      transferNo,
      fromLocationId: body.fromLocationId,
      toLocationId: body.toLocationId,
      requestedBy: session.user.id,
      note: body.note,
      items: {
        create: body.items.map((item: any) => ({
          variantId: item.variantId || item.productColorId || item.productId,
          requestedQty: item.quantityRequested || item.quantity || 1,
        }))
      }
    },
    include: {
      items: true
    }
  })

  return NextResponse.json(
    {
      batch: {
        count: 1,
        items: [transfer],
      },
    },
    { status: 201 }
  )
}
