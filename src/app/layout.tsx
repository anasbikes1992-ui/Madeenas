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
    <html lang="en" className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-text antialiased selection:bg-accent-soft selection:text-text">
        <Providers>
          {children}
          <OfflineStatus />
        </Providers>
      </body>
    </html>
  )
}

