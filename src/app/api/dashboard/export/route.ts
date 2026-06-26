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
      variants: {
        include: {
          stocks: {
            include: {
              location: true,
            },
          },
        },
      },
    },
    orderBy: [{ createdAt: 'desc' }],
  })

  const header = [
    'productId',
    'variantId',
    'name',
    'sku',
    'category',
    'color',
    'lowStockAt',
    'costPrice',
    'salePrice',
    'location',
    'stockQuantity',
    'isActive',
  ]

  const rows: string[] = [header.join(',')]

  for (const product of products) {
    if (product.variants.length === 0) {
      rows.push(
        [
          product.id,
          '',
          product.name,
          '',
          product.category?.name || '',
          '',
          '',
          '',
          '',
          '',
          '',
          product.isActive,
        ]
          .map((value) => toCsvValue(value as string | number | null | undefined))
          .join(',')
      )
      continue
    }

    for (const variant of product.variants) {
      if (variant.stocks.length === 0) {
        rows.push(
          [
            product.id,
            variant.id,
            product.name,
            variant.sku,
            product.category?.name || '',
            variant.colorName,
            variant.lowStockAt,
            variant.costPrice,
            variant.salePrice,
            '',
            '',
            variant.isActive,
          ]
            .map((value) => toCsvValue(value as string | number | null | undefined))
            .join(',')
        )
        continue
      }
      for (const stock of variant.stocks) {
        rows.push(
          [
            product.id,
            variant.id,
            product.name,
            variant.sku,
            product.category?.name || '',
            variant.colorName,
            variant.lowStockAt,
            variant.costPrice,
            variant.salePrice,
            stock.location.name,
            stock.quantity,
            variant.isActive,
          ]
            .map((value) => toCsvValue(value as string | number | null | undefined))
            .join(',')
        )
      }
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
