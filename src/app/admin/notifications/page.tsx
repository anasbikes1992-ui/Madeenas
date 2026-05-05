'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

type NotificationItem = {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  link?: string | null
  createdAt: string
}

const TYPE_STYLES: Record<string, string> = {
  SUCCESS: 'badge-green',
  WARNING: 'badge-amber',
  DANGER: 'badge-red',
  INFO: 'badge-indigo',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadOnly, setUnreadOnly] = useState(false)

  async function load() {
    setLoading(true)
    const params = new URLSearchParams({ page: '1', limit: '100' })
    if (unreadOnly) params.set('unreadOnly', '1')

    const res = await fetch(`/api/notifications?${params.toString()}`)
    const data = await res.json()
    setNotifications(data.notifications || [])
    setLoading(false)
  }

  useEffect(() => {
    load()
  }, [unreadOnly])

  async function markAsRead(id?: string) {
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    load()
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Notifications</h1>
          <p className="text-sm text-slate-500">Track approvals, dispatches, finance review events, and user alerts</p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setUnreadOnly(false)}
            className={`btn-sm ${!unreadOnly ? 'btn-primary' : 'btn-secondary'}`}
          >
            All
          </button>
          <button
            onClick={() => setUnreadOnly(true)}
            className={`btn-sm ${unreadOnly ? 'btn-primary' : 'btn-secondary'}`}
          >
            Unread
          </button>
          <button onClick={() => markAsRead()} className="btn-secondary btn-sm">
            Mark all as read
          </button>
        </div>
      </div>

      <div className="space-y-3">
        {loading ? (
          [...Array(5)].map((_, i) => (
            <div key={i} className="card h-24 animate-pulse bg-slate-100" />
          ))
        ) : notifications.length === 0 ? (
          <div className="card text-center py-14">
            <div className="text-5xl mb-3">🔔</div>
            <p className="text-slate-500">No notifications found for this filter.</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div key={n.id} className={`card border ${n.isRead ? 'border-slate-100' : 'border-indigo-200 bg-indigo-50/40'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900">{n.title}</p>
                    <span className={TYPE_STYLES[n.type] || 'badge-gray'}>{n.type}</span>
                    {!n.isRead && <span className="badge-indigo">NEW</span>}
                  </div>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="text-xs text-slate-400">{formatDate(n.createdAt, { dateStyle: 'medium', timeStyle: 'short' } as any)}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {!n.isRead && (
                    <button onClick={() => markAsRead(n.id)} className="btn-secondary btn-sm">Mark read</button>
                  )}
                  {n.link && (
                    <a href={n.link} className="btn-primary btn-sm">Open</a>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
