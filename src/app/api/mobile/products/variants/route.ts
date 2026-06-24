/**
 * GET /api/mobile/products/variants
 *
 * Returns the full hierarchical catalog for the mobile app:
 *   Category → Product → ProductVariant (shade/design/code) → ProductColor (color + stock per location)
 *
 * Query params:
 *   locationId   (optional) — when supplied, include stock quantities for that location
 *   search       (optional) — searches product name, variant code, variant design
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

  // Apply search across product name, variant code, and variant design
  if (search) {
    productWhere.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      {
        variants: {
          some: {
            OR: [
              { code: { contains: search, mode: 'insensitive' } },
              { design: { contains: search, mode: 'insensitive' } },
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
          orderBy: { code: 'asc' },
          include: {
            colors: {
              where: { isActive: true },
              include: {
                color: { select: { id: true, code: true, name: true, hexValue: true } },
                // Include stock for requested location or all locations
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
        },
      },
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where: productWhere }),
  ])

  // Shape the response so each ProductColor exposes a clean `stock` summary
  const shaped = products.map((product) => ({
    id: product.id,
    name: product.name,
    sku: product.sku,
    unit: product.unit,
    category: product.category,
    variants: product.variants.map((variant) => ({
      id: variant.id,
      code: variant.code,
      design: variant.design,
      unit: variant.unit,
      costPrice: variant.costPrice,
      colors: variant.colors.map((pc) => ({
        id: pc.id,
        sku: pc.sku,
        color: pc.color,
        // Normalized stock: if locationId was provided return a single quantity,
        // otherwise return the full per-location breakdown
        stock: locationId
          ? (pc.stocks[0]?.quantity ?? 0)
          : (pc.stocks as Array<{ location: { id: string; name: string; code: string; type: string }; quantity: number }>).map((sv) => ({
              location: sv.location,
              quantity: sv.quantity,
            })),
      })),
    })),
  }))

  return ok({ products: shaped, total, page, limit })
}
