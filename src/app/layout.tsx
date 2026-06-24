import type { Metadata, Viewport } from 'next'
import { Inter, Manrope, Playfair_Display } from 'next/font/google'
import Providers from '@/components/Providers'
import OfflineStatus from '@/components/OfflineStatus'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })
const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' })
const playfair = Playfair_Display({ 
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-playfair'
})

export const metadata: Metadata = {
  title: {
    default: 'Nexus Inventory — Raw Materials Management',
    template: '%s | Nexus Inventory',
  },
  description: 'Nexus Inventory — professional inventory and stock management for modern businesses.',
  manifest: '/manifest.json',
  keywords: ['inventory', 'stock management', 'warehouse', 'operations', 'catalog'],
  authors: [{ name: 'Nexus Inventory' }],
  robots: 'index, follow',
}

export const viewport: Viewport = {
  themeColor: '#3730A3',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} ${playfair.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-bg text-text antialiased selection:bg-accent-soft selection:text-text">
        <Providers>
          {children}
          <OfflineStatus />
        </Providers>
      </body>
    </html>
  )
}

