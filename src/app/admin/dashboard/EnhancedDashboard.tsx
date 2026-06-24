/**
 * Enhanced Premium Admin Dashboard
 * Luxury textile-inspired design with sophisticated animations
 */

'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Clock, AlertTriangle, ShoppingBag, TrendingUp, Activity } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { StatCard } from '@/components/ui/StatCard'
import { LuxuryButton } from '@/components/ui/LuxuryButton'
import { GlassCard } from '@/components/ui/GlassCard'
import { pageTransition, staggerContainer, fadeUp } from '@/lib/animations'

interface DashboardStats {
  totalProducts: number
  totalLocations: number
  pendingRequests: number
  newCustomerOrders: number
  lowStockCount: number
  totalStockUnits: number
  recentStockIns: any[]
  recentStockOuts: any[]
  lowStockItems: any[]
}

const STATUS_CLASSES: Record<string, { bg: string; text: string; border: string }> = {
  PENDING: { bg: 'bg-semantic-warning/10', text: 'text-semantic-warning', border: 'border-semantic-warning/30' },
  APPROVED: { bg: 'bg-primary/10', text: 'text-primary', border: 'border-primary/30' },
  DISPATCHED: { bg: 'bg-accent-indigo/10', text: 'text-accent-indigo', border: 'border-accent-indigo/30' },
  ACKNOWLEDGED: { bg: 'bg-semantic-success/10', text: 'text-semantic-success', border: 'border-semantic-success/30' },
  REJECTED: { bg: 'bg-semantic-error/10', text: 'text-semantic-error', border: 'border-semantic-error/30' },
}

