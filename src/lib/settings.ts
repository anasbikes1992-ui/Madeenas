/**
 * Typed access to AppSetting rows — the single source of truth for business
 * constants that used to be hardcoded (retail markup, VAT rate, currency,
 * minimum supported mobile version).
 *
 * Values are cached in-process for a short TTL; call `invalidateSettingsCache`
 * after updates.
 */
import { prisma } from '@/lib/db'

export const SETTING_KEYS = {
  RETAIL_MARKUP: 'retail_markup',
  VAT_RATE: 'vat_rate',
  CURRENCY: 'currency',
  MOBILE_MIN_VERSION: 'mobile_min_version',
} as const

export type SettingKey = (typeof SETTING_KEYS)[keyof typeof SETTING_KEYS]

const DEFAULTS: Record<SettingKey, string> = {
  retail_markup: '1.20',
  vat_rate: '18.00',
  currency: 'LKR',
  mobile_min_version: '3.1.0',
}

const CACHE_TTL_MS = 60_000

let cache: { values: Map<string, string>; expiresAt: number } | null = null

async function loadSettings(): Promise<Map<string, string>> {
  const now = Date.now()
  if (cache && cache.expiresAt > now) return cache.values

  const rows = await prisma.appSetting.findMany()
  const values = new Map(rows.map((r) => [r.key, r.value]))
  cache = { values, expiresAt: now + CACHE_TTL_MS }
  return values
}

export function invalidateSettingsCache(): void {
  cache = null
}

export async function getSetting(key: SettingKey): Promise<string> {
  const values = await loadSettings()
  return values.get(key) ?? DEFAULTS[key]
}

function parsePositiveNumber(raw: string, key: string, fallback: number): number {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) {
    console.error(`[settings] Invalid numeric value for ${key}: "${raw}", using ${fallback}`)
    return fallback
  }
  return n
}

/** Multiplier applied to costPrice for customer-facing retail prices. */
export async function getRetailMarkup(): Promise<number> {
  const raw = await getSetting(SETTING_KEYS.RETAIL_MARKUP)
  return parsePositiveNumber(raw, SETTING_KEYS.RETAIL_MARKUP, 1.2)
}

/** VAT percentage (e.g. 18). */
export async function getVatRate(): Promise<number> {
  const raw = await getSetting(SETTING_KEYS.VAT_RATE)
  return parsePositiveNumber(raw, SETTING_KEYS.VAT_RATE, 18)
}

export async function getCurrency(): Promise<string> {
  return getSetting(SETTING_KEYS.CURRENCY)
}

export async function getMobileMinVersion(): Promise<string> {
  return getSetting(SETTING_KEYS.MOBILE_MIN_VERSION)
}

export async function updateSetting(key: SettingKey, value: string): Promise<void> {
  await prisma.appSetting.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  })
  invalidateSettingsCache()
}
