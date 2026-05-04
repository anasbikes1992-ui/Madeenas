import { jwtVerify, SignJWT } from 'jose'
import { env } from '@/lib/env'

const encoder = new TextEncoder()
const mobileJwtSecret = encoder.encode(env.MOBILE_JWT_SECRET)

export type MobileTokenPayload = {
  sub: string
  email: string
  role: string
  locationId: string | null
}

export async function signMobileToken(payload: MobileTokenPayload) {
  return new SignJWT({
    email: payload.email,
    role: payload.role,
    locationId: payload.locationId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(payload.sub)
    .setIssuedAt()
    .setExpirationTime('12h')
    .sign(mobileJwtSecret)
}

export async function verifyMobileToken(token: string) {
  const { payload } = await jwtVerify(token, mobileJwtSecret)

  return {
    sub: payload.sub,
    email: payload.email as string,
    role: payload.role as string,
    locationId: (payload.locationId as string | null | undefined) ?? null,
  }
}
