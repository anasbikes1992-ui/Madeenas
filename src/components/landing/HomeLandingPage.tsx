'use client'

import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { motion } from 'framer-motion'
import { getDashboardPath } from '@/lib/constants'

const FEATURES = [
  {
    title: 'Customers',
    description: 'Browse the gallery, compare fabrics, and submit requests with one clear path from discovery to order.',
    cta: 'Open gallery',
    ctaLink: '/gallery',
    secondary: 'Create account →',
    secondaryLink: '/signup',
    icon: '🛍️',
  },
  {
    title: 'Staff & Management',
    description: 'Sign in to the operational workspace for sales, POS, customer orders, inventory, and finance views.',
    cta: 'Staff login',
    ctaLink: '/login',
    icon: '👔',
  },
]

const PROOF_POINTS = [
  'Premium textile-first storefront',
  'Gallery-to-order flow for customers',
  'Role-aware staff operations and sales',
  'Inventory-safe transactions and audit trails',
]

const METRICS = [
  { value: '200+', label: 'SKUs ready to order' },
  { value: '7', label: 'role-based access profiles' },
  { value: '<2 min', label: 'avg checkout time' },
]

const SYSTEM_INFO = [
  ['Homepage', 'Routes visitors to the right place fast — gallery, login, or signup.'],
  ['Gallery', 'Product discovery and customer order requests.'],
  ['Staff Workspace', 'Role-based access for POS, sales history, stock control, and finance.'],
]

// Framer Motion variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
}

const textVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
}

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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: 'linear' }}
          className="h-8 w-8 rounded-full border-4 border-cyan-400 border-t-transparent"
        />
      </div>
    )
  }

  // Unauthenticated — show the full public landing page
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.22),transparent_28%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.18),transparent_25%),linear-gradient(180deg,#0f172a_0%,#111827_42%,#f8fafc_42%,#ffffff_100%)] text-slate-900">
      {/* Hero Section */}
      <section className="relative mx-auto max-w-7xl px-6 pb-10 pt-8 lg:px-10 lg:pb-16 lg:pt-10">
        <motion.div
          className="absolute inset-x-6 top-6 h-24 rounded-4xl border border-white/10 bg-white/5 blur-3xl lg:inset-x-10"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1 }}
          aria-hidden="true"
        />

        <motion.div
          className="relative rounded-4xl border border-white/10 bg-white/8 p-6 shadow-[0_30px_120px_rgba(15,23,42,0.25)] backdrop-blur-xl lg:p-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl space-y-6 text-white">
              <motion.div
                className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 }}
              >
                Madeena Tex — Textile Commerce
              </motion.div>

              <motion.div className="space-y-4" variants={containerVariants} initial="hidden" animate="visible">
                <motion.p
                  className="text-sm font-semibold uppercase tracking-[0.28em] text-indigo-200/90"
                  variants={textVariants}
                >
                  Textile sourcing reimagined
                </motion.p>
                <motion.h1
                  className="max-w-4xl text-5xl font-black leading-[0.95] sm:text-6xl lg:text-7xl"
                  variants={textVariants}
                >
                  A premium textile experience for browsing, ordering, and operating the store.
                </motion.h1>
                <motion.p className="max-w-2xl text-base leading-8 text-indigo-100 sm:text-lg" variants={textVariants}>
                  Customers move into the gallery, staff move into the workspace, and the business keeps one shared source of truth for sales, stock, and customer requests.
                </motion.p>
              </motion.div>

              <motion.div
                className="flex flex-col gap-3 sm:flex-row"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} variants={itemVariants}>
                  <Link
                    href="/gallery"
                    className="btn-primary btn-lg justify-center bg-cyan-400 text-slate-950 hover:bg-cyan-300"
                  >
                    Browse Gallery
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} variants={itemVariants}>
                  <Link href="/login" className="btn-secondary btn-lg justify-center border-white/15 bg-white/10 text-white hover:bg-white/15">
                    Sign In
                  </Link>
                </motion.div>
                <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.96 }} variants={itemVariants}>
                  <Link href="/signup" className="btn-secondary btn-lg justify-center border-white/15 bg-white/5 text-white hover:bg-white/10">
                    Create Account
                  </Link>
                </motion.div>
              </motion.div>

              <motion.div
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
                variants={containerVariants}
                initial="hidden"
                animate="visible"
              >
                {PROOF_POINTS.map((point, idx) => (
                  <motion.div
                    key={point}
                    className="rounded-2xl border border-white/10 bg-white/8 px-4 py-3 text-sm text-indigo-100 backdrop-blur"
                    variants={itemVariants}
                    whileHover={{ y: -4 }}
                  >
                    {point}
                  </motion.div>
                ))}
              </motion.div>
            </div>

            <motion.div
              className="grid gap-4 lg:w-88"
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {METRICS.map((metric, idx) => (
                <motion.div
                  key={metric.label}
                  className="rounded-[1.75rem] border border-white/10 bg-slate-950/50 p-5 text-white shadow-[0_18px_60px_rgba(15,23,42,0.2)]"
                  variants={itemVariants}
                  whileHover={{ y: -6 }}
                >
                  <motion.p
                    className="text-3xl font-black tracking-tight text-cyan-200"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.3 + idx * 0.1 }}
                  >
                    {metric.value}
                  </motion.p>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{metric.label}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-10 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:pb-16">
        <motion.div
          className="grid gap-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          viewport={{ once: true, margin: '-50px' }}
        >
          {FEATURES.map((feature, idx) => (
            <motion.article
              key={feature.title}
              className="group rounded-4xl border border-slate-200/70 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              whileHover={{ y: -4 }}
              transition={{ delay: idx * 0.1, duration: 0.4 }}
              viewport={{ once: true, margin: '-50px' }}
            >
              <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="max-w-xl space-y-3">
                  <motion.p
                    className="text-2xl font-black"
                    initial={{ scale: 0 }}
                    whileInView={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                    viewport={{ once: true }}
                  >
                    {feature.icon}
                  </motion.p>
                  <h2 className="text-2xl font-black text-slate-950">{feature.title}</h2>
                  <p className="text-base leading-7 text-slate-600">{feature.description}</p>
                </div>
                <div className="flex flex-col gap-2 self-start">
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Link href={feature.ctaLink} className="btn-primary whitespace-nowrap justify-center">
                      {feature.cta}
                    </Link>
                  </motion.div>
                  {feature.secondary && (
                    <Link href={feature.secondaryLink} className="text-center text-sm font-medium text-indigo-600 hover:underline">
                      {feature.secondary}
                    </Link>
                  )}
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>

        {/* Info Sidebar */}
        <motion.aside
          className="rounded-4xl border border-slate-200/70 bg-[linear-gradient(160deg,#ffffff_0%,#f8fafc_42%,#eef2ff_100%)] p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true, margin: '-50px' }}
        >
          <p className="text-sm font-semibold uppercase tracking-[0.22em] text-indigo-500">What Madeena Tex includes</p>
          <h2 className="mt-3 text-3xl font-black text-slate-950">One idea, three surfaces, shared data.</h2>
          <motion.div
            className="mt-6 space-y-4"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-50px' }}
          >
            {SYSTEM_INFO.map(([title, body]) => (
              <motion.div
                key={title}
                className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
                variants={itemVariants}
                whileHover={{ y: -2 }}
              >
                <p className="font-semibold text-slate-900">{title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{body}</p>
              </motion.div>
            ))}
          </motion.div>
          <motion.div
            className="mt-6 rounded-2xl border border-cyan-200/70 bg-cyan-50 px-4 py-4 text-sm leading-7 text-cyan-950"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            viewport={{ once: true }}
          >
            Customers are automatically taken to the gallery when they log in. Staff and management land in the operational dashboard matching their role.
          </motion.div>
        </motion.aside>
      </section>
    </main>
  )
}
