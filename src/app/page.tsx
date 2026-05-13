'use client'

import { GoldButton } from '@/components/ui/GoldButton'
import { NavyButton } from '@/components/ui/NavyButton'
import { PremiumCard } from '@/components/ui/PremiumCard'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="min-h-screen">
      {/* Premium Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md border-b border-navy-100 shadow-md">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-navy-600 to-navy-700 flex items-center justify-center">
              <span className="text-xl font-bold text-gold-500">M</span>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-navy-600 to-navy-800 bg-clip-text text-transparent">
              Madeena Textiles
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/shop">
              <NavyButton variant="ghost" size="sm">Browse Catalog</NavyButton>
            </Link>
            <Link href="/admin/login">
              <NavyButton variant="outline" size="sm">Staff Login</NavyButton>
            </Link>
            <Link href="/customer/login">
              <GoldButton size="sm">Customer Portal</GoldButton>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy-50 via-white to-gold-50 opacity-60" />
        <div className="absolute top-20 right-10 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl animate-float" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-navy-600/10 rounded-full blur-3xl animate-float" style={{ animationDelay: '1s' }} />
        
        <div className="container mx-auto px-6 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-6xl md:text-7xl font-heading font-bold mb-6 bg-gradient-to-r from-navy-600 via-navy-700 to-gold-600 bg-clip-text text-transparent leading-tight">
              Premium Sri Lankan Textiles
            </h1>
            <p className="text-xl md:text-2xl text-navy-700/80 mb-8 leading-relaxed">
              Experience luxury fabrics with unmatched quality and elegance. 
              From traditional handloom to contemporary designs.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
              <Link href="/shop">
                <GoldButton size="lg">
                  Explore Collection
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </GoldButton>
              </Link>
              <Link href="/about">
                <NavyButton variant="outline" size="lg">Learn Our Story</NavyButton>
              </Link>
            </div>
            
            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-navy-600/70">
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
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-cream/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-heading font-bold mb-4 text-navy-700">
              Why Choose Madeena?
            </h2>
            <p className="text-lg text-navy-600/70 max-w-2xl mx-auto">
              We blend traditional Sri Lankan craftsmanship with modern technology 
              to deliver the finest textile experience.
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <PremiumCard hover>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center mb-6 shadow-gold">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-navy-700">Authentic Craftsmanship</h3>
              <p className="text-navy-600/70">
                Handpicked fabrics woven by master artisans using time-honored techniques 
                passed down through generations.
              </p>
            </PremiumCard>
            
            <PremiumCard hover>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-navy-600 to-navy-700 flex items-center justify-center mb-6 shadow-navy">
                <svg className="w-7 h-7 text-gold-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-navy-700">Quality Guaranteed</h3>
              <p className="text-navy-600/70">
                Every fabric undergoes rigorous quality control. We stand behind 
                our products with a satisfaction guarantee.
              </p>
            </PremiumCard>
            
            <PremiumCard hover>
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center mb-6 shadow-gold">
                <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold mb-3 text-navy-700">Fast Turnaround</h3>
              <p className="text-navy-600/70">
                Real-time inventory tracking and efficient order processing ensure 
                your textiles arrive when you need them.
              </p>
            </PremiumCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-navy relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gold-500 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-gold-500 rounded-full blur-3xl" />
        </div>
        
        <div className="container mx-auto px-6 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-heading font-bold mb-6 text-white">
            Ready to Experience Premium Textiles?
          </h2>
          <p className="text-xl text-gold-100 mb-8 max-w-2xl mx-auto">
            Join hundreds of satisfied customers across Sri Lanka who trust Madeena 
            for their textile needs.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/shop">
              <GoldButton size="lg">
                Start Shopping
              </GoldButton>
            </Link>
            <Link href="/contact">
              <NavyButton variant="outline" size="lg" className="border-white text-white hover:bg-white/10">
                Contact Sales
              </NavyButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-navy-900 text-white py-12">
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
                <li><Link href="/shop" className="hover:text-gold-500 transition">Browse Catalog</Link></li>
                <li><Link href="/about" className="hover:text-gold-500 transition">About Us</Link></li>
                <li><Link href="/contact" className="hover:text-gold-500 transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Customer Service</h4>
              <ul className="space-y-2 text-sm text-navy-200">
                <li><Link href="/help" className="hover:text-gold-500 transition">Help Center</Link></li>
                <li><Link href="/returns" className="hover:text-gold-500 transition">Returns & Refunds</Link></li>
                <li><Link href="/shipping" className="hover:text-gold-500 transition">Shipping Info</Link></li>
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
