import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { logActivity } from '@/lib/audit'
import { sendInvoiceWhatsAppNotification } from '@/lib/whatsapp'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SHOP_STAFF'])

const saleItemSchema = z.object({
  variantId: z.string().min(1),
  saleQty: z.number().positive(),
  saleUnit: z.string().min(1),
  saleToStockFactor: z.number().positive(),
  unitPrice: z.number().nonnegative(),
  subTotal: z.number().nonnegative(),
})

const saleSchema = z.object({
  locationId: z.string().min(1),
  items: z.array(saleItemSchema).min(1),
  taxRate: z.number().min(0).max(100).optional().default(18),
  paymentMode: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT']).default('CASH'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  isCreditEligible: z.boolean().optional().default(false),
  note: z.string().optional(),
})

export async function POST(request: NextRequest) {
  const user = await getMobileUser(request)
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

  const { locationId, items, taxRate, paymentMode, customerName, customerPhone, isCreditEligible, note } =
    parsed.data

  // Compute VAT totals server-side
  const subTotal = parseFloat(items.reduce((sum, i) => sum + i.subTotal, 0).toFixed(2))
  const taxAmount = parseFloat(((subTotal * taxRate) / 100).toFixed(2))
  const grandTotal = parseFloat((subTotal + taxAmount).toFixed(2))

  // Verify location
  const location = await prisma.location.findUnique({ where: { id: locationId } })
  if (!location || !location.isActive) return fail('Location not found', 404, 'NOT_FOUND')

  // Verify all variants exist and have sufficient stock (fetch all at once to avoid N+1)
  const variantIds = items.map((i) => i.variantId)
  const stocks = await prisma.stock.findMany({
    where: {
      variantId: { in: variantIds },
      locationId,
    },
    include: {
      variant: { select: { sku: true, product: { select: { name: true } } } },
    },
  })

  const stockMap = new Map(stocks.map((s) => [s.variantId, s]))
  for (const item of items) {
    const stock = stockMap.get(item.variantId)
    const available = stock?.quantity ?? 0
    const needed = item.saleQty * item.saleToStockFactor
    if (available < needed) {
      return fail(
        `Insufficient stock for ${stock?.variant.product.name ?? item.variantId}. Available: ${available}, Needed: ${needed}`,
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
        subTotal,
        taxRate,
        taxAmount,
        grandTotal,
        paymentMode,
        note: note ?? null,
        items: {
          create: items.map((i) => {
            const itemTax = parseFloat(((i.subTotal * taxRate) / 100).toFixed(2))
            return {
              variantId: i.variantId,
              saleUnit: i.saleUnit,
              saleQty: i.saleQty,
              saleToStockFactor: i.saleToStockFactor,
              stockQtyDeducted: i.saleQty * i.saleToStockFactor,
              unitPrice: i.unitPrice,
              subTotal: i.subTotal,
              taxRate,
              taxAmount: itemTax,
              total: parseFloat((i.subTotal + itemTax).toFixed(2)),
            }
          }),
        },
      },
      include: { items: true },
    })

    // Deduct stock for each item
    for (const item of items) {
      const deduction = item.saleQty * item.saleToStockFactor
      await tx.stock.upsert({
        where: { variantId_locationId: { variantId: item.variantId, locationId } },
        update: { quantity: { decrement: deduction } },
        create: { variantId: item.variantId, locationId, quantity: -deduction },
      })
    }

    return created
  })

  await logActivity({
    userId: user.sub!,
    action: 'CREATE',
    entity: 'Sale',
    entityId: sale.id,
    details: `Mobile POS: ${items.length} item(s), total Rs. ${grandTotal}, receipt ${receiptNo}`,
  })

  const invoiceUrlBase = process.env.NEXT_PUBLIC_APP_URL
  const invoiceUrl = invoiceUrlBase
    ? `${invoiceUrlBase.replace(/\/$/, '')}/admin/sales?receiptNo=${encodeURIComponent(receiptNo)}`
    : undefined

  const whatsapp = await sendInvoiceWhatsAppNotification({
    receiptNo,
    customerName: sale.customerName,
    customerPhone: sale.customerPhone,
    grandTotal,
    paymentMode,
    createdAt: sale.createdAt,
    invoiceUrl,
  })

  return ok({ sale, receiptNo, whatsapp }, 201)
}

export async function GET(request: NextRequest) {
  const user = await getMobileUser(request)
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
          include: { variant: { select: { sku: true, product: { select: { name: true } } } } },
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
