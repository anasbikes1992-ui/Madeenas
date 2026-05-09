'use client'
import { useState, useEffect } from 'react'

export default function OfflineStatus() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    const handleOnline = () => setIsOffline(false)
    const handleOffline = () => setIsOffline(true)

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setTimeout(() => setIsOffline(true), 0)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-2 rounded-full shadow-2xl flex items-center gap-3 animate-bounce">
      <span className="text-lg">📵</span>
      <div className="text-sm font-bold">
        You are currently offline. Some features may be limited.
      </div>
    </div>
  )
}
