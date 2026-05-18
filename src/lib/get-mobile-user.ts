import type { NextRequest } from 'next/server'
import { verifyMobileToken } from '@/lib/mobile-auth'
import { captureApiError } from '@/lib/logger'

type RequestLike = Pick<Request, 'headers'> | NextRequest

export type MobileUser = Awaited<ReturnType<typeof verifyMobileToken>>

export async function getMobileUser(request: RequestLike): Promise<MobileUser | null> {
  const authHeader = request.headers.get('authorization') || ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : ''
  if (!token) return null

  try {
    return await verifyMobileToken(token)
  } catch (error) {
    captureApiError(error, { scope: 'mobile-auth', event: 'verify-token-failed' })
    return null
  }
}
