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
  if (!hasPermission(session.user.role as string, 'inventory.read')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const format = (new URL(request.url).searchParams.get('format') || 'xlsx').toLowerCase()

  const rows = await prisma.stock.findMany({
    include: {
      product: { select: { id: true, sku: true, name: true, unit: true, alternateUnit: true, conversionFactor: true } },
      location: { select: { id: true, code: true, name: true, type: true } },
    },
    orderBy: [{ locationId: 'asc' }, { productId: 'asc' }],
  })

  const normalized = rows.map((row) => ({
    productId: row.productId,
    sku: row.product.sku,
    productName: row.product.name,
    unit: row.product.unit,
    alternateUnit: row.product.alternateUnit,
    conversionFactor: row.product.conversionFactor,
    locationId: row.locationId,
    locationCode: row.location.code,
    locationName: row.location.name,
    locationType: row.location.type,
    quantity: row.quantity,
    quantityInAlternateUnit:
      row.product.conversionFactor && row.product.alternateUnit
        ? Number((row.quantity * row.product.conversionFactor).toFixed(4))
        : null,
  }))

  if (format === 'csv') {
    const headers = [
      'productId',
      'sku',
      'productName',
      'unit',
      'alternateUnit',
      'conversionFactor',
      'locationId',
      'locationCode',
      'locationName',
      'locationType',
      'quantity',
      'quantityInAlternateUnit',
    ]

    const csvRows = [headers.join(',')]
    for (const row of normalized) {
      csvRows.push(headers.map((header) => toCsvValue((row as Record<string, unknown>)[header] as string | number | null | undefined)).join(','))
    }

    const csv = `\uFEFF${csvRows.join('\n')}`
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="inventory-matrix-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    })
  }

  const worksheet = XLSX.utils.json_to_sheet(normalized)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory')
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="inventory-matrix-${new Date().toISOString().slice(0, 10)}.xlsx"`,
    },
  })
}
