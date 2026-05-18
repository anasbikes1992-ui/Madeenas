'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { getDashboardPath } from '@/lib/constants'
import {
  ArrowRight,
  BarChart3,
  Layers3,
  LogIn,
  ShoppingBag,
  ShieldCheck,
  Sparkles,
  Store,
  Truck,
  Users,
  Warehouse,
} from 'lucide-react'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const pageIn = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.42, ease: EASE } },
}

const highlights = [
  'Gallery-first customer browsing',
  'Role-aware operational dashboards',
  'Inventory-safe sales and requests',
  'Audit-ready history for every action',
]

const metrics = [
  { value: '200+', label: 'catalog items ready for launch', icon: Store },
  { value: '7', label: 'role-based access profiles', icon: Users },
  { value: '<2 min', label: 'average checkout start time', icon: Sparkles },
]

const workflows = [
  {
    title: 'Customers',
    description: 'Browse the gallery, compare fabrics, and move into a clean request flow.',
    icon: ShoppingBag,
    cta: 'Open gallery',
    href: '/gallery',
  },
  {
    title: 'Staff & management',
    description: 'Operate sales, inventory, returns, and finance with the same source of truth.',
    icon: Warehouse,
    cta: 'Staff login',
    href: '/login',
  },
  {
    title: 'Fulfillment',
    description: 'Track requests, approve movement, and keep the workflow audit-friendly.',
    icon: Truck,
    cta: 'Sales hub',
    href: '/sales',
  },
]

