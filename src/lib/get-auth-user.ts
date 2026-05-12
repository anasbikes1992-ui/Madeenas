import type { NextRequest } from 'next/server'
import { auth } from './auth'
import { verifyMobileToken } from './mobile-auth'

export interface AuthUser {
  id: string
  role: string
  email?: string
  locationId?: string | null
}

/**
 * Resolves the authenticated user from either:
 * 1. A NextAuth session cookie (web users)
 * 2. A mobile JWT Bearer token (mobile app users)
 *
 * Returns null if neither is present or valid.
 */
export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  // 1. Try NextAuth session (web users via cookies)
  const session = await auth()
  if (session?.user?.id) {
    return {
      id: session.user.id,
      role: session.user.role ?? '',
      email: session.user.email ?? undefined,
      locationId: (session.user as { locationId?: string | null }).locationId ?? null,
    }
  }

  // 2. Try mobile JWT Bearer token
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  try {
    const mobileUser = await verifyMobileToken(token)
    if (!mobileUser.sub) return null
    return {
      id: mobileUser.sub,
      role: mobileUser.role ?? '',
      email: mobileUser.email,
      locationId: mobileUser.locationId,
    }
  } catch {
    return null
  }
}
