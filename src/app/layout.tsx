import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import Providers from '@/components/Providers'
import OfflineStatus from '@/components/OfflineStatus'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

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
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        <Providers>
          {children}
          <OfflineStatus />
        </Providers>
      </body>
    </html>
  )
}

