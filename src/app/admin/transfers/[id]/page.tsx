'use client'
import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, ArrowRight, CheckCircle, XCircle, Truck,
  PackageCheck, Clock, AlertCircle, User, Calendar,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface TransferItem {
  id: string
  variantId: string
  requestedQty: number
  variant?: {
    id: string
    sku: string
    colorName: string
    stockUnitLabel?: string
    product?: { name: string }
  }
}

interface StockTransfer {
  id: string
  transferNo: string
  status: string
  fromLocation: { id: string; name: string }
  toLocation: { id: string; name: string }
  requestedByUser: { id: string; name: string; role: string }
  items: TransferItem[]
  note?: string
  createdAt: string
  approvedAt?: string
  dispatchedAt?: string
  receivedAt?: string
  approvedBy?: string
  dispatchedBy?: string
  receivedBy?: string
}

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 border border-blue-200',
  DISPATCHED: 'bg-orange-100 text-orange-800 border border-orange-200',
  RECEIVED: 'bg-green-100 text-green-800 border border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border border-gray-200',
}

const STATUS_ICON: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-4 w-4" />,
  APPROVED: <CheckCircle className="h-4 w-4" />,
  DISPATCHED: <Truck className="h-4 w-4" />,
  RECEIVED: <PackageCheck className="h-4 w-4" />,
  CANCELLED: <XCircle className="h-4 w-4" />,
}

