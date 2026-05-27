import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']

function toCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

export async function GET() {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const products = await prisma.product.findMany({
    include: {
      category: true,
      stocks: {
        include: {
          location: true,
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  const header = [
    'productId',
    'name',
    'design',
    'sku',
    'category',
    'unit',
    'color',
    'lowStockAt',
    'costPrice',
    'location',
    'stockQuantity',
    'isActive',
  ]

  const rows: string[] = [header.join(',')]

  for (const product of products) {
    if (product.stocks.length === 0) {
      rows.push(
        [
          product.id,
          product.name,
          product.design,
          product.sku,
          product.category.name,
          product.unit,
          product.color,
          product.lowStockAt,
          product.costPrice,
          '',
          '',
          product.isActive,
        ]
          .map((value) => toCsvValue(value as string | number | null | undefined))
          .join(',')
      )
      continue
    }

    for (const stock of product.stocks) {
      rows.push(
        [
          product.id,
          product.name,
          product.design,
          product.sku,
          product.category.name,
          product.unit,
          product.color,
          product.lowStockAt,
          product.costPrice,
          stock.location.name,
          stock.quantity,
          product.isActive,
        ]
          .map((value) => toCsvValue(value as string | number | null | undefined))
          .join(',')
      )
    }
  }

  const csv = `\uFEFF${rows.join('\n')}`

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="dashboard-export-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
