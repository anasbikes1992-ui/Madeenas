'use client'

import { GoldButton } from '@/components/ui/GoldButton'
import { NavyButton } from '@/components/ui/NavyButton'
import { PremiumCard } from '@/components/ui/PremiumCard'
import Link from 'next/link'
import { motion } from 'framer-motion'

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1]

const fadeInUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } }
}

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } }
}

const scaleIn = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: EASE } }
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(212,175,55,0.22),transparent_28%),radial-gradient(circle_at_15%_20%,rgba(59,130,246,0.16),transparent_32%),linear-gradient(180deg,#070b1a_0%,#0b1430_48%,#0f1d45_100%)] text-slate-100">
      {/* Premium Navigation */}
      <motion.nav 
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: EASE }}
        className="fixed top-0 left-0 right-0 z-50 border-b border-navy-200/20 bg-slate-950/70 backdrop-blur-md shadow-premium"
      >
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-linear-to-br from-navy-600 to-navy-700 flex items-center justify-center">
              <span className="text-xl font-bold text-gold-500">M</span>
            </div>
            <h1 className="text-2xl font-bold bg-linear-to-r from-gold-300 via-gold-400 to-gold-500 bg-clip-text text-transparent">
              Madeena Textiles
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/sales">
              <NavyButton variant="ghost" size="sm" className="text-gold-200 hover:bg-gold-500/10 hover:text-gold-100">Sales Hub</NavyButton>
            </Link>
            <Link href="/gallery">
              <NavyButton variant="ghost" size="sm" className="text-slate-100 hover:bg-white/10 hover:text-white">Browse Catalog</NavyButton>
            </Link>
            <Link href="/login">
              <NavyButton variant="outline" size="sm" className="border-slate-200/60 text-slate-100 hover:bg-white/10 hover:text-white">Staff Login</NavyButton>
            </Link>
            <Link href="/customer/login">
              <GoldButton size="sm">Customer Portal</GoldButton>
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-32 pb-24">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[linear-gradient(160deg,rgba(8,14,35,0.95)_0%,rgba(17,30,68,0.92)_55%,rgba(12,20,45,0.96)_100%)]" />
        <motion.div 
          className="absolute top-20 right-10 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl"
          animate={{ 
            y: [0, 30, 0],
            scale: [1, 1.1, 1] 
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div 
          className="absolute bottom-10 left-10 w-80 h-80 bg-navy-600/10 rounded-full blur-3xl"
          animate={{ 
            y: [0, -30, 0],
            scale: [1, 1.15, 1] 
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        />
        
        <div className="container mx-auto px-6 relative z-10">
          <motion.div 
            className="max-w-4xl mx-auto text-center"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            <motion.h1 
              variants={fadeInUp}
              className="mb-6 bg-linear-to-r from-white via-gold-100 to-gold-300 bg-clip-text text-6xl font-heading font-bold leading-tight text-transparent md:text-7xl lg:text-8xl"
            >
              Premium Sri Lankan Textiles
            </motion.h1>
            <motion.p 
              variants={fadeInUp}
              className="mb-10 text-xl leading-relaxed text-slate-200/90 md:text-2xl"
            >
              Experience luxury fabrics with unmatched quality and elegance. 
              From traditional handloom to contemporary designs.
            </motion.p>
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Link href="/gallery">
                <GoldButton size="lg">
                  Explore Collection
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </GoldButton>
              </Link>
              <Link href="/gallery#workflow">
                <NavyButton variant="outline" size="lg">How It Works</NavyButton>
              </Link>
            </motion.div>
            
            {/* Trust Badges */}
            <motion.div 
              variants={fadeInUp}
              className="flex flex-wrap items-center justify-center gap-8 text-sm text-slate-300/90"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <span>Premium Quality</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                <span>Secure Transactions</span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-gold-500" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
                  <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
                </svg>
                <span>Island-wide Delivery</span>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-[linear-gradient(180deg,rgba(8,13,32,0.85)_0%,rgba(12,21,49,0.95)_100%)] py-24">
        <div className="container mx-auto px-6">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 
              variants={fadeInUp}
              className="mb-6 text-4xl font-heading font-bold text-white md:text-5xl"
            >
              Why Choose Madeena?
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="mx-auto max-w-2xl text-lg text-slate-200/80"
            >
              We blend traditional Sri Lankan craftsmanship with modern technology 
              to deliver the finest textile experience.
            </motion.p>
          </motion.div>
          
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="grid md:grid-cols-3 gap-8"
          >
            <motion.div variants={scaleIn}>
              <PremiumCard hover>
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-gold-500 to-gold-600 flex items-center justify-center mb-6 shadow-gold">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-navy-700">Premium Quality</h3>
                <p className="text-navy-600/70">
                  Sourced from the finest mills, every fabric meets our stringent quality standards for excellence.
                </p>
              </PremiumCard>
            </motion.div>
            
            <motion.div variants={scaleIn}>
              <PremiumCard hover>
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-navy-600 to-navy-700 flex items-center justify-center mb-6 shadow-premium">
                  <svg className="w-7 h-7 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-navy-700">Authentic Craftsmanship</h3>
                <p className="text-navy-600/70">
                  Handpicked fabrics woven by master artisans using time-honored techniques passed down through generations.
                </p>
              </PremiumCard>
            </motion.div>
            
            <motion.div variants={scaleIn}>
              <PremiumCard hover>
                <div className="w-14 h-14 rounded-xl bg-linear-to-br from-gold-500 to-gold-600 flex items-center justify-center mb-6 shadow-gold">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold mb-3 text-navy-700">Fast Turnaround</h3>
                <p className="text-navy-600/70">
                  Quick delivery without compromising quality. Your fabrics arrive when you need them.
                </p>
              </PremiumCard>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative overflow-hidden bg-[linear-gradient(140deg,#101a45_0%,#0a1230_55%,#050b1c_100%)] py-24">
        <motion.div 
          className="absolute inset-0 opacity-20"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 0.2 }}
          viewport={{ once: true }}
          transition={{ duration: 1 }}
        >
          <motion.div 
            className="absolute top-0 left-1/4 w-96 h-96 bg-gold-500 rounded-full blur-3xl"
            animate={{ scale: [1, 1.2, 1], x: [0, 50, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div 
            className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500 rounded-full blur-3xl"
            animate={{ scale: [1, 1.3, 1], x: [0, -50, 0] }}
            transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          />
        </motion.div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 
              variants={fadeInUp}
              className="text-4xl md:text-5xl font-heading font-bold text-white mb-6"
            >
              Ready to Experience Premium Textiles?
            </motion.h2>
            <motion.p 
              variants={fadeInUp}
              className="text-xl text-gold-100 mb-10 max-w-2xl mx-auto"
            >
              Join hundreds of satisfied customers across Sri Lanka who trust Madeena for their textile needs.
            </motion.p>
            <motion.div 
              variants={fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Link href="/customer/products">
                <GoldButton size="lg">Browse Products</GoldButton>
              </Link>
              <Link href="/customer/signup">
                <NavyButton size="lg">Create Customer Account</NavyButton>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-950/90 py-12 text-white">
        <div className="container mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <h3 className="text-lg font-bold mb-4 text-gold-500">Madeena Textiles</h3>
              <p className="text-sm text-navy-200">
                Premium Sri Lankan textiles since 1995. Quality, tradition, and excellence in every thread.
              </p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm text-navy-200">
                <li><Link href="/gallery" className="hover:text-gold-500 transition">Browse Catalog</Link></li>
                <li><Link href="/gallery#workflow" className="hover:text-gold-500 transition">How It Works</Link></li>
                <li><Link href="/customer/signup" className="hover:text-gold-500 transition">Get Started</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Customer Service</h4>
              <ul className="space-y-2 text-sm text-navy-200">
                <li><Link href="/customer/login" className="hover:text-gold-500 transition">Customer Portal</Link></li>
                <li><Link href="/customer/returns" className="hover:text-gold-500 transition">Returns & Refunds</Link></li>
                <li><Link href="/gallery" className="hover:text-gold-500 transition">Delivery Info</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm text-navy-200">
                <li>📞 +94 11 234 5678</li>
                <li>📧 info@madeenatextiles.lk</li>
                <li>📍 Colombo, Sri Lanka</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-navy-700 pt-6 text-center text-sm text-navy-300">
            <p>&copy; {new Date().getFullYear()} Madeena Textiles. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
