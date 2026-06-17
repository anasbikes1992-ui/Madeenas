import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

function toCsvValue(value: string | number | null | undefined) {
  if (value === null || value === undefined) return ''
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'products.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const format = (new URL(request.url).searchParams.get('format') || 'xlsx').toLowerCase()

  const products = await prisma.product.findMany({
    include: {
      category: true,
      stocks: { include: { location: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const rows = products.flatMap((product) => {
    if (product.stocks.length === 0) {
      return [{
        productId: product.id,
        name: product.name,
        design: product.design,
        sku: product.sku,
        category: product.category.name,
        unit: product.unit,
        alternateUnit: product.alternateUnit,
        conversionFactor: product.conversionFactor,
        color: product.color,
        colorHex: product.colorHex,
        lowStockAt: product.lowStockAt,
        costPrice: product.costPrice,
        locationCode: '',
        locationName: '',
        stockQuantity: 0,
        isActive: product.isActive,
      }]
    }

    return product.stocks.map((stock) => ({
      productId: product.id,
      name: product.name,
      design: product.design,
      sku: product.sku,
      category: product.category.name,
      unit: product.unit,
      alternateUnit: product.alternateUnit,
      conversionFactor: product.conversionFactor,
      color: product.color,
      colorHex: product.colorHex,
      lowStockAt: product.lowStockAt,
      costPrice: product.costPrice,
      locationCode: stock.location.code,
      locationName: stock.location.name,
      stockQuantity: stock.quantity,
      isActive: product.isActive,
    }))
  })

  if (format === 'csv') {
    const headers = [
      'productId',
      'name',
      'design',
      'sku',
      'category',
      'unit',
      'alternateUnit',
      'conversionFactor',
      'color',
      'colorHex',
      'lowStockAt',
      'costPrice',
      'locationCode',
      'locationName',
      'stockQuantity',
      'isActive',
    ]

    const lines = [headers.join(',')]
    for (const row of rows) {
      lines.push(headers.map((header) => toCsvValue((row as Record<string, unknown>)[header] as string | number | null | undefined)).join(','))
    }

    const csv = `\uFEFF${lines.join('\n')}`
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Products')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="products-export-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
