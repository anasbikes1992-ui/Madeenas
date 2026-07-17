import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { num } from '@/lib/money'
import { computeRetailPrice } from '@/lib/pricing'
import { getRetailMarkup, getVatRate } from '@/lib/settings'
import { z } from 'zod'

const MANAGE_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])

/**
 * A product is created together with its first variant: SKU, price, and stock
 * all live on the variant, so a variant-less product is unsellable.
 */
const createProductSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters'),
  categoryId: z.string().trim().min(1, 'categoryId is required'),
  description: z.string().trim().max(2000).optional().nullable(),
  images: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  variant: z
    .object({
      sku: z.string().trim().min(1, 'SKU is required'),
      colorName: z.string().trim().min(1, 'Colour is required'),
      colorHex: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex colour')
        .optional(),
      unit: z.string().trim().min(1, 'Unit is required'),
      unitLabel: z.string().trim().optional(),
      lowStockAt: z.coerce.number().nonnegative().optional(),
      costPrice: z.coerce.number().nonnegative().optional().nullable(),
      salePrice: z.coerce.number().nonnegative().optional().nullable(),
    })
    .optional(),
})

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
      {
        variants: {
          some: {
            OR: [
              { sku: { contains: search, mode: 'insensitive' } },
              { colorName: { contains: search, mode: 'insensitive' } },
            ],
            isActive: true,
          },
        },
      },
    ]
  }

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          where: { isActive: true },
          include: {
            stocks: {
              include: { location: { select: { id: true, name: true, code: true, type: true } } },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
  ])

  const [markup, taxRate] = await Promise.all([getRetailMarkup(), getVatRate()])

  // Flattened to one entry per VARIANT: the POS sells variants (a colour of a
  // product), not products, and sku/price/stock all live on the variant. The
  // previous shape nested variants inside products while the app read `sku` and
  // `costPrice` from the top level, so every parse threw and the catalogue came
  // back empty.
  //
  // Prices are computed here. Clients must display `salePrice`/`retailPrice`
  // and never apply their own markup.
  const items = products.flatMap((product) =>
    product.variants.map((variant) => ({
      id: variant.id,
      variantId: variant.id,
      productId: product.id,
      name: product.name,
      sku: variant.sku,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      category: product.category,
      description: product.description,
      unit: variant.saleUnit,
      unitLabel: variant.saleUnitLabel,
      stockUnit: variant.stockUnit,
      saleToStockFactor: num(variant.saleToStockFactor, 1),
      lowStockAt: num(variant.lowStockAt),
      // POS line price (authoritative).
      salePrice: variant.salePrice === null ? null : num(variant.salePrice),
      // Customer-facing retail price derived from cost x markup.
      retailPrice: computeRetailPrice(variant.costPrice, markup),
      images: product.images,
      stocks: variant.stocks.map((s) => ({
        location: s.location,
        quantity: num(s.quantity),
      })),
      totalStock: variant.stocks.reduce((sum, s) => sum + num(s.quantity), 0),
    }))
  )

  return ok({ products: items, total, page, limit, taxRate })
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

  const parsed = createProductSchema.safeParse(body)
  if (!parsed.success) {
    return fail(
      parsed.error.issues[0]?.message ?? 'Validation error',
      400,
      'VALIDATION'
    )
  }
  const data = parsed.data

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
  if (!category) return fail('Category not found', 404, 'NOT_FOUND')

  if (data.variant) {
    const existingSku = await prisma.productVariant.findUnique({
      where: { sku: data.variant.sku },
      select: { id: true },
    })
    if (existingSku) return fail('That SKU is already in use', 409, 'DUPLICATE_SKU')
  }

  // Product and its first variant are created together: a product with no
  // variant has no SKU, price, or stock and cannot be sold, so it must never
  // exist as a half-finished record.
  const product = await prisma.$transaction(async (tx) => {
    const created = await tx.product.create({
      data: {
        name: data.name.trim(),
        categoryId: data.categoryId,
        description: data.description ?? null,
        images: data.images ?? [],
        isActive: data.isActive ?? true,
      },
    })

    if (data.variant) {
      const v = data.variant
      await tx.productVariant.create({
        data: {
          productId: created.id,
          sku: v.sku.trim(),
          colorName: v.colorName.trim(),
          colorHex: v.colorHex ?? '#6366f1',
          stockUnit: v.unit,
          stockUnitLabel: v.unitLabel ?? v.unit,
          saleUnit: v.unit,
          saleUnitLabel: v.unitLabel ?? v.unit,
          saleToStockFactor: 1,
          lowStockAt: v.lowStockAt ?? 10,
          costPrice: v.costPrice ?? null,
          salePrice: v.salePrice ?? null,
        },
      })
    }

    return tx.product.findUniqueOrThrow({
      where: { id: created.id },
      include: { category: true, variants: true },
    })
  })

  await logActivity({
    userId: user.sub!,
    action: 'CREATE',
    entity: 'Product',
    entityId: product.id,
    details: `Created product: ${product.name} via mobile`,
  })

  return ok({ product }, 201)
}
