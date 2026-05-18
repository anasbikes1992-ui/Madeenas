import type { Metadata, Viewport } from 'next'
import { Inter, Manrope } from 'next/font/google'
import Providers from '@/components/Providers'
import OfflineStatus from '@/components/OfflineStatus'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })

export const metadata: Metadata = {
  title: {
    default: 'Madeena Tex — Raw Materials Management',
    template: '%s | Madeena Tex',
  },
  description: 'Professional textile raw materials stock management system for warehouses and shops.',
  manifest: '/manifest.json',
  keywords: ['textile', 'stock management', 'warehouse', 'inventory', 'raw materials'],
  authors: [{ name: 'Madeena Tex' }],
  robots: 'index, follow',
}

export const viewport: Viewport = {
  themeColor: '#3730A3',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen bg-[radial-gradient(circle_at_top_right,rgba(30,64,175,0.08),transparent_28%),radial-gradient(circle_at_15%_15%,rgba(212,175,55,0.12),transparent_26%),linear-gradient(180deg,#f8fafc_0%,#ffffff_42%,#eef4ff_100%)] text-slate-900 antialiased selection:bg-gold-400 selection:text-navy-950">
        <Providers>
          {children}
          <OfflineStatus />
        </Providers>
      </body>
    </html>
  )
}

