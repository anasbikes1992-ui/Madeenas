import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'
import { logActivity } from '@/lib/audit'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_ROW_COUNT = 5000
const ALLOWED_FILE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
])

function normalizeRow(row: Record<string, unknown>) {
  return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key.trim().toLowerCase()] = value
    return acc
  }, {})
}

function textValue(input: unknown) {
  return input === null || input === undefined ? '' : String(input).trim()
}

function numberValue(input: unknown) {
  const n = Number(input)
  return Number.isFinite(n) ? n : NaN
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'stock.adjust')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'File is required' }, { status: 400 })
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large. Max size is 5MB.' }, { status: 413 })
  }
  if (file.type && !ALLOWED_FILE_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Unsupported file type. Use XLSX, XLS, or CSV.' }, { status: 400 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return NextResponse.json({ error: 'No worksheet found' }, { status: 400 })

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  })

  if (rows.length === 0) return NextResponse.json({ error: 'File has no rows' }, { status: 400 })
  if (rows.length > MAX_ROW_COUNT) {
    return NextResponse.json({ error: `Too many rows. Maximum is ${MAX_ROW_COUNT}.` }, { status: 413 })
  }

  let imported = 0
  const results: Array<{ row: number; status: 'OK' | 'ERROR'; message?: string }> = []

  for (let index = 0; index < rows.length; index += 1) {
    const row = normalizeRow(rows[index])
    const sku = textValue(row.sku)
    const locationCode = textValue(row.locationcode || row.location_code)
    const quantity = numberValue(row.quantity)

    if (!sku || !locationCode || Number.isNaN(quantity)) {
      results.push({ row: index + 2, status: 'ERROR', message: 'sku, locationCode, quantity are required' })
      continue
    }

    const [variant, location] = await Promise.all([
      prisma.productVariant.findUnique({ where: { sku }, select: { id: true, product: { select: { name: true } } } }),
      prisma.location.findUnique({ where: { code: locationCode }, select: { id: true, name: true } }),
    ])

    if (!variant || !location) {
      results.push({ row: index + 2, status: 'ERROR', message: 'Invalid sku or locationCode' })
      continue
    }

    await prisma.stock.upsert({
      where: { variantId_locationId: { variantId: variant.id, locationId: location.id } },
      update: { quantity },
      create: { variantId: variant.id, locationId: location.id, quantity },
    })

    imported += 1
    results.push({ row: index + 2, status: 'OK' })
  }

  await logActivity({
    userId: session.user.id,
    action: 'INVENTORY_MATRIX_IMPORT',
    entity: 'Stock',
    details: `Imported/updated ${imported} inventory rows from matrix file`,
  })

  return NextResponse.json({ imported, failed: rows.length - imported, results })
}
