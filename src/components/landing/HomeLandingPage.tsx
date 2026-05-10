'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { getDashboardPath } from '@/lib/constants'

const proofPoints = [
  'Premium textile-first storefront',
  'Gallery-to-order flow for customers',
  'Role-aware staff operations and sales',
  'Inventory-safe transactions and audit trails',
]

const metrics = [
  { value: '200+', label: 'SKUs in the catalog' },
  { value: '7', label: 'role-based access profiles' },
  { value: '<2 min', label: 'target checkout time for staff' },
]

export default function HomeLandingPage() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Redirect authenticated users to their correct home immediately
  useEffect(() => {
    if (status === 'authenticated' && session?.user) {
      const role = (session.user as any)?.role as string | undefined
      if (role) {
        router.replace(getDashboardPath(role))
      }
    }
  }, [status, session, router])

  // While checking session, show a minimal loader so there's no flash
  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0f172a]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-cyan-400 border-t-transparent" />
      </div>
    )
  }

  // Unauthenticated — show the full public landing page
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.18),transparent_25%),linear-gradient(180deg,#0f172a_0%,#111827_42%,#f8fafc_42%,#ffffff_100%)] text-slate-900">
      <section className="relative mx-auto max-w-7xl px-6 pb-10 pt-8 lg:px-10 lg:pb-16 lg:pt-10">
        <div className="absolute inset-x-6 top-6 h-24 rounded-4xl border border-white/10 bg-white/5 blur-3xl lg:inset-x-10" aria-hidden="true" />

        <div className="relative rounded-4xl border border-white/10 bg-white/8 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.25)] backdrop-blur-xl lg:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Madeena Tex — Textile Commerce
              </div>
              <div className="space-y-4">
                <p className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-200/90">Madeena textile commerce</p>
                <h1 className="max-w-4xl text-5xl font-black leading-[0.95] sm:text-6xl lg:text-7xl">
                  A premium textile experience for browsing, ordering, and operating the store.
                </h1>
                <p className="max-w-2xl text-base leading-8 text-indigo-100 sm:text-lg">
                  Customers move into the gallery, staff move into the workspace, and the business keeps one shared source of truth for sales, stock, and customer requests.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href="/gallery" className="btn-primary btn-lg justify-center bg-cyan-400 text-slate-950 hover:bg-cyan-300">
                  Browse Gallery
                </Link>
                <Link href="/login" className="btn-secondary btn-lg justify-center border-white/15 bg-white/10 text-white hover:bg-white/15">
                  Sign In
                </Link>
                <Link href="/signup" className="btn-secondary btn-lg justify-center border-white/15 bg-white/5 text-white hover:bg-white/10">
                  Create Account
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {proofPoints.map((point) => (
                  <div key={point} className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-indigo-100 backdrop-blur">
                    {point}
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-4 lg:w-88">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.75rem] border border-white/10 bg-slate-950/50 p-5 text-white shadow-[0_18px_60px_rgba(15,23,42,0.2)]">
                  <p className="text-3xl font-black tracking-tight text-cyan-200">{metric.value}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{metric.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-16">
        <div className="grid gap-6">
          {/* Customer card */}
          <article className="group rounded-4xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_110px_rgba(79,70,229,0.16)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">01</p>
                <h2 className="text-2xl font-black text-slate-950">Customers</h2>
                <p className="text-base leading-7 text-slate-600">Browse the gallery, compare fabrics, and submit requests with one clear path from discovery to order.</p>
              </div>
              <div className="flex flex-col gap-2 self-start">
                <Link href="/gallery" className="btn-primary whitespace-nowrap justify-center">
                  Open gallery
                </Link>
                <Link href="/signup" className="text-center text-sm font-medium text-indigo-600 hover:underline">
                  Create account →
                </Link>
              </div>
            </div>
          </article>

          {/* Staff card */}
          <article className="group rounded-4xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_30px_110px_rgba(79,70,229,0.16)] sm:p-8">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-xl space-y-3">
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-indigo-500">02</p>
                <h2 className="text-2xl font-black text-slate-950">Staff & Management</h2>
                <p className="text-base leading-7 text-slate-600">Sign in to the operational workspace for sales, POS, customer orders, inventory, and finance views.</p>
              </div>
              <Link href="/login" className="btn-primary whitespace-nowrap justify-center self-start">
                Staff login
              </Link>
            </div>
          </article>
        </div>

        <aside className="rounded-4xl border border-slate-200/70 bg-[linear-gradient(160deg,#ffffff_0%,#f8fafc_42%,#eef2ff_100%)] p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-500">What Madeena Tex includes</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">One idea, three surfaces, shared data.</h2>
          <div className="mt-6 space-y-4">
            {[
              ['Homepage', 'Routes visitors to the right place fast — gallery, login, or signup.'],
              ['Gallery', 'Product discovery and customer order requests.'],
              ['Staff Workspace', 'Role-based access for POS, sales history, stock control, and finance.'],
            ].map(([title, body]) => (
              <div key={title} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
              </div>
            ))}
          </div>
          <div className="mt-6 rounded-2xl border border-cyan-200/70 bg-cyan-50 px-4 py-4 text-sm leading-7 text-cyan-950">
            Customers are automatically taken to the gallery when they log in. Staff and management land in the operational dashboard matching their role.
          </div>
        </aside>
      </section>
    </main>
  )
}
