/**
 * GET /api/mobile/products/variants
 *
 * Returns the full hierarchical catalog for the mobile app:
 *   Category → Product → ProductVariant (color/shade) → Stock per location
 *
 * Query params:
 *   locationId   (optional) — when supplied, include stock quantities for that location
 *   search       (optional) — searches product name, variant SKU, variant colorName
 *   categoryId   (optional) — filter to a single category
 *   page         (default 1)
 *   limit        (default 50, max 200)
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const { searchParams } = new URL(request.url)
  const locationId = searchParams.get('locationId') ?? undefined
  const search = searchParams.get('search') ?? ''
  const categoryId = searchParams.get('categoryId') ?? ''
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') ?? '50', 10)))

  // Build product filter
  const productWhere: Record<string, unknown> = { isActive: true }
  if (categoryId) productWhere.categoryId = categoryId

  // Apply search across product name, variant SKU, and variant colorName
  if (search) {
    productWhere.OR = [
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
      where: productWhere,
      include: {
        category: { select: { id: true, name: true, slug: true, color: true } },
        variants: {
          where: { isActive: true },
          orderBy: { sku: 'asc' },
          include: {
            stocks: locationId
              ? {
                  where: { locationId },
                  select: { locationId: true, quantity: true },
                }
              : {
                  include: {
                    location: {
                      select: { id: true, name: true, code: true, type: true },
                    },
                  },
                },
          },
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where: productWhere }),
  ])

  // Shape the response so each ProductVariant exposes a clean `stock` summary
  const shaped = products.map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      sku: variant.sku,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      stockUnit: variant.stockUnit,
      stockUnitLabel: variant.stockUnitLabel,
      saleUnit: variant.saleUnit,
      saleUnitLabel: variant.saleUnitLabel,
      saleToStockFactor: variant.saleToStockFactor,
      costPrice: variant.costPrice,
      salePrice: variant.salePrice,
      lowStockAt: variant.lowStockAt,
      // Normalized stock: if locationId was provided return a single quantity,
      // otherwise return the full per-location breakdown
      stock: locationId
        ? ((variant.stocks as Array<{ locationId: string; quantity: number }>)[0]?.quantity ?? 0)
        : (variant.stocks as Array<{ location: { id: string; name: string; code: string; type: string }; quantity: number }>).map((sv) => ({
            location: sv.location,
            quantity: sv.quantity,
          })),
    })),
  }))

  return ok({ products: shaped, total, page, limit })
}