export default function TransferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  const [transfer, setTransfer] = useState<StockTransfer | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null)

  function showToast(msg: string, type: 'success' | 'error' | 'info' = 'info') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 5000)
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/transfers?page=1&limit=200')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      const found = (data.requests || []).find((t: StockTransfer) => t.id === id)
      if (found) {
        setTransfer(found)
      } else {
        setNotFound(true)
      }
    } catch {
      showToast('Failed to load transfer details.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  async function performAction(action: string, label: string) {
    setActionLoading(action)
    try {
      const res = await fetch(`/api/transfers/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Action failed')
      }
      showToast(`Transfer ${label} successfully!`, 'success')
      await load()
    } catch (err: any) {
      showToast('Error: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setActionLoading(null)
    }
  }

  const toastStyles = {
    success: 'bg-green-50 border-green-200 text-green-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    info: 'bg-indigo-50 border-indigo-200 text-indigo-700',
  }

  // Timeline steps
  const timeline = transfer ? [
    {
      label: 'Requested',
      date: transfer.createdAt,
      active: true,
      icon: <Clock className="h-3.5 w-3.5" />,
      color: 'bg-slate-500',
    },
    {
      label: 'Approved',
      date: transfer.approvedAt,
      active: !!transfer.approvedAt,
      icon: <CheckCircle className="h-3.5 w-3.5" />,
      color: 'bg-blue-500',
    },
    {
      label: 'Dispatched',
      date: transfer.dispatchedAt,
      active: !!transfer.dispatchedAt,
      icon: <Truck className="h-3.5 w-3.5" />,
      color: 'bg-orange-500',
    },
    {
      label: 'Received',
      date: transfer.receivedAt,
      active: !!transfer.receivedAt,
      icon: <PackageCheck className="h-3.5 w-3.5" />,
      color: 'bg-green-500',
    },
  ] : []

  if (loading) {
    return (
      <div className="space-y-6 fade-in max-w-4xl">
        <div className="flex items-center gap-4">
          <div className="h-9 w-9 bg-slate-100 rounded-lg animate-pulse" />
          <div className="space-y-2">
            <div className="h-6 w-48 bg-slate-100 rounded animate-pulse" />
            <div className="h-4 w-32 bg-slate-100 rounded animate-pulse" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-5 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !transfer) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4 text-slate-400">
        <XCircle className="h-14 w-14 opacity-30" />
        <p className="text-lg font-semibold text-slate-600">Transfer not found</p>
        <p className="text-sm">The transfer with ID <code className="font-mono text-xs bg-slate-100 px-1.5 py-0.5 rounded">{id}</code> does not exist.</p>
        <button onClick={() => router.push('/admin/transfers')} className="btn-secondary mt-2">
          Back to Transfers
        </button>
      </div>
    )
  }

  const canAct = !['CANCELLED', 'RECEIVED'].includes(transfer.status)

  return (
    <div className="space-y-6 fade-in max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/admin/transfers')}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900 font-mono">{transfer.transferNo}</h1>
              <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[transfer.status] ?? 'bg-gray-100 text-gray-600'}`}>
                {STATUS_ICON[transfer.status]}
                {transfer.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5" />
              Created by {transfer.requestedByUser?.name ?? '—'} on {formatDate(transfer.createdAt)}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {canAct && (
          <div className="flex items-center gap-2.5 flex-wrap">
            {transfer.status === 'PENDING' && (
              <>
                <button
                  onClick={() => performAction('approve', 'approved')}
                  disabled={actionLoading !== null}
                  className="btn-primary flex items-center gap-2"
                >
                  {actionLoading === 'approve' ? (
                    <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <CheckCircle className="h-4 w-4" />
                  )}
                  Approve
                </button>
                <button
                  onClick={() => performAction('cancel', 'cancelled')}
                  disabled={actionLoading !== null}
                  className="btn-secondary flex items-center gap-2 text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                >
                  {actionLoading === 'cancel' ? (
                    <div className="h-4 w-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  Cancel
                </button>
              </>
            )}

            {transfer.status === 'APPROVED' && (
              <button
                onClick={() => performAction('dispatch', 'dispatched')}
                disabled={actionLoading !== null}
                className="btn-primary flex items-center gap-2"
              >
                {actionLoading === 'dispatch' ? (
                  <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Truck className="h-4 w-4" />
                )}
                Dispatch Transfer
              </button>
            )}

            {transfer.status === 'DISPATCHED' && (
              <button
                onClick={() => performAction('acknowledge', 'received')}
                disabled={actionLoading !== null}
                className="btn-primary flex items-center gap-2"
              >
                {actionLoading === 'acknowledge' ? (
                  <div className="h-4 w-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <PackageCheck className="h-4 w-4" />
                )}
                Mark as Received
              </button>
            )}
          </div>
        )}
      </div>

      {/* Toast */}
      {toast && (
        <div className={`p-4 border rounded-xl text-sm font-medium flex items-start gap-2.5 ${toastStyles[toast.type]}`}>
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {toast.msg}
        </div>
      )}

      {/* Transfer Summary Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Transfer Summary</h2>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Route */}
          <div className="sm:col-span-2">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-2">Route</p>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-400 font-medium">From</p>
                <p className="text-base font-bold text-slate-800">{transfer.fromLocation?.name}</p>
              </div>
              <ArrowRight className="h-5 w-5 text-indigo-400 flex-shrink-0" />
              <div className="px-4 py-2.5 bg-indigo-50 border border-indigo-200 rounded-xl">
                <p className="text-xs text-indigo-400 font-medium">To</p>
                <p className="text-base font-bold text-indigo-900">{transfer.toLocation?.name}</p>
              </div>
            </div>
          </div>

          {/* Note */}
          {transfer.note && (
            <div className="sm:col-span-2">
              <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1.5">Note</p>
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">{transfer.note}</p>
            </div>
          )}
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Status Timeline</h2>
        </div>
        <div className="p-6">
          <div className="flex items-start gap-0 flex-wrap sm:flex-nowrap">
            {timeline.map((step, i) => (
              <div key={step.label} className="flex flex-col items-center flex-1 min-w-[80px]">
                {/* Dot + line */}
                <div className="flex items-center w-full">
                  {i > 0 && (
                    <div className={`flex-1 h-0.5 ${timeline[i - 1].active ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                  )}
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white transition-all ${
                    step.active ? step.color : 'bg-slate-200'
                  }`}>
                    {step.icon}
                  </div>
                  {i < timeline.length - 1 && (
                    <div className={`flex-1 h-0.5 ${step.active && timeline[i + 1].active ? 'bg-indigo-300' : 'bg-slate-200'}`} />
                  )}
                </div>
                <div className="text-center mt-2">
                  <p className={`text-xs font-semibold ${step.active ? 'text-slate-800' : 'text-slate-300'}`}>
                    {step.label}
                  </p>
                  {step.date && (
                    <p className="text-xs text-slate-400 mt-0.5">{formatDate(step.date)}</p>
                  )}
                </div>
              </div>
            ))}

            {/* Cancelled pill if applicable */}
            {transfer.status === 'CANCELLED' && (
              <div className="w-full mt-3 sm:mt-0 sm:flex-1 flex flex-col items-center">
                <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-white">
                  <XCircle className="h-3.5 w-3.5" />
                </div>
                <p className="text-xs font-semibold text-gray-400 mt-2">Cancelled</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <h2 className="font-semibold text-slate-700 text-sm uppercase tracking-wide">Transfer Items</h2>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {transfer.items?.length ?? 0} item{(transfer.items?.length ?? 0) !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">SKU</th>
                <th className="px-4 py-3 font-medium">Color</th>
                <th className="px-4 py-3 font-medium text-right">Requested Qty</th>
                <th className="px-4 py-3 font-medium">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {transfer.items?.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-slate-400 text-sm">
                    No items in this transfer.
                  </td>
                </tr>
              ) : (
                transfer.items?.map(item => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-800">
                        {item.variant?.product?.name ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                        {item.variant?.sku ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-slate-600">{item.variant?.colorName ?? '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-slate-900">{item.requestedQty}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">
                        {item.variant?.stockUnitLabel ?? 'units'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Transfer #', value: transfer.transferNo, mono: true },
          { label: 'Status', value: transfer.status },
          { label: 'Created', value: formatDate(transfer.createdAt) },
          { label: 'Items', value: String(transfer.items?.length ?? 0) },
        ].map(meta => (
          <div key={meta.label} className="bg-white rounded-xl border border-slate-100 px-4 py-3">
            <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-1">{meta.label}</p>
            <p className={`text-sm font-semibold text-slate-800 ${meta.mono ? 'font-mono text-indigo-700' : ''}`}>
              {meta.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
