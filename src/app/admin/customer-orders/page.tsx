'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

const STATUS_BADGE: Record<string, string> = {
  NEW: 'badge-purple',
  REVIEWED: 'badge-blue',
  QUOTED: 'badge-teal',
  CONFIRMED: 'badge-green',
  CLOSED: 'badge-gray',
}

export default function CustomerOrdersPage() {
  const [orders, setOrders] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<any>(null)

  async function load() {
    const res = await fetch('/api/gallery')
    // Use the gallery endpoint to get categories but orders need admin API
    const res2 = await fetch('/api/stock-out?status=') // we'll need a dedicated endpoint
    setLoading(false)
    // For now, show orders from local state
  }

  useEffect(() => {
    fetch('/api/stock-out?limit=100')
    setLoading(false)
  }, [])

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Order Requests</h1>
        <p className="text-sm text-slate-500">Inquiries submitted from the public gallery</p>
      </div>

      <div className="card text-center py-16">
        <div className="text-5xl mb-4">🛍️</div>
        <h2 className="text-xl font-bold text-slate-700 mb-2">Customer Inquiries</h2>
        <p className="text-slate-500 mb-6">When customers submit orders from the gallery, they will appear here.</p>
        <a href="/gallery" target="_blank" className="btn-primary">View Customer Gallery →</a>
      </div>
    </div>
  )
}
