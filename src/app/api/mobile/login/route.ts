import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { fail, ok } from '@/lib/api-response'
import { signMobileToken } from '@/lib/mobile-auth'
import { limitRequestsAsync } from '@/lib/rate-limit'

type LoginBody = {
  email?: string
  password?: string
  mode?: 'staff' | 'customer'
}

const STAFF_ROLES = new Set([
  'SUPER_ADMIN',
  'ADMIN',
  'MANAGER',
  'SHOP_STAFF',
  'STORE_KEEPER',
  'FINANCE',
])

function isRoleAllowedForMode(role: string, mode: 'staff' | 'customer') {
  const normalized = role.toUpperCase()
  if (mode === 'customer') {
    return normalized === 'CUSTOMER'
  }
  return STAFF_ROLES.has(normalized)
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown'
  }

  return request.headers.get('x-real-ip') ?? 'unknown'
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    const rate = await limitRequestsAsync({
      key: `mobile-login:${clientIp}`,
      maxRequests: 10,
      windowMs: 60_000,
    })
    if (!rate.success) {
      return fail('Too many login attempts. Try again in a minute.', 429, 'RATE_LIMITED')
    }

    const body = (await request.json()) as LoginBody

    if (!body.email || !body.password) {
      return fail('Email and password are required', 400, 'VALIDATION_ERROR')
    }

    const mode: 'staff' | 'customer' = body.mode === 'customer' ? 'customer' : 'staff'

    const user = await prisma.user.findUnique({
      where: { email: body.email },
      include: { location: true },
    })

    if (!user || !user.isActive) {
      return fail('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    const isPasswordValid = await bcrypt.compare(body.password, user.password)
    if (!isPasswordValid) {
      return fail('Invalid credentials', 401, 'INVALID_CREDENTIALS')
    }

    if (!isRoleAllowedForMode(user.role, mode)) {
      const message =
        mode === 'customer'
          ? 'This account is not a customer account. Please use Staff Login.'
          : 'This account is not a staff account. Please use Customer Login.'
      return fail(message, 403, 'ROLE_MODE_MISMATCH')
    }

    const token = await signMobileToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      locationId: user.locationId,
    })

    return ok({
      token,
      mode,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        locationId: user.locationId,
        locationName: user.location?.name ?? null,
      },
    })
  } catch (error: unknown) {
    console.error('[mobile-login] failed:', error)
    const message = error instanceof Error ? error.message : 'Login failed'
    return fail(message, 500, 'MOBILE_LOGIN_FAILED')
  }
}
