import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { customerOrderSchema } from '@/lib/validations'
import { sendOrderWhatsAppNotifications } from '@/lib/whatsapp'
import { createNotification } from '@/lib/audit'
import { limitRequests } from '@/lib/rate-limit'
import { auth } from '@/lib/auth'

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
    const rateLimit = limitRequests({
      key: `gallery-order:${clientIp}`,
      maxRequests: 6,
      windowMs: 60_000,
    })

    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many order requests. Please try again shortly.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = customerOrderSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid order request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const product = await prisma.product.findFirst({
      where: {
        id: parsed.data.productId,
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
        productId: parsed.data.productId,
        customerId: session?.user?.role === 'CUSTOMER' ? (session.user.id as string) : null,
        customerName: parsed.data.customerName,
        customerEmail: parsed.data.customerEmail,
        customerPhone: parsed.data.customerPhone,
        quantity: parsed.data.quantity,
        colorPreference: parsed.data.colorPreference,
        note: parsed.data.note,
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
