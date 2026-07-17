import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { customerOrderSchema } from '@/lib/validations'
import { sendOrderWhatsAppNotifications } from '@/lib/whatsapp'
import { createNotification } from '@/lib/audit'
import { limitRequestsAsync } from '@/lib/rate-limit'
import { auth } from '@/lib/auth'
import { computeRetailPrice } from '@/lib/pricing'
import { getRetailMarkup, getVatRate } from '@/lib/settings'
import { computeSaleTotals } from '@/lib/money'
import { nextDocNumber } from '@/lib/doc-number'
import { z } from 'zod'
import bcrypt from 'bcryptjs'

const batchOrderSchema = z.object({
  customerName: z.string().trim().min(2).max(120),
  customerEmail: z.string().trim().email(),
  customerPhone: z.string().trim().max(50).optional().transform((value) => value || null),
  language: z.enum(['en', 'si', 'ta']).optional().default('en'),
  items: z
    .array(
      z.object({
        variantId: z.string().trim().min(1),
        quantity: z.coerce.number().positive().max(100000),
        colorPreference: z.string().trim().max(120).optional().transform((value) => value || null),
        note: z.string().trim().max(1000).optional().transform((value) => value || null),
      })
    )
    .min(1)
    .max(30),
})

async function ensureCustomerUser(name: string, email: string, phone: string | null) {
  const existingUser = await prisma.user.findUnique({ where: { email } })
  if (existingUser) {
    if (existingUser.name !== name) {
      await prisma.user.update({
        where: { id: existingUser.id },
        data: { name },
      })
    }
    if (phone) {
      await prisma.customer.upsert({
        where: { phone },
        update: { name, email },
        create: { name, email, phone },
      })
    }
    return existingUser.id
  }

  const password = `Temp#${Date.now()}${Math.floor(Math.random() * 1000)}`
  const passwordHash = await bcrypt.hash(password, 10)
  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: passwordHash,
      role: 'CUSTOMER',
      isActive: true,
    },
  })

  if (phone) {
    await prisma.customer.upsert({
      where: { phone },
      update: { name, email },
      create: { name, email, phone },
    })
  }

  return user.id
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '24')

  const where: any = { isActive: true }
  if (category) where.category = { slug: category }
  if (search) where.OR = [
    { name: { contains: search, mode: 'insensitive' } },
    { variants: { some: { colorName: { contains: search, mode: 'insensitive' } } } },
  ]

  const [products, total, categories, markup, vatRate] = await Promise.all([
    prisma.product.findMany({
      where,
      include: {
        category: true,
        variants: {
          include: {
            stocks: {
              select: {
                quantity: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.product.count({ where }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            products: {
              where: { isActive: true },
            },
          },
        },
      },
    }),
    getRetailMarkup(),
    getVatRate(),
  ])

  // Retail prices are computed server-side and cost prices are never exposed
  // to the storefront. Clients display `retailPrice` as-is; a null value means
  // the variant is not priced and cannot be ordered.
  const pricedProducts = products.map((product) => {
    const variants = product.variants.map(({ costPrice, ...variant }) => ({
      ...variant,
      retailPrice: computeRetailPrice(costPrice, markup),
    }))
    return {
      ...product,
      variants,
      retailPrice: variants[0]?.retailPrice ?? null,
    }
  })

  return NextResponse.json({
    products: pricedProducts,
    total,
    categories,
    page,
    limit,
    taxRate: vatRate,
  })
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous'
    const rateLimit = await limitRequestsAsync({
      key: `gallery-order:${clientIp}`,
      maxRequests: 6,
      windowMs: 60_000,
    })

    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many order requests. Please try again shortly.' }, { status: 429 })
    }

    const body = await request.json()
    const parsedSingle = customerOrderSchema.safeParse(body)
    const parsedBatch = batchOrderSchema.safeParse(body)

    if (!parsedSingle.success && !parsedBatch.success) {
      return NextResponse.json(
        {
          error: 'Invalid order request',
          details: parsedSingle.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    if (parsedBatch.success) {
      const customerId =
        session?.user?.role === 'CUSTOMER'
          ? (session.user.id as string)
          : await ensureCustomerUser(
              parsedBatch.data.customerName,
              parsedBatch.data.customerEmail,
              parsedBatch.data.customerPhone,
            )

      const variantIds = Array.from(new Set(parsedBatch.data.items.map((item) => item.variantId)))
      const variants = await prisma.productVariant.findMany({
        where: {
          id: { in: variantIds },
          isActive: true,
        },
        select: { id: true, colorName: true, stockUnit: true, costPrice: true, product: { select: { name: true } } },
      })

      if (variants.length !== variantIds.length) {
        return NextResponse.json({ error: 'One or more variants are not available' }, { status: 404 })
      }

      const variantMap = new Map(variants.map((variant) => [variant.id, variant]))
      const [markup, taxRate] = await Promise.all([getRetailMarkup(), getVatRate()])

      const lineItems = parsedBatch.data.items.map((item) => {
        const variant = variantMap.get(item.variantId)
        if (!variant) {
          throw new Error('One or more variants are not available')
        }
        const unitPrice = computeRetailPrice(variant.costPrice, markup)
        if (unitPrice === null) {
          throw new Error(
            `${variant.product.name} (${variant.colorName}) is not priced and cannot be ordered`
          )
        }
        return {
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice,
          variant,
          colorPreference: item.colorPreference,
          note: item.note,
        }
      })

      // Exact decimal totals — same engine as the sale path.
      const totals = computeSaleTotals(
        lineItems.map((item) => ({ unitPrice: item.unitPrice, quantity: item.quantity })),
        taxRate
      )

      const order = await prisma.$transaction(async (tx) =>
        tx.customerOrder.create({
          data: {
            orderNumber: await nextDocNumber(tx, 'order'),
            customerId,
            status: 'PENDING',
            subTotal: totals.subTotal,
            taxRate: totals.taxRate,
            taxAmount: totals.taxAmount,
            grandTotal: totals.grandTotal,
            shippingAddress: 'Address will be confirmed with customer',
            customerPhone: parsedBatch.data.customerPhone ?? 'UNKNOWN',
            note: lineItems
              .map((item) => {
                const extra = [item.colorPreference ? `color=${item.colorPreference}` : null, item.note]
                  .filter(Boolean)
                  .join(', ')
                return extra ? `${item.variant.product.name} (${item.variant.colorName}): ${extra}` : null
              })
              .filter(Boolean)
              .join('\n') || null,
            items: {
              create: lineItems.map((item, index) => ({
                variantId: item.variantId,
                saleUnit: item.variant.stockUnit,
                quantity: item.quantity,
                unitPrice: totals.items[index].unitPrice,
                subTotal: totals.items[index].subTotal,
                total: totals.items[index].total,
              })),
            },
          },
          include: {
            items: true,
          },
        })
      )

      await createNotification({
        role: 'ADMIN',
        title: 'New customer cart order request',
        message: `${parsedBatch.data.customerName} submitted ${lineItems.length} item(s) from storefront cart.`,
        type: 'INFO',
        link: '/admin/customer-orders',
      })

      const notifications = await Promise.all(
        lineItems.map((item) =>
          sendOrderWhatsAppNotifications({
            orderId: order.id,
            productName: `${item.variant.product.name} - ${item.variant.colorName}`,
            quantity: item.quantity,
            customerName: parsedBatch.data.customerName,
            customerEmail: parsedBatch.data.customerEmail,
            customerPhone: parsedBatch.data.customerPhone,
            colorPreference: item.colorPreference,
            note: item.note,
          })
        )
      )

      return NextResponse.json(
        {
          order,
          notifications,
        },
        { status: 201 }
      )
    }

    if (!parsedSingle.success) {
      return NextResponse.json({ error: 'Invalid order request' }, { status: 400 })
    }

    const parsed = parsedSingle.data
    const variant = await prisma.productVariant.findFirst({
      where: {
        id: parsed.variantId,
        isActive: true,
      },
      select: {
        id: true,
        colorName: true,
        stockUnit: true,
        costPrice: true,
        product: { select: { name: true } }
      },
    })

    if (!variant) {
      return NextResponse.json({ error: 'Variant not found' }, { status: 404 })
    }

    const customerId =
      session?.user?.role === 'CUSTOMER'
        ? (session.user.id as string)
        : await ensureCustomerUser(parsed.customerName, parsed.customerEmail, parsed.customerPhone)

    const [markup, taxRate] = await Promise.all([getRetailMarkup(), getVatRate()])
    const unitPrice = computeRetailPrice(variant.costPrice, markup)
    if (unitPrice === null) {
      return NextResponse.json(
        { error: `${variant.product.name} (${variant.colorName}) is not priced and cannot be ordered` },
        { status: 409 }
      )
    }

    const totals = computeSaleTotals([{ unitPrice, quantity: parsed.quantity }], taxRate)

    const order = await prisma.$transaction(async (tx) =>
      tx.customerOrder.create({
        data: {
          orderNumber: await nextDocNumber(tx, 'order'),
          customerId,
          status: 'PENDING',
          subTotal: totals.subTotal,
          taxRate: totals.taxRate,
          taxAmount: totals.taxAmount,
          grandTotal: totals.grandTotal,
          shippingAddress: 'Address will be confirmed with customer',
          customerPhone: parsed.customerPhone ?? 'UNKNOWN',
          note: parsed.note,
          items: {
            create: [
              {
                variantId: parsed.variantId,
                saleUnit: variant.stockUnit,
                quantity: parsed.quantity,
                unitPrice: totals.items[0].unitPrice,
                subTotal: totals.items[0].subTotal,
                total: totals.items[0].total,
              },
            ],
          },
        },
        include: { items: true },
      })
    )

    await createNotification({
      role: 'ADMIN',
      title: 'New customer order request',
      message: `${parsed.customerName} requested ${parsed.quantity} ${variant.stockUnit} of ${variant.product.name} (${variant.colorName}).`,
      type: 'INFO',
      link: '/admin/customer-orders',
    })

    const notifications = await sendOrderWhatsAppNotifications({
      orderId: order.id,
      productName: `${variant.product.name} - ${variant.colorName}`,
      quantity: parsed.quantity,
      customerName: parsed.customerName,
      customerEmail: parsed.customerEmail,
      customerPhone: parsed.customerPhone,
      colorPreference: parsed.colorPreference,
      note: parsed.note,
    })

    return NextResponse.json(
      {
        order,
        notifications,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Customer order submission failed:', error)
    return NextResponse.json({ error: 'Failed to submit order request' }, { status: 500 })
  }
}
