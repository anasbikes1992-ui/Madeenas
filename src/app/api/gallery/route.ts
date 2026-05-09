import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { customerOrderSchema } from '@/lib/validations'
import { sendOrderWhatsAppNotifications } from '@/lib/whatsapp'
import { createNotification } from '@/lib/audit'
import { limitRequestsAsync } from '@/lib/rate-limit'
import { auth } from '@/lib/auth'
import { z } from 'zod'

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
      const productIds = Array.from(new Set(parsedBatch.data.items.map((item) => item.productId)))
      const products = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          isActive: true,
        },
        include: { category: true },
      })

      if (products.length !== productIds.length) {
        return NextResponse.json({ error: 'One or more products are not available' }, { status: 404 })
      }

      const productMap = new Map(products.map((product) => [product.id, product]))

      const createdOrders = await prisma.$transaction(async (tx) => {
        const orders = [] as Awaited<ReturnType<typeof tx.customerOrder.create>>[]
        for (const item of parsedBatch.data.items) {
          const order = await tx.customerOrder.create({
            data: {
              productId: item.productId,
              customerId: session?.user?.role === 'CUSTOMER' ? (session.user.id as string) : null,
              customerName: parsedBatch.data.customerName,
              customerEmail: parsedBatch.data.customerEmail,
              customerPhone: parsedBatch.data.customerPhone,
              quantity: item.quantity,
              colorPreference: item.colorPreference,
              note: item.note,
            },
          })
          orders.push(order)
        }
        return orders
      })

      await createNotification({
        role: 'ADMIN',
        title: 'New customer cart order request',
        message: `${parsedBatch.data.customerName} submitted ${createdOrders.length} order request(s) from storefront cart.`,
        type: 'INFO',
        link: '/admin/customer-orders',
      })

      const notifications = await Promise.all(
        createdOrders.map((order) => {
          const product = productMap.get(order.productId)
          if (!product) return Promise.resolve([])
          return sendOrderWhatsAppNotifications({
            orderId: order.id,
            productName: product.name,
            quantity: order.quantity,
            customerName: order.customerName,
            customerEmail: order.customerEmail,
            customerPhone: order.customerPhone,
            colorPreference: order.colorPreference,
            note: order.note,
          })
        })
      )

      return NextResponse.json(
        {
          orders: createdOrders,
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
      include: {
        category: true,
      },
    })

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    const order = await prisma.customerOrder.create({
      data: {
        productId: parsed.productId,
        customerId: session?.user?.role === 'CUSTOMER' ? (session.user.id as string) : null,
        customerName: parsed.customerName,
        customerEmail: parsed.customerEmail,
        customerPhone: parsed.customerPhone,
        quantity: parsed.quantity,
        colorPreference: parsed.colorPreference,
        note: parsed.note,
      },
    })

    await createNotification({
      role: 'ADMIN',
      title: 'New customer order request',
      message: `${order.customerName} requested ${order.quantity} ${product.unit} of ${product.name}.`,
      type: 'INFO',
      link: '/admin/customer-orders',
    })

    const notifications = await sendOrderWhatsAppNotifications({
      orderId: order.id,
      productName: product.name,
      quantity: order.quantity,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      colorPreference: order.colorPreference,
      note: order.note,
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
