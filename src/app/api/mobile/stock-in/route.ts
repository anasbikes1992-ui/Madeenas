import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { z } from 'zod'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER'])

const stockInItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  costPrice: z.number().nonnegative().optional(),
})

const singleStockInSchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().min(1),
  quantity: z.number().positive(),
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
        product: { select: { id: true, name: true, sku: true } },
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
          productId: payload.productId,
          quantity: payload.quantity,
          costPrice: payload.costPrice,
        },
      ]

  const distinctProductIds = new Set(incomingItems.map((item) => item.productId))
  if (distinctProductIds.size !== incomingItems.length) {
    return fail('Duplicate products detected. Each line must be distinct.', 400, 'VALIDATION_ERROR')
  }

  const [location, products] = await Promise.all([
    prisma.location.findUnique({ where: { id: locationId } }),
    prisma.product.findMany({ where: { id: { in: incomingItems.map((item) => item.productId) } } }),
  ])

  if (!location || !location.isActive) return fail('Location not found', 404, 'NOT_FOUND')

  const productMap = new Map(products.map((product) => [product.id, product]))
  for (const item of incomingItems) {
    const product = productMap.get(item.productId)
    if (!product || !product.isActive) {
      return fail('Product not found', 404, 'NOT_FOUND')
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
      incomingItems.map((item) =>
        tx.stockIn.create({
          data: {
            productId: item.productId,
            locationId,
            quantity: item.quantity,
            batchNumber: payload.batchNumber,
            supplierId: payload.supplierId || null,
            costPrice: item.costPrice,
            note: payload.note,
            receivedBy: user.sub!,
          },
        })
      )
    )

    await Promise.all(
      incomingItems.map((item) =>
        tx.stock.upsert({
          where: { productId_locationId: { productId: item.productId, locationId } },
          create: { productId: item.productId, locationId, quantity: item.quantity },
          update: { quantity: { increment: item.quantity } },
        })
      )
    )

    return created
  })

  const lineCount = incomingItems.length
  const detail = isBatch
    ? `Recorded batch stock receipt (${lineCount} lines) at ${location.name} via mobile`
    : (() => {
        const item = incomingItems[0]
        const product = productMap.get(item.productId)
        return `Added ${item.quantity} units of ${product?.name ?? item.productId} to ${location.name} via mobile`
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
