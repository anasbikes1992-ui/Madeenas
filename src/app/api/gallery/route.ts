import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { customerOrderSchema } from '@/lib/validations'
import { sendOrderWhatsAppNotifications } from '@/lib/whatsapp'
import { createNotification } from '@/lib/audit'
import { limitRequestsAsync } from '@/lib/rate-limit'
import { auth } from '@/lib/auth'
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
        productId: z.string().trim().min(1),
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

async function generateOrderNumber() {
  const year = new Date().getFullYear()
  const prefix = `ORD-${year}`
  const lastOrder = await prisma.customerOrder.findFirst({
    where: { orderNumber: { startsWith: prefix } },
    orderBy: { orderNumber: 'desc' },
  })

  let sequence = 1
  if (lastOrder) {
    const lastSequence = parseInt(lastOrder.orderNumber.split('-')[2] || '0', 10)
    if (!Number.isNaN(lastSequence)) sequence = lastSequence + 1
  }

  return `${prefix}-${String(sequence).padStart(4, '0')}`
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
    { design: { contains: search, mode: 'insensitive' } },
    { color: { contains: search, mode: 'insensitive' } },
  ]

  const [products, total, categories] = await Promise.all([
    prisma.product.findMany({
      where,
      include: { category: true },
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
  ])

  return NextResponse.json({ products, total, categories, page, limit })
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

      const productIds = Array.from(new Set(parsedBatch.data.items.map((item) => item.productId)))
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
        select: { id: true, name: true, unit: true, costPrice: true },
      })

      if (products.length !== productIds.length) {
        return NextResponse.json({ error: 'One or more products are not available' }, { status: 404 })
      }

      const productMap = new Map(products.map((product) => [product.id, product]))
      const taxRate = 18
      const lineItems = parsedBatch.data.items.map((item) => {
        const product = productMap.get(item.productId)
        if (!product) {
          throw new Error('One or more products are not available')
        }
        const unitPrice = product.costPrice && product.costPrice > 0 ? product.costPrice * 1.25 : 1
        const subTotal = unitPrice * item.quantity
        const taxAmount = (subTotal * taxRate) / 100
        return {
          productId: item.productId,
          quantity: item.quantity,
          unitPrice,
          subTotal,
          taxRate,
          taxAmount,
          total: subTotal + taxAmount,
          product,
          colorPreference: item.colorPreference,
          note: item.note,
        }
      })

      const subTotal = lineItems.reduce((sum, item) => sum + item.subTotal, 0)
      const taxAmount = lineItems.reduce((sum, item) => sum + item.taxAmount, 0)
      const grandTotal = subTotal + taxAmount

      const order = await prisma.customerOrder.create({
        data: {
          orderNumber: await generateOrderNumber(),
          customerId,
          status: 'PENDING',
          subTotal,
          taxRate,
          taxAmount,
          grandTotal,
          shippingAddress: 'Address will be confirmed with customer',
          billingAddress: null,
          phoneNumber: parsedBatch.data.customerPhone ?? 'UNKNOWN',
          note: lineItems
            .map((item) => {
              const extra = [item.colorPreference ? `color=${item.colorPreference}` : null, item.note]
                .filter(Boolean)
                .join(', ')
              return extra ? `${item.product.name}: ${extra}` : null
            })
            .filter(Boolean)
            .join('\n') || null,
          items: {
            create: lineItems.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              subTotal: item.subTotal,
              taxRate: item.taxRate,
              taxAmount: item.taxAmount,
              total: item.total,
            })),
          },
        },
        include: {
          items: true,
        },
      })

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
            productName: item.product.name,
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
    const product = await prisma.product.findFirst({
      where: {
        id: parsed.productId,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        unit: true,
        costPrice: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const customerId =
      session?.user?.role === 'CUSTOMER'
        ? (session.user.id as string)
        : await ensureCustomerUser(parsed.customerName, parsed.customerEmail, parsed.customerPhone)
    const unitPrice = product.costPrice && product.costPrice > 0 ? product.costPrice * 1.25 : 1
    const subTotal = unitPrice * parsed.quantity
    const taxRate = 18
    const taxAmount = (subTotal * taxRate) / 100
    const grandTotal = subTotal + taxAmount

    const order = await prisma.customerOrder.create({
      data: {
        orderNumber: await generateOrderNumber(),
        customerId,
        status: 'PENDING',
        subTotal,
        taxRate,
        taxAmount,
        grandTotal,
        shippingAddress: 'Address will be confirmed with customer',
        billingAddress: null,
        phoneNumber: parsed.customerPhone ?? 'UNKNOWN',
        note: parsed.note,
        items: {
          create: [
            {
              productId: parsed.productId,
              quantity: parsed.quantity,
              unitPrice,
              subTotal,
              taxRate,
              taxAmount,
              total: grandTotal,
            },
          ],
        },
      },
      include: { items: true },
    })

    await createNotification({
      role: 'ADMIN',
      title: 'New customer order request',
      message: `${parsed.customerName} requested ${parsed.quantity} ${product.unit} of ${product.name}.`,
      type: 'INFO',
      link: '/admin/customer-orders',
    })

    const notifications = await sendOrderWhatsAppNotifications({
      orderId: order.id,
      productName: product.name,
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
