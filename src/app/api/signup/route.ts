import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/db'
import { customerSignupSchema } from '@/lib/validations'
import { createNotification } from '@/lib/audit'
import { limitRequestsAsync } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    const forwardedFor = request.headers.get('x-forwarded-for')
    const clientIp = forwardedFor?.split(',')[0]?.trim() || request.headers.get('x-real-ip') || 'anonymous'
    const rateLimit = await limitRequestsAsync({
      key: `customer-signup:${clientIp}`,
      maxRequests: 4,
      windowMs: 60_000,
    })

    if (!rateLimit.success) {
      return NextResponse.json({ error: 'Too many signup attempts. Please try again shortly.' }, { status: 429 })
    }

    const body = await request.json()
    const parsed = customerSignupSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        {
          error: 'Invalid signup request',
          details: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const passwordHash = await bcrypt.hash(parsed.data.password, 10)

    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        password: passwordHash,
        role: 'CUSTOMER',
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
      },
    })

    if (parsed.data.phone) {
      await prisma.customer.upsert({
        where: { phone: parsed.data.phone },
        update: {
          name: parsed.data.name,
          email: parsed.data.email,
        },
        create: {
          name: parsed.data.name,
          phone: parsed.data.phone,
          email: parsed.data.email,
        },
      })
    }

    await createNotification({
      role: 'ADMIN',
      title: 'New customer signup',
      message: `${user.name} created a customer account with ${user.email}.`,
      type: 'INFO',
      link: '/admin/settings/users',
    })

    return NextResponse.json(user, { status: 201 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
    }

    console.error('Customer signup failed:', error)
    return NextResponse.json({ error: 'Failed to create customer account' }, { status: 500 })
  }
}