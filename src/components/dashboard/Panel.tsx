'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

export interface PanelProps {
  title: string
  /** Short supporting line under the title. */
  subtitle?: string
  /** Optional link in the panel header, e.g. "View all". */
  action?: { label: string; href: string }
  children: ReactNode
}

/** A titled surface for a chart, list, or table. */
export function Panel({ title, subtitle, action, children }: PanelProps) {
  return (
    <section className="rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] shadow-[var(--shadow-sm)]">
      <header className="flex items-center justify-between gap-4 border-b border-[var(--border)] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-[var(--text-muted)]">{subtitle}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 text-xs font-medium text-[var(--primary)] hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          >
            {action.label}
          </Link>
        )}
      </header>
      <div className="p-5">{children}</div>
    </section>
  )
}

/** Consistent empty state so a panel with no data never looks broken. */
export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-[var(--text-muted)]">{message}</p>
  )
}
