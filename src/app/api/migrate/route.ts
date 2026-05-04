import { NextResponse } from 'next/server'
import { env } from '@/lib/env'
import { fail } from '@/lib/api-response'

export async function POST(req: Request) {
  try {
    const { token } = (await req.json()) as { token?: string }

    if (!env.SEED_SECRET || token !== env.SEED_SECRET) {
      return fail('Unauthorized', 401, 'UNAUTHORIZED')
    }

    return fail(
      'Runtime SQL migration endpoint is disabled. Use Prisma migrate deploy in CI/CD.',
      410,
      'ENDPOINT_DISABLED'
    )
  } catch {
    return fail('Invalid request body', 400, 'VALIDATION_ERROR')
  }
}
