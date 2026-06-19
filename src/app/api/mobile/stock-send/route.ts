import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { stockSendCreateSchema } from '@/lib/validations'
import { logActivity } from '@/lib/audit'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SHOP_STAFF'])

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

async function generateTransferNo(now: Date): Promise<string> {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  const dayStart = startOfDay(now)

  const dailyCount = await prisma.stockOutRequest.count({
    where: { flowType: 'SEND_DIRECT', createdAt: { gte: dayStart } },
  })

  return `TRN-${y}${m}${d}-${String(dailyCount + 1).padStart(4, '0')}`
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

  const where: Record<string, unknown> = { flowType: 'SEND_DIRECT' }
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
    prisma.stockOutRequest.findMany({
      where,
      include: {
        product: { select: { name: true, sku: true, unit: true } },
        fromLocation: { select: { name: true } },
        toLocation: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.stockOutRequest.count({ where }),
  ])

  return ok({ requests, total, page, limit })
}

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

  const uniqueCount = new Set(payload.items.map((item) => item.productId)).size
  if (uniqueCount !== payload.items.length) {
    return fail('Duplicate products are not allowed', 400, 'VALIDATION_ERROR')
  }

  const productIds = payload.items.map((item) => item.productId)
  const [fromLocation, toLocation, products, stocks] = await Promise.all([
    prisma.location.findUnique({ where: { id: payload.fromLocationId }, select: { id: true, isActive: true, name: true } }),
    prisma.location.findUnique({ where: { id: payload.toLocationId }, select: { id: true, isActive: true, name: true } }),
    prisma.product.findMany({ where: { id: { in: productIds } }, select: { id: true, name: true, unit: true, isActive: true } }),
    prisma.stock.findMany({
      where: { locationId: payload.fromLocationId, productId: { in: productIds } },
      select: { productId: true, quantity: true },
    }),
  ])

  if (!fromLocation || !fromLocation.isActive) return fail('Source location not found', 404, 'NOT_FOUND')
  if (!toLocation || !toLocation.isActive) return fail('Destination location not found', 404, 'NOT_FOUND')

  const productMap = new Map(products.map((product) => [product.id, product]))
  const stockMap = new Map(stocks.map((stock) => [stock.productId, stock.quantity]))
  for (const item of payload.items) {
    const product = productMap.get(item.productId)
    if (!product || !product.isActive) return fail('Product not found', 404, 'NOT_FOUND')
    const available = stockMap.get(item.productId) ?? 0
    if (available < item.quantityDispatched) {
      return fail(`Insufficient stock for ${product.name}. Available: ${available}`, 422, 'INSUFFICIENT_STOCK')
    }
  }

  let invoiceDate: Date | null = null
  if (payload.invoiceDate) {
    const date = new Date(payload.invoiceDate)
    invoiceDate = Number.isNaN(date.getTime()) ? null : date
  }

  const now = new Date()
  const transferNo = await generateTransferNo(now)

  let rows
  try {
    rows = await prisma.$transaction(async (tx) => {
      const sourceStocks = await tx.stock.findMany({
        where: { locationId: payload.fromLocationId, productId: { in: productIds } },
        select: { productId: true, quantity: true },
      })
      const sourceMap = new Map(sourceStocks.map((stock) => [stock.productId, stock.quantity]))
      for (const item of payload.items) {
        const available = sourceMap.get(item.productId) ?? 0
        if (available < item.quantityDispatched) {
          throw new Error(`INSUFFICIENT:${item.productId}:${available}`)
        }
      }

      const created = await Promise.all(
        payload.items.map((item) =>
          tx.stockOutRequest.create({
            data: {
              transferNo,
              flowType: 'SEND_DIRECT',
              productId: item.productId,
              fromLocationId: payload.fromLocationId,
              toLocationId: payload.toLocationId,
              requestedBy: user.sub!,
              dispatchedBy: user.sub!,
              quantityRequested: item.quantityDispatched,
              quantityApproved: item.quantityDispatched,
              quantityDispatched: item.quantityDispatched,
              status: 'IN_TRANSIT',
              dispatchedAt: now,
              note: payload.note ?? null,
              referenceInvoice: payload.referenceInvoice ?? null,
              invoiceDate,
            },
          })
        )
      )

      await Promise.all(
        payload.items.map((item) =>
          tx.stock.update({
            where: { productId_locationId: { productId: item.productId, locationId: payload.fromLocationId } },
            data: { quantity: { decrement: item.quantityDispatched } },
          })
        )
      )

      return created
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.startsWith('INSUFFICIENT:')) {
      const [, productId, available] = message.split(':')
      const product = productMap.get(productId)
      return fail(`Insufficient stock for ${product?.name || productId}. Available: ${available}`, 422, 'INSUFFICIENT_STOCK')
    }
    return fail('Failed to create direct send', 500, 'INTERNAL_ERROR')
  }

  await logActivity({
    userId: user.sub!,
    action: 'SEND_CREATE',
    entity: 'StockOutRequest',
    entityId: rows[0]?.id,
    details: `Mobile direct send ${transferNo} from ${fromLocation.name} to ${toLocation.name}`,
  })

  try {
    const destinationUsers = await prisma.user.findMany({
      where: { locationId: payload.toLocationId, isActive: true },
      select: { id: true },
    })

    if (destinationUsers.length > 0) {
      await prisma.notification.createMany({
        data: destinationUsers.map((destinationUser) => ({
          userId: destinationUser.id,
          title: 'New Stock Send In Transit 🚚',
          message: `${transferNo}: Stock dispatched from ${fromLocation.name}. Please acknowledge on receipt.`,
          type: 'INFO',
          link: '/admin/send-stock',
        })),
      })
    }
  } catch (error) {
    console.error('[mobile stock-send POST] notification error:', error)
  }

  return ok({ batch: { transferNo, count: rows.length, items: rows } }, 201)
}
