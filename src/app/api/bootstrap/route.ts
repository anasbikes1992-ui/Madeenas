export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'

/**
 * POST /api/bootstrap
 * Creates or resets the super-admin user.
 * Protected by the SEED_SECRET env var via the x-seed-token header.
 *
 * Body: { email, password, name }
 */
export async function POST(request: NextRequest) {
  const token = request.headers.get('x-seed-token')
  const secret = process.env.SEED_SECRET

  if (!secret || token !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const email    = String(body.email    || 'anasbikes1992@gmail.com')
    const name     = String(body.name     || 'Anas (Super Admin)')
    const password = String(body.password || '12345678')
    const role     = String(body.role     || 'SUPER_ADMIN')

    if (password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    const passwordHash = await bcrypt.hash(password, 10)

    const user = await prisma.user.upsert({
      where:  { email },
      update: { name, password: passwordHash, role: role as any, isActive: true },
      create: { name, email, password: passwordHash, role: role as any, isActive: true },
      select: { id: true, name: true, email: true, role: true, isActive: true, createdAt: true },
    })

    return NextResponse.json({
      success: true,
      message: `User ${user.email} is ready as ${user.role}.`,
      user,
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    console.error('[bootstrap] Error:', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
