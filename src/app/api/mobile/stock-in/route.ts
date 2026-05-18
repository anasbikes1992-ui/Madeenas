import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { z } from 'zod'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER'])

const stockInSchema = z.object({
  productId: z.string().min(1),
  locationId: z.string().min(1),
  quantity: z.number().positive(),
  batchNumber: z.string().optional(),
  supplierId: z.string().optional(),
  costPrice: z.number().nonnegative().optional(),
  note: z.string().optional(),
})

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

  const { productId, locationId, quantity, batchNumber, supplierId, costPrice, note } = parsed.data

  const [product, location] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.location.findUnique({ where: { id: locationId } }),
  ])

  if (!product || !product.isActive) return fail('Product not found', 404, 'NOT_FOUND')
  if (!location || !location.isActive) return fail('Location not found', 404, 'NOT_FOUND')

  const stockIn = await prisma.$transaction(async (tx) => {
    const record = await tx.stockIn.create({
      data: {
        productId,
        locationId,
        quantity,
        batchNumber,
        supplierId: supplierId || null,
        costPrice,
        note,
        receivedBy: user.sub!
      },
    })

    await tx.stock.upsert({
      where: { productId_locationId: { productId, locationId } },
      create: { productId, locationId, quantity },
      update: { quantity: { increment: quantity } },
    })

    return record
  })

  await logActivity({
    userId: user.sub!,
    action: 'STOCK_IN',
    entity: 'StockIn',
    entityId: stockIn.id,
    details: `Added ${quantity} units of ${product.name} to ${location.name} via mobile`,
  })

  return ok({ stockIn }, 201)
}
