import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import * as XLSX from 'xlsx'

const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER']
const MAX_IMPORT_FILE_SIZE = 10 * 1024 * 1024

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

function stringValue(input: unknown, fallback = '') {
  if (input === null || input === undefined) return fallback
  const value = String(input).trim()
  return value || fallback
}

function numberValue(input: unknown, fallback = 0) {
  const value = Number(input)
  return Number.isFinite(value) ? value : fallback
}

function normalizeRowKeys(row: Record<string, unknown>) {
  return Object.entries(row).reduce<Record<string, unknown>>((acc, [key, value]) => {
    const normalizedKey = key.replace(/^\uFEFF/, '').trim().toLowerCase()
    acc[normalizedKey] = value
    return acc
  }, {})
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!ADMIN_ROLES.includes(session.user.role as string)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await request.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json({ error: 'CSV file is required' }, { status: 400 })
  }

  if (file.size > MAX_IMPORT_FILE_SIZE) {
    return NextResponse.json({ error: 'File too large. Maximum upload size is 10MB.' }, { status: 413 })
  }

  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' })
  const sheetName = workbook.SheetNames[0]

  if (!sheetName) {
    return NextResponse.json({ error: 'No sheets found in uploaded file' }, { status: 400 })
  }

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
    defval: '',
    raw: false,
  })

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Uploaded file is empty' }, { status: 400 })
  }

  const uncategorized = await prisma.category.upsert({
    where: { slug: 'uncategorized' },
    update: {},
    create: {
      name: 'Uncategorized',
      slug: 'uncategorized',
      color: '#64748b',
    },
  })

  const results: Array<{ sku: string; status: string; message?: string }> = []

  for (const rawRow of rows) {
    try {
      const row = normalizeRowKeys(rawRow)
      const name = stringValue(row.name)
      const sku = stringValue(row.sku)
      const design = stringValue(row.design, 'Default')

      if (!name || !sku) {
        results.push({ sku: sku || 'N/A', status: 'ERROR', message: 'name and sku are required' })
        continue
      }

      const categoryName = stringValue(row.category || row.categoryname)
      const categorySlug = slugify(categoryName)

      let categoryId = uncategorized.id
      if (categoryName && categorySlug) {
        const category = await prisma.category.upsert({
          where: { slug: categorySlug },
          update: { name: categoryName },
          create: {
            name: categoryName,
            slug: categorySlug,
            color: '#6366f1',
          },
        })
        categoryId = category.id
      }

      let product = await prisma.product.findFirst({
        where: { name }
      });
      if (!product) {
        product = await prisma.product.create({
          data: {
            name,
            categoryId,
            description: stringValue(row.description, ''),
            isActive: stringValue(row.isActive, 'true').toLowerCase() !== 'false',
          }
        });
      } else {
        await prisma.product.update({
          where: { id: product.id },
          data: { 
            categoryId, 
            description: stringValue(row.description, ''), 
            isActive: stringValue(row.isActive, 'true').toLowerCase() !== 'false' 
          }
        });
      }

      const costPrice = row.costPrice === '' ? 0 : numberValue(row.costPrice, 0);

      await prisma.productVariant.upsert({
        where: { sku },
        update: {
          productId: product.id,
          colorName: stringValue(row.color, 'White'),
          colorHex: stringValue(row.colorHex, '#FFFFFF'),
          stockUnit: stringValue(row.unit, 'meters'),
          stockUnitLabel: stringValue(row.unit, 'meters'),
          saleUnit: stringValue(row.unit, 'meters'),
          saleUnitLabel: stringValue(row.unit, 'meters'),
          lowStockAt: numberValue(row.lowStockAt, 10),
          costPrice: costPrice,
          salePrice: costPrice,
          isActive: stringValue(row.isActive, 'true').toLowerCase() !== 'false',
        },
        create: {
          sku,
          productId: product.id,
          colorName: stringValue(row.color, 'White'),
          colorHex: stringValue(row.colorHex, '#FFFFFF'),
          stockUnit: stringValue(row.unit, 'meters'),
          stockUnitLabel: stringValue(row.unit, 'meters'),
          saleUnit: stringValue(row.unit, 'meters'),
          saleUnitLabel: stringValue(row.unit, 'meters'),
          lowStockAt: numberValue(row.lowStockAt, 10),
          costPrice: costPrice,
          salePrice: costPrice,
          isActive: stringValue(row.isActive, 'true').toLowerCase() !== 'false',
        },
      })

      results.push({ sku, status: 'OK' })
    } catch (error) {
      const row = normalizeRowKeys(rawRow)
      results.push({
        sku: stringValue(row.sku, 'N/A'),
        status: 'ERROR',
        message: error instanceof Error ? error.message : 'Import failed',
      })
    }
  }

  return NextResponse.json({
    imported: results.filter((r) => r.status === 'OK').length,
    failed: results.filter((r) => r.status === 'ERROR').length,
    results,
  })
}
