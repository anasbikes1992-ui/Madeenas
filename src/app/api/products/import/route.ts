import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { hasPermission } from '@/lib/permissions'

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const MAX_ROW_COUNT = 2000
const ALLOWED_FILE_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
  'application/csv',
])

function textValue(input: unknown, fallback = '') {
  if (input === null || input === undefined) return fallback
  const text = String(input).trim()
  return text || fallback
}

function numberValue(input: unknown, fallback = 0) {
  const value = Number(input)
  return Number.isFinite(value) ? value : fallback
}

function normalizeRow(row: Record<string, unknown>) {
  return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    acc[key.trim().toLowerCase()] = value
    return acc
  }, {})
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!hasPermission(session.user.role as string, 'products.update')) {
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

  const fallbackCategory = await prisma.category.upsert({
    where: { slug: 'uncategorized' },
    update: {},
    create: { name: 'Uncategorized', slug: 'uncategorized', color: '#64748b' },
  })

  const results: Array<{ sku: string; status: 'OK' | 'ERROR'; message?: string }> = []

  for (const raw of rows) {
    const row = normalizeRow(raw)
    const sku = textValue(row.sku)
    const name = textValue(row.name)
    const design = textValue(row.design, 'Default')

    if (!sku || !name) {
      results.push({ sku: sku || 'N/A', status: 'ERROR', message: 'name and sku are required' })
      continue
    }

    try {
      const categoryName = textValue(row.category)
      let categoryId = fallbackCategory.id
      if (categoryName) {
        const slug = categoryName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        const category = await prisma.category.upsert({
          where: { slug },
          update: { name: categoryName },
          create: { name: categoryName, slug, color: '#6366f1' },
        })
        categoryId = category.id
      }

      await prisma.product.upsert({
        where: { sku },
        update: {
          name,
          design,
          categoryId,
          unit: textValue(row.unit, 'meters'),
          alternateUnit: textValue(row.alternateunit || row.alternate_unit) || null,
          conversionFactor: row.conversionfactor === '' ? null : numberValue(row.conversionfactor, 0) || null,
          color: textValue(row.color, 'White'),
          colorHex: textValue(row.colorhex, '#FFFFFF'),
          lowStockAt: numberValue(row.lowstockat, 10),
          costPrice: row.costprice === '' ? null : numberValue(row.costprice, 0),
          description: textValue(row.description) || null,
          isActive: textValue(row.isactive, 'true').toLowerCase() !== 'false',
        },
        create: {
          sku,
          name,
          design,
          categoryId,
          unit: textValue(row.unit, 'meters'),
          alternateUnit: textValue(row.alternateunit || row.alternate_unit) || null,
          conversionFactor: row.conversionfactor === '' ? null : numberValue(row.conversionfactor, 0) || null,
          color: textValue(row.color, 'White'),
          colorHex: textValue(row.colorhex, '#FFFFFF'),
          lowStockAt: numberValue(row.lowstockat, 10),
          costPrice: row.costprice === '' ? null : numberValue(row.costprice, 0),
          description: textValue(row.description) || null,
          isActive: textValue(row.isactive, 'true').toLowerCase() !== 'false',
        },
      })

      results.push({ sku, status: 'OK' })
    } catch (error) {
      results.push({
        sku,
        status: 'ERROR',
        message: 'Import failed for this row',
      })
      console.error('Product import row failed', { sku, error })
    }
  }

  const imported = results.filter((item) => item.status === 'OK').length
  const failed = results.length - imported

  return NextResponse.json({ imported, failed, results })
}
