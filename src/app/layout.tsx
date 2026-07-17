import type { Metadata, Viewport } from 'next'
import { Outfit, Fira_Code } from 'next/font/google'
import Providers from '@/components/Providers'
import OfflineStatus from '@/components/OfflineStatus'
import './globals.css'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })
const firaCode = Fira_Code({ subsets: ['latin'], variable: '--font-fira-code' })

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
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F6F7F9' },
    { media: '(prefers-color-scheme: dark)', color: '#0B0F19' },
  ],
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // No hardcoded `dark` class here: next-themes owns the theme and setting it
    // statically fought the user's own toggle.
    <html
      lang="en"
      className={`${outfit.variable} ${firaCode.variable} font-sans`}
      suppressHydrationWarning
    >
      {/*
        Colours come from the design tokens in globals.css rather than hardcoded
        slate/hex values, so the whole app follows one palette and the theme
        toggle actually reaches every surface.

        The three blurred, infinitely animating "aurora" gradient blobs that used
        to sit behind everything are gone: they burned GPU on every screen for
        decoration, and a stock-management tool reads as more trustworthy without
        them.
      */}
      <body className="relative min-h-screen overflow-x-hidden bg-[var(--bg)] text-[var(--text-primary)] antialiased">
        <Providers>
          {children}
          <OfflineStatus />
        </Providers>
      </body>
    </html>
  )
}

