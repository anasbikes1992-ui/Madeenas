import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { verifyMobileToken } from '@/lib/mobile-auth'
import { logActivity } from '@/lib/audit'
import { z } from 'zod'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'])

async function resolveUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null
  try {
    return await verifyMobileToken(token)
  } catch {
    return null
  }
}

const stockOutSchema = z.object({
  productId: z.string().min(1),
  fromLocationId: z.string().min(1),
  toLocationId: z.string().optional(),
  quantityRequested: z.number().positive(),
  note: z.string().optional(),
  referenceInvoice: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await resolveUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) {
    return fail('You do not have permission to create stock-out requests', 403, 'FORBIDDEN')
  }

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

  const { productId, fromLocationId, toLocationId, quantityRequested, note, referenceInvoice } =
    parsed.data

  // Verify product and location exist
  const [product, fromLocation] = await Promise.all([
    prisma.product.findUnique({ where: { id: productId } }),
    prisma.location.findUnique({ where: { id: fromLocationId } }),
  ])

  if (!product || !product.isActive) return fail('Product not found', 404, 'NOT_FOUND')
  if (!fromLocation || !fromLocation.isActive) return fail('From-location not found', 404, 'NOT_FOUND')

  // Check available stock
  const stock = await prisma.stock.findUnique({
    where: { productId_locationId: { productId, locationId: fromLocationId } },
  })
  const available = stock?.quantity ?? 0
  if (available < quantityRequested) {
    return fail(
      `Insufficient stock. Available: ${available} ${product.unit}`,
      422,
      'INSUFFICIENT_STOCK',
    )
  }

  const stockOut = await prisma.stockOutRequest.create({
    data: {
      productId,
      fromLocationId,
      toLocationId: toLocationId ?? null,
      requestedBy: user.sub!,
      quantityRequested,
      note: note ?? null,
      referenceInvoice: referenceInvoice ?? null,
      status: 'PENDING',
    },
    include: {
      product: { select: { name: true, sku: true } },
      fromLocation: { select: { name: true } },
    },
  })

  await logActivity({
    userId: user.sub!,
    action: 'CREATE',
    entity: 'StockOutRequest',
    entityId: stockOut.id,
    details: `Mobile: Requested ${quantityRequested} ${product.unit} of ${product.name} from ${fromLocation.name}`,
  })

  return ok({ stockOut }, 201)
}

export async function GET(request: NextRequest) {
  const user = await resolveUser(request)
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

  const where: Record<string, unknown> = {}
  if (mine || !canViewAll) where.requestedBy = user.sub
  if (status) where.status = status

  const [requests, total] = await Promise.all([
    prisma.stockOutRequest.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true, unit: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
        requestedByUser: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockOutRequest.count({ where }),
  ])

  return ok({ requests, total, page, limit })
}
