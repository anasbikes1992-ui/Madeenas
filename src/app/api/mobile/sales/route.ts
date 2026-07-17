import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { ok, fail } from '@/lib/api-response'
import { getMobileUser } from '@/lib/get-mobile-user'
import { sendInvoiceWhatsAppNotification } from '@/lib/whatsapp'
import { createSale, SaleError } from '@/services/sales.service'
import { z } from 'zod'

const ALLOWED_ROLES = new Set(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'SHOP_STAFF'])

/**
 * Mobile sale payload. Prices, tax, and totals are computed SERVER-SIDE from
 * the variant's salePrice — client-sent prices are ignored. Legacy fields
 * from older app versions (unitPrice, subTotal, saleToStockFactor, taxRate)
 * are accepted but discarded. Newer clients send `expectedGrandTotal` for
 * stale-price detection.
 */
const saleItemSchema = z.object({
  variantId: z.string().min(1),
  saleQty: z.number().positive(),
  saleUnit: z.string().min(1).optional(),
  // Legacy fields — ignored.
  saleToStockFactor: z.number().optional(),
  unitPrice: z.number().optional(),
  subTotal: z.number().optional(),
})

const saleSchema = z.object({
  locationId: z.string().min(1),
  items: z.array(saleItemSchema).min(1),
  expectedGrandTotal: z.number().nonnegative().optional(),
  // Legacy field — ignored (VAT rate comes from AppSetting).
  taxRate: z.number().optional(),
  paymentMode: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'CHEQUE', 'CREDIT']).default('CASH'),
  customerName: z.string().optional(),
  customerPhone: z.string().optional(),
  isCreditEligible: z.boolean().optional().default(false),
  note: z.string().optional(),
  chequeNo: z.string().max(64).optional(),
  chequeBank: z.string().max(128).optional(),
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

  const data = parsed.data

  const location = await prisma.location.findUnique({ where: { id: data.locationId } })
  if (!location || !location.isActive) return fail('Location not found', 404, 'NOT_FOUND')

  try {
    const sale = await createSale({
      locationId: data.locationId,
      soldById: user.sub!,
      items: data.items.map((item) => ({
        variantId: item.variantId,
        saleQty: item.saleQty,
        saleUnit: item.saleUnit,
      })),
      paymentMode: data.paymentMode,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      isCreditEligible: data.isCreditEligible,
      note: data.note,
      expectedGrandTotal: data.expectedGrandTotal,
      chequeNo: data.chequeNo,
      chequeBank: data.chequeBank,
    })

    const invoiceUrlBase = process.env.NEXT_PUBLIC_APP_URL
    const invoiceUrl = invoiceUrlBase
      ? `${invoiceUrlBase.replace(/\/$/, '')}/admin/sales?receiptNo=${encodeURIComponent(sale.receiptNo)}`
      : undefined

    const whatsapp = await sendInvoiceWhatsAppNotification({
      receiptNo: sale.receiptNo,
      customerName: sale.customerName,
      customerPhone: sale.customerPhone,
      grandTotal: Number(sale.grandTotal),
      paymentMode: sale.paymentMode,
      createdAt: sale.createdAt,
      invoiceUrl,
    })

    return ok({ sale, receiptNo: sale.receiptNo, whatsapp }, 201)
  } catch (error: unknown) {
    if (error instanceof SaleError) {
      return fail(error.message, error.status, error.code)
    }
    console.error('[mobile/sales] Sale failed:', error)
    return fail('Sale transaction failed', 500, 'INTERNAL_ERROR')
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
