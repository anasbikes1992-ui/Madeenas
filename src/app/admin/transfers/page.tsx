'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftRight, Plus, ChevronRight, ArrowRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface StockTransfer {
  id: string
  transferNo: string
  status: string
  fromLocation: { id: string; name: string }
  toLocation: { id: string; name: string }
  requestedByUser: { id: string; name: string; role: string }
  items: any[]
  createdAt: string
  approvedAt?: string
  dispatchedAt?: string
  receivedAt?: string
  note?: string
}

const STATUS_TABS = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'DISPATCHED', label: 'Dispatched' },
  { key: 'RECEIVED', label: 'Received' },
]

const STATUS_BADGE: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
  APPROVED: 'bg-blue-100 text-blue-800 border border-blue-200',
  DISPATCHED: 'bg-orange-100 text-orange-800 border border-orange-200',
  RECEIVED: 'bg-green-100 text-green-800 border border-green-200',
  CANCELLED: 'bg-gray-100 text-gray-600 border border-gray-200',
}

export default function TransfersPage() {
  const router = useRouter()
  const [transfers, setTransfers] = useState<StockTransfer[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('ALL')
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 4000)
  }

  async function load() {
    setLoading(true)
    try {
      const res = await fetch('/api/transfers?page=1&limit=200')
      if (!res.ok) throw new Error('Failed to load transfers')
      const data = await res.json()
      setTransfers(data.requests || [])
      setTotal(data.total || 0)
    } catch {
      showToast('Error loading transfers. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const filtered = useMemo(() => {
    if (activeTab === 'ALL') return transfers
    return transfers.filter(t => t.status === activeTab)
  }, [transfers, activeTab])

  const countFor = (key: string) =>
    key === 'ALL' ? transfers.length : transfers.filter(t => t.status === key).length

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-600 rounded-xl shadow">
            <ArrowLeftRight className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Stock Transfers</h1>
            <p className="text-sm text-slate-500">{total} total transfers across all locations</p>
          </div>
        </div>
        <button
          onClick={() => router.push('/admin/transfers/new')}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Transfer
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-xl text-sm font-medium">
          {toast}
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-fit flex-wrap">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full ${
              activeTab === tab.key ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-200 text-slate-500'
            }`}>
              {countFor(tab.key)}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Transfer #</th>
              <th>Route</th>
              <th>Status</th>
              <th className="text-center">Items</th>
              <th>Created By</th>
              <th>Date</th>
              <th className="w-8"></th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j}>
                      <div className="h-4 bg-slate-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-16">
                  <div className="flex flex-col items-center gap-3 text-slate-400">
                    <ArrowLeftRight className="h-10 w-10 opacity-30" />
                    <p className="font-medium">No transfers found</p>
                    {activeTab !== 'ALL' && (
                      <p className="text-sm">No <span className="lowercase">{activeTab}</span> transfers</p>
                    )}
                    <button
                      onClick={() => router.push('/admin/transfers/new')}
                      className="mt-2 text-indigo-600 text-sm font-medium hover:text-indigo-700 underline underline-offset-2"
                    >
                      Create first transfer
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              filtered.map(t => (
                <tr
                  key={t.id}
                  onClick={() => router.push(`/admin/transfers/${t.id}`)}
                  className="cursor-pointer hover:bg-indigo-50/40 transition-colors"
                >
                  <td>
                    <span className="font-mono font-semibold text-indigo-700 text-sm">
                      {t.transferNo}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-medium text-slate-700">{t.fromLocation?.name ?? '—'}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                      <span className="font-medium text-slate-700">{t.toLocation?.name ?? '—'}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_BADGE[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {t.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 text-sm font-semibold">
                      {t.items?.length ?? 0}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm text-slate-600">{t.requestedByUser?.name ?? '—'}</span>
                  </td>
                  <td>
                    <span className="text-sm text-slate-500">{formatDate(t.createdAt)}</span>
                  </td>
                  <td>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
