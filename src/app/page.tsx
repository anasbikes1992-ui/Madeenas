import HomeLandingPage from '@/components/landing/HomeLandingPage'

export default function HomePage() {
  return <HomeLandingPage />
}
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
