/**
 * Retail price computation — single source of truth for customer-facing
 * prices (storefront, gallery, customer cart, mobile catalogue).
 *
 * retail = costPrice x retail_markup (AppSetting), rounded to currency.
 * A variant without a positive cost price has NO retail price (null) —
 * it must never silently fall back to a bogus amount like LKR 1.
 */
import { Prisma } from '@prisma/client'
import { money, round2 } from '@/lib/money'
import { getRetailMarkup } from '@/lib/settings'

export function computeRetailPrice(
  costPrice: Prisma.Decimal | number | string | null | undefined,
  markup: number
): number | null {
  if (costPrice === null || costPrice === undefined) return null
  const cost = money(costPrice)
  if (cost.lessThanOrEqualTo(0)) return null
  return round2(cost.times(money(markup))).toNumber()
}

/** Convenience wrapper that loads the markup from settings. */
export async function retailPriceFor(
  costPrice: Prisma.Decimal | number | string | null | undefined
): Promise<number | null> {
  const markup = await getRetailMarkup()
  return computeRetailPrice(costPrice, markup)
}
