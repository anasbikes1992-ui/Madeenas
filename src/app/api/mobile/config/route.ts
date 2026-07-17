import { NextRequest } from 'next/server'
import { ok } from '@/lib/api-response'
import { getMobileMinVersion, getVatRate, getCurrency } from '@/lib/settings'

export const dynamic = 'force-dynamic'

/** Compare dotted numeric versions. Returns <0, 0, or >0. */
function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0)
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0)
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

/**
 * GET /api/mobile/config
 *
 * Public (pre-login) so the app can check compatibility on launch. Returns the
 * minimum supported app version plus business constants the client must not
 * hardcode.
 *
 * This is the lever that makes future API changes safe: an app older than
 * `minVersion` is told to update rather than silently misbehaving against a
 * contract it no longer understands.
 */
export async function GET(request: NextRequest) {
  const [minVersion, vatRate, currency] = await Promise.all([
    getMobileMinVersion(),
    getVatRate(),
    getCurrency(),
  ])

  const appVersion = request.headers.get('x-app-version')
  const updateRequired =
    appVersion !== null && compareVersions(appVersion, minVersion) < 0

  return ok({
    minVersion,
    updateRequired,
    vatRate,
    currency,
  })
}
