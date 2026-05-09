import { prisma } from '@/lib/db'
import { fail, ok } from '@/lib/api-response'
import { verifyMobileToken } from '@/lib/mobile-auth'

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const modeParam = searchParams.get('mode')
    const mode: 'staff' | 'customer' = modeParam === 'customer' ? 'customer' : 'staff'

    const authHeader = request.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
    if (!token) {
      return fail('Missing token', 401, 'UNAUTHORIZED')
    }

    const payload = await verifyMobileToken(token)

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      include: { location: true },
    })

    if (!user || !user.isActive) {
      return fail('User not found', 401, 'INVALID_SESSION')
    }

    if (!isRoleAllowedForMode(user.role, mode)) {
      const message =
        mode === 'customer'
          ? 'This account is not a customer account. Please use Staff Login.'
          : 'This account is not a staff account. Please use Customer Login.'
      return fail(message, 403, 'ROLE_MODE_MISMATCH')
    }

    return ok({
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
  } catch {
    return fail('Invalid or expired session', 401, 'INVALID_TOKEN')
  }
}
