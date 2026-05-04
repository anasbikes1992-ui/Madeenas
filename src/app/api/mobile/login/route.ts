import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db'
import { fail, ok } from '@/lib/api-response'
import { signMobileToken } from '@/lib/mobile-auth'

const RATE_WINDOW_MS = 60_000
const MAX_ATTEMPTS_PER_WINDOW = 10
const attemptsByIp = new Map<string, { count: number; resetAt: number }>()

type LoginBody = {
  email?: string
  password?: string
}

function getClientIp(request: Request) {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) {
    return forwardedFor.split(',')[0]?.trim() ?? 'unknown'
  }

  return request.headers.get('x-real-ip') ?? 'unknown'
}

function isRateLimited(ip: string) {
  const now = Date.now()
  const existing = attemptsByIp.get(ip)

  if (!existing || existing.resetAt < now) {
    attemptsByIp.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return false
  }

  existing.count += 1
  attemptsByIp.set(ip, existing)
  return existing.count > MAX_ATTEMPTS_PER_WINDOW
}

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request)
    if (isRateLimited(clientIp)) {
      return fail('Too many login attempts. Try again in a minute.', 429, 'RATE_LIMITED')
    }

    const body = (await request.json()) as LoginBody

    if (!body.email || !body.password) {
      return fail('Email and password are required', 400, 'VALIDATION_ERROR')
    }

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

    const token = await signMobileToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      locationId: user.locationId,
    })

    return ok({
      token,
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
