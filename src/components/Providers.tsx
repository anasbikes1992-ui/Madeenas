'use client'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from 'next-themes'
import { Toaster } from 'sonner'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        {children}
        <Toaster position="bottom-right" richColors closeButton />
      </SessionProvider>
    </ThemeProvider>
  )
}
