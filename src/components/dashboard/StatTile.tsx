'use client'

import Link from 'next/link'
import type { LucideIcon } from 'lucide-react'

export type StatTone = 'neutral' | 'positive' | 'negative' | 'warning'

const TONE_VALUE: Record<StatTone, string> = {
  neutral: 'text-[var(--text-primary)]',
  positive: 'text-[var(--positive)]',
  negative: 'text-[var(--negative)]',
  warning: 'text-[var(--warning)]',
}

const TONE_ICON: Record<StatTone, string> = {
  neutral: 'bg-[var(--primary-tint)] text-[var(--primary)]',
  positive: 'bg-[var(--positive-tint)] text-[var(--positive)]',
  negative: 'bg-[var(--negative-tint)] text-[var(--negative)]',
  warning: 'bg-[var(--warning-tint)] text-[var(--warning)]',
}

export interface StatTileProps {
  label: string
  value: string
  Icon: LucideIcon
  /** Supporting detail under the value (e.g. "12 sales today"). */
  hint?: string
  /** Colour carries meaning here, not decoration — use it only when the number is good or bad news. */
  tone?: StatTone
  href?: string
}

/**
 * A single dashboard metric.
 *
 * Deliberately quiet: the number is the loudest thing on the tile, the label
 * and hint sit back, and colour appears only when it means something.
 */
export function StatTile({ label, value, Icon, hint, tone = 'neutral', href }: StatTileProps) {
  const content = (
    <div className="flex h-full flex-col justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-5 shadow-[var(--shadow-sm)] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-[var(--text-muted)]">
          {label}
        </span>
        <span className={`rounded-[var(--radius-sm)] p-2 ${TONE_ICON[tone]}`}>
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <div>
        <p className={`text-2xl font-semibold tracking-tight ${TONE_VALUE[tone]}`}>{value}</p>
        {hint && <p className="mt-1 text-xs text-[var(--text-muted)]">{hint}</p>}
      </div>
    </div>
  )

  if (!href) return content

  return (
    <Link
      href={href}
      className="block h-full rounded-[var(--radius-lg)] transition-shadow hover:shadow-[var(--shadow-md)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
    >
      {content}
    </Link>
  )
}
