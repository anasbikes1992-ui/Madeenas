import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { verifyMobileToken } from '@/lib/mobile-auth'
import { logActivity } from '@/lib/audit'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SHOP_STAFF'])

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

const saleItemSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  subTotal: z.number().nonnegative(),
})

const saleSchema = z.object({
  locationId: z.string().min(1),
  items: z.array(saleItemSchema).min(1),
  totalAmount: z.number().nonnegative(),
  paymentMode: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT']).default('CASH'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  isCreditEligible: z.boolean().optional().default(false),
  note: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await resolveUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) {
    return fail('You do not have permission to create sales', 403, 'FORBIDDEN')
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return fail('Invalid JSON body', 400, 'BAD_REQUEST')
  }

  const parsed = saleSchema.safeParse(body)
  if (!parsed.success) {
    return fail('Validation error', 400, 'VALIDATION_ERROR')
  }

  const { locationId, items, totalAmount, paymentMode, customerName, customerPhone, isCreditEligible, note } =
    parsed.data

  // Verify location
  const location = await prisma.location.findUnique({ where: { id: locationId } })
  if (!location || !location.isActive) return fail('Location not found', 404, 'NOT_FOUND')

  // Verify all products exist and have sufficient stock
  for (const item of items) {
    const stock = await prisma.stock.findUnique({
      where: { productId_locationId: { productId: item.productId, locationId } },
    })
    const available = stock?.quantity ?? 0
    if (available < item.quantity) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        select: { name: true, unit: true },
      })
      return fail(
        `Insufficient stock for ${product?.name ?? item.productId}. Available: ${available}`,
        422,
        'INSUFFICIENT_STOCK',
      )
    }
  }

  // Find or create customer record if phone given
  let customerId: string | null = null
  if (customerPhone && customerPhone.trim().length > 0) {
    const existing = await prisma.customer.findUnique({
      where: { phone: customerPhone.trim() },
    })
    if (existing) {
      customerId = existing.id
    } else if (customerName) {
      const created = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: customerPhone.trim(),
          isCreditEligible: isCreditEligible ?? false,
        },
      })
      customerId = created.id
    }
  }

  // Generate receipt number: REC-YYYYMMDD-XXXX
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '')
  const shortId = uuidv4().slice(0, 6).toUpperCase()
  const receiptNo = `REC-${dateStr}-${shortId}`

  // Create sale and deduct stock in a transaction
  const sale = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        receiptNo,
        locationId,
        soldById: user.sub!,
        customerId,
        customerName: customerName ?? null,
        customerPhone: customerPhone ?? null,
        totalAmount,
        paymentMode,
        note: note ?? null,
        items: {
          create: items.map((i) => ({
            productId: i.productId,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            subTotal: i.subTotal,
          })),
        },
      },
      include: { items: true },
    })

    // Deduct stock for each item
    for (const item of items) {
      await tx.stock.upsert({
        where: { productId_locationId: { productId: item.productId, locationId } },
        update: { quantity: { decrement: item.quantity } },
        create: { productId: item.productId, locationId, quantity: -item.quantity },
      })
    }

    return created
  })

  await logActivity({
    userId: user.sub!,
    action: 'CREATE',
    entity: 'Sale',
    entityId: sale.id,
    details: `Mobile POS: ${items.length} item(s), total Rs. ${totalAmount}, receipt ${receiptNo}`,
  })

  return ok({ sale, receiptNo }, 201)
}

export async function GET(request: NextRequest) {
  const user = await resolveUser(request)
  if (!user) return fail('Unauthorized', 401, 'UNAUTHORIZED')

  const role = (user.role ?? '').toUpperCase()
  if (!ALLOWED_ROLES.has(role)) return fail('Forbidden', 403, 'FORBIDDEN')

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') ?? '20', 10)))

  // Staff only see their own location's sales
  const where: Record<string, unknown> = {}
  if (role === 'SHOP_STAFF') {
    where.soldById = user.sub
  }

  const [sales, total] = await Promise.all([
    prisma.sale.findMany({
      where,
      include: {
        location: { select: { name: true } },
        items: {
          include: { product: { select: { name: true, sku: true, unit: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.sale.count({ where }),
  ])

  return ok({ sales, total, page, limit })
}
