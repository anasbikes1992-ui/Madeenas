import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { productCreateSchema } from '@/lib/validations'

const MANAGE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search') ?? ''
  const category = searchParams.get('category') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

  const where: Record<string, unknown> = { isActive: true }
  if (category) where.categoryId = category
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
      { design: { contains: search, mode: 'insensitive' } },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        stocks: {
          include: { location: { select: { id: true, name: true, code: true, type: true } } },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  return ok({ products, total, page, limit })
}

export async function POST(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!MANAGE_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  const parsed = productCreateSchema.safeParse(body)
  if (!parsed.success) {
    return fail('Invalid product', 400, 'VALIDATION', parsed.error.flatten().fieldErrors)
  }
  const d = parsed.data

  const category = await prisma.category.findUnique({ where: { id: d.categoryId } })
  if (!category) return fail('Category not found', 404, 'NOT_FOUND')

  const existing = await prisma.product.findUnique({ where: { sku: d.sku } })
  if (existing) return fail('A product with this SKU already exists', 409, 'DUPLICATE_SKU')

  const product = await prisma.product.create({
    data: {
      name: d.name,
      design: d.design,
      color: d.color,
      colorHex: d.colorHex || '#000000',
      sku: d.sku,
      categoryId: d.categoryId,
      unit: d.unit || 'meters',
      description: d.description ?? undefined,
      images: JSON.stringify(d.images ?? []),
      barcodeType: d.barcodeType || 'CODE128',
      lowStockAt: d.lowStockAt,
      costPrice: d.costPrice ?? null,
    },
    include: { category: true },
  })

  await logActivity({
    userId: user.sub!,
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    details: `Created product: ${product.name} (SKU: ${product.sku}) via mobile`,
  })

  return ok({ product }, 201)
}
