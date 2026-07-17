import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { num } from '@/lib/money'
import { z } from 'zod'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'])

const stockOutSchema = z.object({
  variantId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().min(1).optional().nullable(),
  quantityRequested: z.number().positive(),
  note: z.string().optional(),
  referenceInvoice: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) {
    return fail('You do not have permission to create stock-out requests', 403, 'FORBIDDEN')
  }
  const userLocationId = user.locationId ?? null

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  const parsed = stockOutSchema.safeParse(body)
  if (!parsed.success) {
    return fail('Validation error', 400, 'VALIDATION_ERROR')
  }

  const { variantId, fromLocationId, toLocationId, quantityRequested, note, referenceInvoice } =
    parsed.data

  let effectiveToLocationId = toLocationId ?? null

  if (role === 'SHOP_STAFF') {
    if (!userLocationId) {
      return fail('Your account is not assigned to a shop location', 400, 'VALIDATION_ERROR')
    }
    effectiveToLocationId = userLocationId

    const sourceLocation = await prisma.location.findUnique({
      where: { id: fromLocationId },
      select: { id: true, type: true },
    })

    if (!sourceLocation) {
      return fail('From-location not found', 404, 'NOT_FOUND')
    }
    if (sourceLocation.type !== 'WAREHOUSE') {
      return fail('Shop requests must be fulfilled from a warehouse location', 400, 'VALIDATION_ERROR')
    }
    if (sourceLocation.id === effectiveToLocationId) {
      return fail('Source and destination locations must be different', 400, 'VALIDATION_ERROR')
    }
  }

  if (!effectiveToLocationId) {
    return fail('Destination location is required', 400, 'VALIDATION_ERROR')
  }

  // Verify variant and location exist
  const [variant, fromLocation, toLocation] = await Promise.all([
    prisma.productVariant.findUnique({ where: { id: variantId }, include: { product: true } }),
    prisma.location.findUnique({ where: { id: fromLocationId } }),
    prisma.location.findUnique({ where: { id: effectiveToLocationId } }),
  ])

  if (!variant || !variant.isActive) return fail('Product variant not found', 404, 'NOT_FOUND')
  if (!fromLocation || !fromLocation.isActive) return fail('From-location not found', 404, 'NOT_FOUND')
  if (!toLocation || !toLocation.isActive) return fail('To-location not found', 404, 'NOT_FOUND')
  if (fromLocationId === effectiveToLocationId) {
    return fail('Source and destination locations must be different', 400, 'VALIDATION_ERROR')
  }

  // Check available stock
  const stock = await prisma.stock.findUnique({
    where: { variantId_locationId: { variantId, locationId: fromLocationId } },
  })
  const available = num(stock?.quantity)
  if (available < quantityRequested) {
    return fail(
      `Insufficient stock. Available: ${available} ${variant.stockUnit}`,
      422,
      'INSUFFICIENT_STOCK',
    )
  }

  const transferNo = 'REQ-' + Date.now().toString()

  const stockOut = await prisma.stockTransfer.create({
    data: {
      transferNo,
      fromLocationId,
      toLocationId: effectiveToLocationId,
      requestedBy: user.sub!,
      note: note ?? referenceInvoice ?? null,
      status: 'PENDING',
      items: {
        create: [
          {
            variantId,
            requestedQty: quantityRequested,
          }
        ]
      }
    },
    include: {
      items: { include: { variant: { include: { product: true } } } },
      fromLocation: { select: { name: true } },
    },
  })

  await logActivity({
    userId: user.sub!,
    action: 'CREATE',
    entity: 'StockTransfer',
    entityId: stockOut.id,
    details: `Mobile: Requested ${quantityRequested} ${variant.stockUnit} of ${variant.product.name} from ${fromLocation.name}`,
  })

  return ok({ stockOut }, 201)
}

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) {
    return fail('Forbidden', 403, 'FORBIDDEN')
  }

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))
  const status = searchParams.get('status') ?? ''
  const mine = searchParams.get('mine') === 'true'
  const canViewAll = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'].includes(role)
  const userLocationId = user.locationId ?? null

  const where: Record<string, unknown> = {}
  if (mine) {
    where.requestedBy = user.sub
  } else if (!canViewAll) {
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
  if (status) where.status = status

  const [requests, total] = await Promise.all([
    prisma.stockTransfer.findMany({
      where,
      include: {
        items: { include: { variant: { select: { sku: true, stockUnit: true, product: { select: { name: true } } } } } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        requestedByUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockTransfer.count({ where }),
  ])

  return ok({ requests, total, page, limit })
}
