import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { z } from 'zod'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER'])

const stockInItemSchema = z.object({
  variantId: z.string().min(1),
  receivedQty: z.number().positive(),
  receivedUnit: z.string().min(1),
  conversionFactor: z.number().positive(),
  costPrice: z.number().nonnegative().optional(),
})

const singleStockInSchema = z.object({
  variantId: z.string().min(1),
  locationId: z.string().min(1),
  receivedQty: z.number().positive(),
  receivedUnit: z.string().min(1),
  conversionFactor: z.number().positive(),
  batchNumber: z.string().optional(),
  supplierId: z.string().optional(),
  costPrice: z.number().nonnegative().optional(),
  note: z.string().optional(),
})

const batchStockInSchema = z.object({
  locationId: z.string().min(1),
  batchNumber: z.string().optional(),
  supplierId: z.string().optional(),
  note: z.string().optional(),
  items: z.array(stockInItemSchema).min(1),
})

const stockInSchema = z.union([singleStockInSchema, batchStockInSchema])

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  const [records, total] = await Promise.all([
    prisma.stockIn.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        variant: { select: { id: true, sku: true, product: { select: { name: true } } } },
        location: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.stockIn.count(),
  ])

  return ok({ records, total, page, limit })
}

export async function POST(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) {
    return fail('You do not have permission to create stock-in records', 403, 'FORBIDDEN')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  const parsed = stockInSchema.safeParse(body)
  if (!parsed.success) {
    return fail('Validation error', 400, 'VALIDATION_ERROR')
  }

  const payload = parsed.data
  const isBatch = 'items' in payload
  const locationId = payload.locationId
  const incomingItems = isBatch
    ? payload.items
    : [
        {
          variantId: payload.variantId,
          receivedQty: payload.receivedQty,
          receivedUnit: payload.receivedUnit,
          conversionFactor: payload.conversionFactor,
          costPrice: payload.costPrice,
        },
      ]

  const distinctVariantIds = new Set(incomingItems.map((item) => item.variantId))
  if (distinctVariantIds.size !== incomingItems.length) {
    return fail('Duplicate products detected. Each line must be distinct.', 400, 'VALIDATION_ERROR')
  }

  const [location, variants] = await Promise.all([
    prisma.location.findUnique({ where: { id: locationId } }),
    prisma.productVariant.findMany({ where: { id: { in: incomingItems.map((item) => item.variantId) } }, include: { product: true } }),
  ])

  if (!location || !location.isActive) return fail('Location not found', 404, 'NOT_FOUND')

  const variantMap = new Map(variants.map((variant) => [variant.id, variant]))
  for (const item of incomingItems) {
    const variant = variantMap.get(item.variantId)
    if (!variant || !variant.isActive) {
      return fail('Product variant not found', 404, 'NOT_FOUND')
    }
  }

  if (payload.supplierId) {
    const supplier = await prisma.supplier.findUnique({ where: { id: payload.supplierId } })
    if (!supplier || !supplier.isActive) {
      return fail('Supplier not found', 404, 'NOT_FOUND')
    }
  }

  const stockIns = await prisma.$transaction(async (tx) => {
    const created = await Promise.all(
      incomingItems.map((item) => {
        const addedQty = item.receivedQty * item.conversionFactor;
        return tx.stockIn.create({
          data: {
            variantId: item.variantId,
            locationId,
            receivedQty: item.receivedQty,
            receivedUnit: item.receivedUnit,
            conversionFactor: item.conversionFactor,
            quantityAddedToStock: addedQty,
            batchNumber: payload.batchNumber,
            supplierId: payload.supplierId || null,
            costPrice: item.costPrice,
            note: payload.note,
            receivedBy: user.sub!,
          },
        })
      })
    )

    await Promise.all(
      incomingItems.map((item) => {
        const addedQty = item.receivedQty * item.conversionFactor;
        return tx.stock.upsert({
          where: { variantId_locationId: { variantId: item.variantId, locationId } },
          create: { variantId: item.variantId, locationId, quantity: addedQty },
          update: { quantity: { increment: addedQty } },
        })
      })
    )

    return created
  })

  const lineCount = incomingItems.length
  const detail = isBatch
    ? `Recorded batch stock receipt (${lineCount} lines) at ${location.name} via mobile`
    : (() => {
        const item = incomingItems[0]
        const variant = variantMap.get(item.variantId)
        return `Added ${item.receivedQty} ${item.receivedUnit} of ${variant?.product.name ?? item.variantId} to ${location.name} via mobile`
      })()

  await logActivity({
    userId: user.sub!,
    action: 'STOCK_IN',
    entity: 'StockIn',
    entityId: stockIns[0]?.id,
    details: detail,
  })

  if (isBatch) {
    return ok({ batch: { count: stockIns.length, items: stockIns } }, 201)
  }

  return ok({ stockIn: stockIns[0] }, 201)
}