export default function EnhancedDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [approving, setApproving] = useState<Set<string>>(new Set())

  async function loadStats() {
    setError(null)
    try {
      const r = await fetch('/api/dashboard')
      if (!r.ok) throw new Error(`Dashboard API error: ${r.status}`)
      const data = await r.json()
      setStats(data)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadStats() }, [])

  async function handleApprove(id: string) {
    setApproving(prev => new Set(prev).add(id))
    await fetch(`/api/stock-out/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'approve' }),
    })
    setApproving(prev => { const next = new Set(prev); next.delete(id); return next })
    void loadStats()
  }

  async function handleReject(id: string) {
    setApproving(prev => new Set(prev).add(id))
    await fetch(`/api/stock-out/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject', rejectionReason: 'Rejected from dashboard' }),
    })
    setApproving(prev => { const next = new Set(prev); next.delete(id); return next })
    void loadStats()
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, ease: 'linear', repeat: Infinity }}
          className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent"
        />
      </div>
    )
  }

  if (error) {
    return (
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={pageTransition}
        className="flex h-[60vh] flex-col items-center justify-center gap-4"
      >
        <div className="rounded-xl bg-semantic-error/10 p-4 border border-semantic-error/30">
          <p className="text-semantic-error">{error}</p>
        </div>
        <LuxuryButton onClick={loadStats}>Retry</LuxuryButton>
      </motion.div>
    )
  }

  if (!stats) return null

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={pageTransition}
      className="space-y-8 p-8"
    >
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading text-4xl font-bold tracking-tight text-text-primary mb-2">
            Dashboard Overview
          </h1>
          <p className="text-text-secondary">
            Welcome back. Here's what's happening with your textile inventory.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 3, ease: 'linear', repeat: Infinity }}
            className="h-2 w-2 rounded-full bg-semantic-success"
          />
          <span className="text-sm text-text-secondary">Live</span>
        </div>
      </div>

      {/* Stats Grid */}
      <motion.div
        variants={staggerContainer}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4"
      >
        <StatCard
          label="Total Products"
          value={stats.totalProducts}
          Icon={Package}
          description="Active SKUs"
          variant="indigo"
          onClick={() => window.location.href = '/admin/products'}
        />
        <StatCard
          label="Pending Requests"
          value={stats.pendingRequests}
          Icon={Clock}
          description="Awaiting approval"
          variant="saffron"
          trend={stats.pendingRequests > 0 ? { value: 'Action required', direction: 'neutral' } : undefined}
          onClick={() => window.location.href = '/admin/stock-out'}
        />
        <StatCard
          label="Low Stock Items"
          value={stats.lowStockCount}
          Icon={AlertTriangle}
          description="Need restocking"
          variant="rose"
          trend={stats.lowStockCount > 0 ? { value: 'Critical', direction: 'down' } : undefined}
        />
        <StatCard
          label="Customer Orders"
          value={stats.newCustomerOrders}
          Icon={ShoppingBag}
          description="New inquiries"
          variant="emerald"
          onClick={() => window.location.href = '/admin/customer-orders'}
        />
      </motion.div>

      {/* Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Pending Requests */}
        <GlassCard padding="lg">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-1">
                Pending Requests
              </h2>
              <p className="text-sm text-text-secondary">
                {stats.pendingRequests} awaiting your action
              </p>
            </div>
            <div className="rounded-lg bg-semantic-warning/15 p-3">
              <Clock className="h-5 w-5 text-semantic-warning" />
            </div>
          </div>

          <motion.div variants={staggerContainer} className="space-y-3">
            <AnimatePresence mode="popLayout">
              {stats.recentStockOuts.slice(0, 5).map((req: any) => {
                const statusStyle = STATUS_CLASSES[req.status] || STATUS_CLASSES.PENDING
                return (
                  <motion.div
                    key={req.id}
                    variants={fadeUp}
                    layout
                    className="group rounded-lg border border-border-base bg-surface-elevated/50 p-4 transition-all hover:border-border-accent hover:bg-surface-card"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="font-medium text-text-primary">
                            {req.requestedBy?.name || 'Unknown'}
                          </span>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}>
                            {req.status}
                          </span>
                        </div>
                        <p className="text-sm text-text-secondary">
                          {req.destination?.name} • {formatDate(req.createdAt)}
                        </p>
                      </div>
                      {req.status === 'PENDING' && (
                        <div className="flex gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                          <LuxuryButton
                            size="sm"
                            variant="secondary"
                            onClick={() => handleApprove(req.id)}
                            loading={approving.has(req.id)}
                          >
                            Approve
                          </LuxuryButton>
                          <LuxuryButton
                            size="sm"
                            variant="danger"
                            onClick={() => handleReject(req.id)}
                            loading={approving.has(req.id)}
                          >
                            Reject
                          </LuxuryButton>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </motion.div>

          {stats.pendingRequests === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-semantic-success/10 p-4">
                <Activity className="h-8 w-8 text-semantic-success" />
              </div>
              <p className="text-text-secondary">All caught up! No pending requests.</p>
            </div>
          )}
        </GlassCard>

        {/* Low Stock Alert */}
        <GlassCard padding="lg" variant="bordered">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-1">
                Low Stock Alert
              </h2>
              <p className="text-sm text-text-secondary">
                {stats.lowStockCount} items need attention
              </p>
            </div>
            <div className="rounded-lg bg-semantic-error/15 p-3">
              <AlertTriangle className="h-5 w-5 text-semantic-error" />
            </div>
          </div>

          <motion.div variants={staggerContainer} className="space-y-3">
            {stats.lowStockItems.slice(0, 5).map((item: any) => (
              <motion.div
                key={item.id}
                variants={fadeUp}
                className="group rounded-lg border border-border-base bg-surface-elevated/50 p-4 transition-all hover:border-semantic-error/30 hover:bg-surface-card"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-text-primary mb-1">{item.name}</p>
                    <p className="text-sm text-text-secondary">
                      SKU: {item.sku} • Only {item.totalStock} units left
                    </p>
                  </div>
                  <div className="rounded-lg bg-semantic-error/10 px-3 py-1 text-sm font-semibold text-semantic-error">
                    {item.totalStock}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          {stats.lowStockCount === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-semantic-success/10 p-4">
                <TrendingUp className="h-8 w-8 text-semantic-success" />
              </div>
              <p className="text-text-secondary">Stock levels are healthy!</p>
            </div>
          )}
        </GlassCard>
      </div>
    </motion.div>
  )
}