const pillars = [
  {
    title: 'Simple for shoppers',
    body: 'A clear public path with catalog discovery, order requests, and a fast signup/login handoff.',
    icon: ShoppingBag,
  },
  {
    title: 'Strong for operators',
    body: 'The staff workspace keeps sales, inventory, requests, and finance under one structure.',
    icon: BarChart3,
  },
  {
    title: 'Safe for growth',
    body: 'Role access, audit trails, and clean data boundaries keep the system maintainable.',
    icon: ShieldCheck,
  },
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
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.08),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#ffffff_45%,#eef4ff_100%)]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          className="h-10 w-10 rounded-full border-4 border-navy-700 border-t-transparent"
        />
      </div>
    )
  }

  // Unauthenticated — show the full public landing page
  return (
    <motion.main
      variants={pageIn}
      initial="hidden"
      animate="visible"
      className="relative min-h-screen overflow-hidden text-slate-900"
    >
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.08),transparent_30%),radial-gradient(circle_at_12%_20%,rgba(212,175,55,0.14),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#ffffff_44%,#eef4ff_100%)]" aria-hidden />

      <section className="page-shell pt-5">
        <div className="surface-card-soft sticky top-4 z-20 flex flex-col gap-4 px-5 py-4 backdrop-blur-xl md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-linear-to-br from-navy-700 to-slate-900 font-heading text-sm font-black text-white shadow-navy">
              M
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-indigo-500">Madeena Tex</p>
              <p className="text-sm text-slate-600">Textiles, operations, and customer requests in one system</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link href="/sales" className="btn-secondary btn-sm">
              Sales hub
            </Link>
            <Link href="/gallery" className="btn-secondary btn-sm">
              Browse catalog
            </Link>
            <Link href="/login" className="btn-secondary btn-sm">
              <LogIn className="h-4 w-4" />
              Staff login
            </Link>
            <Link href="/customer/login" className="btn-primary btn-sm">
              Customer portal
            </Link>
          </div>
        </div>
      </section>

      <section className="page-shell grid gap-8 pb-10 pt-10 lg:grid-cols-[1.12fr_0.88fr] lg:items-start lg:pb-16 lg:pt-12">
        <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
          <motion.div variants={fadeUp} className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-indigo-500 shadow-[0_12px_30px_rgba(15,23,42,0.04)]">
            <Sparkles className="h-4 w-4 text-gold-500" />
            Textile commerce rethought
          </motion.div>

          <motion.h1 variants={fadeUp} className="max-w-4xl text-5xl font-black leading-[0.95] tracking-tight text-slate-950 sm:text-6xl lg:text-7xl">
            A clean, fast web workspace for shopping, sales, and stock operations.
          </motion.h1>

          <motion.p variants={fadeUp} className="max-w-2xl text-lg leading-8 text-slate-600">
            Customers get a direct path into the catalog. Staff get a calmer workspace for orders, inventory, and finance. The business keeps one shared source of truth.
          </motion.p>

          <motion.div variants={fadeUp} className="flex flex-col gap-3 sm:flex-row">
            <Link href="/gallery" className="btn-primary btn-lg">
              Browse gallery
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/signup" className="btn-secondary btn-lg">
              Create account
            </Link>
          </motion.div>

          <motion.div variants={fadeUp} className="flex flex-wrap gap-3">
            {highlights.map((highlight) => (
              <div key={highlight} className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
                {highlight}
              </div>
            ))}
          </motion.div>

          <motion.div variants={fadeUp} className="grid gap-4 sm:grid-cols-3">
            {metrics.map((metric) => {
              const Icon = metric.icon

              return (
                <div key={metric.label} className="surface-card-soft p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-3xl font-black tracking-tight text-slate-950">{metric.value}</p>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{metric.label}</p>
                    </div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              )
            })}
          </motion.div>
        </motion.div>

        <motion.aside variants={stagger} initial="hidden" animate="visible" className="space-y-4">
          <motion.div variants={fadeUp} className="surface-card p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="section-label">At a glance</p>
                <h2 className="mt-2 text-2xl font-black text-slate-950">A calmer dashboard for the whole team.</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-50 text-gold-700">
                <Layers3 className="h-6 w-6" />
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              {[
                ['Customers', 'Open the gallery and place a request without hunting for buttons.'],
                ['Sales', 'Move from inquiry to request handling in fewer steps.'],
                ['Operations', 'Manage stock, returns, and approvals from a single place.'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} className="surface-card bg-[linear-gradient(180deg,#0f172a_0%,#152a63_100%)] p-6 text-white shadow-[0_24px_70px_rgba(15,23,42,0.18)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold-300">Workflow</p>
            <div className="mt-4 grid gap-3">
              {['Browse catalog', 'Capture request', 'Fulfill order'].map((step, index) => (
                <div key={step} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-sm font-bold text-gold-300">
                    0{index + 1}
                  </div>
                  <p className="font-medium text-white">{step}</p>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.aside>
      </section>

      <section className="page-shell pb-16">
        <motion.div variants={stagger} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="grid gap-6 lg:grid-cols-3">
          {workflows.map((workflow) => {
            const Icon = workflow.icon

            return (
              <motion.article key={workflow.title} variants={fadeUp} className="surface-card p-6 transition-transform duration-200 hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white shadow-[0_12px_30px_rgba(15,23,42,0.16)]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl font-black text-slate-950">{workflow.title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">{workflow.description}</p>
                <Link href={workflow.href} className="btn-secondary mt-6 w-full">
                  {workflow.cta}
                </Link>
              </motion.article>
            )
          })}
        </motion.div>
      </section>

      <section className="page-shell pb-20">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="surface-card p-6">
            <p className="section-label">System map</p>
            <h2 className="mt-3 text-3xl font-black text-slate-950">One system, three surfaces.</h2>
            <p className="mt-4 text-base leading-7 text-slate-600">
              The site is structured around a public catalog, a staff workspace, and a controlled operational backend. Each part shares the same data and design language.
            </p>
            <div className="mt-6 space-y-3">
              {pillars.map((pillar) => {
                const Icon = pillar.icon

                return (
                  <div key={pillar.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-navy-700 shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
                        <Icon className="h-4 w-4" />
                      </div>
                      <p className="font-semibold text-slate-950">{pillar.title}</p>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-slate-600">{pillar.body}</p>
                  </div>
                )
              })}
            </div>
          </motion.div>

          <motion.div variants={fadeUp} initial="hidden" whileInView="visible" viewport={{ once: true, margin: '-80px' }} className="surface-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="section-label">Navigation</p>
                <h2 className="mt-2 text-3xl font-black text-slate-950">Get to the right surface quickly.</h2>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-navy-50 text-navy-700">
                <LogIn className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                ['Gallery', '/gallery', 'Browse the collection and request products.'],
                ['Sales hub', '/sales', 'Start customer sales workflows.'],
                ['Staff login', '/login', 'Access the internal dashboard.'],
                ['Customer portal', '/customer/login', 'Enter the customer experience.'],
              ].map(([title, href, body]) => (
                <Link key={title} href={href} className="rounded-2xl border border-slate-200 bg-white p-4 transition-transform duration-200 hover:-translate-y-1 hover:border-slate-300">
                  <p className="font-semibold text-slate-950">{title}</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
                </Link>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    </motion.main>
  )
}
