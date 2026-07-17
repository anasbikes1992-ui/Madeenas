import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { num, mul } from '@/lib/money'

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
  if (!hasPermission(session.user.role as string, 'inventory.read', session?.user)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const format = (new URL(request.url).searchParams.get('format') || 'xlsx').toLowerCase()

  const rows = await prisma.stock.findMany({
    include: {
      variant: { select: { id: true, sku: true, stockUnit: true, altUnit: true, saleToStockFactor: true, colorName: true, product: { select: { name: true } } } },
      location: { select: { id: true, code: true, name: true, type: true } },
    },
    orderBy: [{ locationId: 'asc' }, { variantId: 'asc' }],
  })

  const normalized = rows.map((row) => ({
    variantId: row.variantId,
    sku: row.variant.sku,
    productName: row.variant.product.name + ' - ' + row.variant.colorName,
    unit: row.variant.stockUnit,
    alternateUnit: row.variant.altUnit,
    conversionFactor: row.variant.saleToStockFactor,
    locationId: row.locationId,
    locationCode: row.location.code,
    locationName: row.location.name,
    locationType: row.location.type,
    quantity: num(row.quantity),
    quantityInAlternateUnit:
      row.variant.saleToStockFactor && row.variant.altUnit
        ? Number(mul(row.quantity, row.variant.saleToStockFactor).toFixed(4))
        : null,
  }))

  if (format === 'csv') {
    const headers = [
      'variantId',
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
