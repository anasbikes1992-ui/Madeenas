import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { z } from 'zod'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'])

const stockSendItemSchema = z.object({
  variantId: z.string().min(1),
  quantityDispatched: z.number().positive(),
})

const stockSendCreateSchema = z.object({
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1),
  items: z.array(stockSendItemSchema).min(1),
  note: z.string().optional(),
  referenceInvoice: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  const parsed = stockSendCreateSchema.safeParse(body)
  if (!parsed.success) return fail('Validation error', 400, 'VALIDATION_ERROR')

  const payload = parsed.data
  if (payload.fromLocationId === payload.toLocationId) {
    return fail('Source and destination must be different', 400, 'VALIDATION_ERROR')
  }

  const uniqueCount = new Set(payload.items.map((item) => item.variantId)).size
  if (uniqueCount !== payload.items.length) {
    return fail('Duplicate variants are not allowed', 400, 'VALIDATION_ERROR')
  }

  const variantIds = payload.items.map((item) => item.variantId)
  const [fromLocation, toLocation, variants, stocks] = await Promise.all([
    prisma.location.findUnique({ where: { id: payload.fromLocationId }, select: { id: true, isActive: true, name: true } }),
    prisma.location.findUnique({ where: { id: payload.toLocationId }, select: { id: true, isActive: true, name: true } }),
    prisma.productVariant.findMany({ where: { id: { in: variantIds } }, select: { id: true, isActive: true, product: { select: { name: true } } } }),
    prisma.stock.findMany({
      where: { locationId: payload.fromLocationId, variantId: { in: variantIds } },
      select: { variantId: true, quantity: true },
    }),
  ])

  if (!fromLocation || !fromLocation.isActive) return fail('Source location not found', 404, 'NOT_FOUND')
  if (!toLocation || !toLocation.isActive) return fail('Destination location not found', 404, 'NOT_FOUND')

  const variantMap = new Map(variants.map((v) => [v.id, v]))
  const stockMap = new Map(stocks.map((stock) => [stock.variantId, stock.quantity]))
  for (const item of payload.items) {
    const variant = variantMap.get(item.variantId)
    if (!variant || !variant.isActive) return fail('Variant not found', 404, 'NOT_FOUND')
    const available = stockMap.get(item.variantId) ?? 0
    if (available < item.quantityDispatched) {
      return fail(`Insufficient stock for ${variant.product?.name}. Available: ${available}`, 422, 'INSUFFICIENT_STOCK')
    }
  }

  const transferNo = 'TRN-' + Date.now().toString()

  try {
    const transfer = await prisma.$transaction(async (tx) => {
      for (const item of payload.items) {
        await tx.stock.update({
          where: { variantId_locationId: { variantId: item.variantId, locationId: payload.fromLocationId } },
          data: { quantity: { decrement: item.quantityDispatched } },
        })
      }

      return tx.stockTransfer.create({
        data: {
          transferNo,
          fromLocationId: payload.fromLocationId,
          toLocationId: payload.toLocationId,
          requestedBy: user.sub!,
          dispatchedBy: user.sub!,
          dispatchedAt: new Date(),
          status: 'DISPATCHED',
          note: payload.note ?? payload.referenceInvoice ?? null,
          items: {
            create: payload.items.map((item) => ({
              variantId: item.variantId,
              requestedQty: item.quantityDispatched,
              approvedQty: item.quantityDispatched,
              dispatchedQty: item.quantityDispatched,
            }))
          }
        },
        include: { items: true }
      })
    })

    await logActivity({
      userId: user.sub!,
      action: 'SEND_CREATE',
      entity: 'StockTransfer',
      entityId: transfer.id,
      details: `Mobile direct send ${transferNo} from ${fromLocation.name} to ${toLocation.name}`,
    })

    return ok({ batch: { transferNo, count: transfer.items.length, items: transfer.items } }, 201)
  } catch (error) {
    return fail('Failed to create direct send', 500, 'INTERNAL_ERROR')
  }
}

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const userLocationId = user.locationId ?? null

  const where: Record<string, unknown> = {}
  if (role === 'STORE_KEEPER' || role === 'SHOP_STAFF') {
    if (!userLocationId) {
      where.requestedBy = user.sub
    } else {
      where.OR = [
        { requestedBy: user.sub },
        { fromLocationId: userLocationId },
        { toLocationId: userLocationId },
      ]
    }
  }

  const [requests, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where,
      include: {
        items: { include: { variant: { select: { sku: true, stockUnit: true, product: { select: { name: true } } } } } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockTransfer.count({ where }),
  ])

  return ok({ requests, total, page, limit })
}
