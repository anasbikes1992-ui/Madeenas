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
import { num } from '@/lib/money'
import { computeRetailPrice } from '@/lib/pricing'
import { getRetailMarkup, getVatRate } from '@/lib/settings'

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

  const [markup, taxRate] = await Promise.all([getRetailMarkup(), getVatRate()])

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
      saleToStockFactor: num(variant.saleToStockFactor, 1),
      costPrice: variant.costPrice === null ? null : num(variant.costPrice),
      // Authoritative POS price. Clients display this and must never compute
      // their own markup — the server owns pricing.
      salePrice: variant.salePrice === null ? null : num(variant.salePrice),
      retailPrice: computeRetailPrice(variant.costPrice, markup),
      lowStockAt: num(variant.lowStockAt),
      // Normalized stock: if locationId was provided return a single quantity,
      // otherwise return the full per-location breakdown
      stock: locationId
        ? num(variant.stocks[0]?.quantity)
        : variant.stocks.map((sv) => ({
            location: 'location' in sv ? sv.location : null,
            quantity: num(sv.quantity),
          })),
    })),
  }))

  // taxRate travels with the catalogue so the app never hardcodes VAT.
  return ok({ products: shaped, total, page, limit, taxRate })
}
