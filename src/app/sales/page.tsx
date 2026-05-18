'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { GoldButton } from '@/components/ui/GoldButton'
import { NavyButton } from '@/components/ui/NavyButton'
import { PremiumCard } from '@/components/ui/PremiumCard'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const pageIn = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } },
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
}

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE } },
}

export default function SalesLandingPage() {
  return (
    <motion.div
      variants={pageIn}
      initial="hidden"
      animate="visible"
      className="min-h-screen bg-[radial-gradient(circle_at_8%_20%,rgba(212,175,55,0.2),transparent_24%),radial-gradient(circle_at_85%_15%,rgba(59,130,246,0.2),transparent_28%),linear-gradient(180deg,#070b1a_0%,#0b1534_45%,#10204b_100%)] px-6 py-14 text-slate-100 lg:px-10"
    >
      <motion.section variants={stagger} initial="hidden" animate="visible" className="mx-auto max-w-7xl">
        <motion.div variants={fadeUp} className="mb-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-300">Customer Sales</p>
            <h1 className="mt-3 bg-gradient-to-r from-white via-gold-100 to-gold-300 bg-clip-text text-4xl font-black text-transparent md:text-5xl">
              Sales Interaction Hub
            </h1>
            <p className="mt-4 max-w-3xl text-slate-200/85">
              Start from the visual gallery, move into customer product selection, and complete ordering from cart checkout.
            </p>
          </div>
          <Link href="/">
            <NavyButton variant="outline" className="border-white/50 text-white hover:bg-white/10">Back to Home</NavyButton>
          </Link>
        </motion.div>

        <motion.div variants={stagger} className="grid gap-6 md:grid-cols-3">
          <motion.div variants={fadeUp}>
            <PremiumCard hover className="h-full border border-white/20 bg-white/10 text-slate-100 backdrop-blur">
              <div className="mb-4 inline-flex rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-950">
                Step 1
              </div>
              <h2 className="text-2xl font-bold text-white">Browse Gallery</h2>
              <p className="mt-3 text-sm leading-6 text-slate-200/85">
                Explore styles, colors, and categories with quick inquiry actions.
              </p>
              <div className="mt-6">
                <Link href="/gallery">
                  <GoldButton className="w-full justify-center">Open Gallery</GoldButton>
                </Link>
              </div>
            </PremiumCard>
          </motion.div>

          <motion.div variants={fadeUp}>
            <PremiumCard hover className="h-full border border-white/20 bg-white/10 text-slate-100 backdrop-blur">
              <div className="mb-4 inline-flex rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-950">
                Step 2
              </div>
              <h2 className="text-2xl font-bold text-white">Select Products</h2>
              <p className="mt-3 text-sm leading-6 text-slate-200/85">
                Customer-facing product catalog with search and cart actions.
              </p>
              <div className="mt-6">
                <Link href="/customer/products">
                  <GoldButton className="w-full justify-center">Go to Products</GoldButton>
                </Link>
              </div>
            </PremiumCard>
          </motion.div>

          <motion.div variants={fadeUp}>
            <PremiumCard hover className="h-full border border-white/20 bg-white/10 text-slate-100 backdrop-blur">
              <div className="mb-4 inline-flex rounded-full bg-gold-500 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-slate-950">
                Step 3
              </div>
              <h2 className="text-2xl font-bold text-white">Review Cart</h2>
              <p className="mt-3 text-sm leading-6 text-slate-200/85">
                Confirm quantities and proceed to checkout.
              </p>
              <div className="mt-6">
                <Link href="/customer/cart">
                  <GoldButton className="w-full justify-center">Open Cart</GoldButton>
                </Link>
              </div>
            </PremiumCard>
          </motion.div>
        </motion.div>
      </motion.section>
    </motion.div>
  )
}
