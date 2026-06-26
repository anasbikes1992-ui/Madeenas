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
  themeColor: '#3730A3',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${outfit.variable} ${firaCode.variable} font-sans dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-slate-50 dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 antialiased selection:bg-[#0052FF]/30 selection:text-white relative overflow-x-hidden">
        {/* Aurora Background Elements */}
        <div className="pointer-events-none fixed inset-0 z-[-1] overflow-hidden">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-[#0052FF]/20 dark:bg-[#0052FF]/10 blur-[120px] mix-blend-screen animate-blob" />
          <div className="absolute top-[20%] -right-[10%] w-[40%] h-[60%] rounded-full bg-[#4D7CFF]/20 dark:bg-[#4D7CFF]/10 blur-[120px] mix-blend-screen animate-blob animation-delay-2000" />
          <div className="absolute -bottom-[20%] left-[20%] w-[60%] h-[50%] rounded-full bg-[#8A2BE2]/15 dark:bg-[#8A2BE2]/10 blur-[120px] mix-blend-screen animate-blob animation-delay-4000" />
        </div>
        
        <Providers>
          {children}
          <OfflineStatus />
        </Providers>
      </body>
    </html>
  )
}

