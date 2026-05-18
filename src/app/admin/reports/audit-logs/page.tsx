'use client'
import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'

interface AuditLogUser {
  name: string
  role: string
}

interface AuditLog {
  id: string
  user: AuditLogUser
  action: string
  entity: string
  entityId: string | null
  details: string | null
  createdAt: string
}

interface AuditLogsPagination {
  page: number
  totalPages: number
}

interface AuditLogsResponse {
  logs?: AuditLog[]
  pagination?: AuditLogsPagination
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<AuditLogsPagination>({ page: 1, totalPages: 1 })

  async function loadLogs(page = 1) {
    try {
      const res = await fetch(`/api/audit-logs?page=${page}`)
      const data = (await res.json()) as AuditLogsResponse
      setLogs(data.logs || [])
      setPagination(data.pagination || { page: 1, totalPages: 1 })
    } catch (error) {
      console.error('Failed to load audit logs:', error)
      setLogs([])
      setPagination({ page: 1, totalPages: 1 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadLogs()
  }, [])

  const getActionColor = (action: string) => {
    const a = action.toLowerCase()
    if (a.includes('create') || a.includes('add') || a.includes('in')) return 'text-emerald-600'
    if (a.includes('delete') || a.includes('remove') || a.includes('reject')) return 'text-red-600'
    if (a.includes('update') || a.includes('edit')) return 'text-blue-600'
    return 'text-slate-600'
  }

  return (
    <div className="space-y-6 fade-in">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Audit Logs</h1>
        <p className="text-sm text-slate-500">Track all system activities and changes</p>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>User</th>
              <th>Action</th>
              <th>Entity</th>
              <th>Entity ID</th>
              <th>Details</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(10)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}
                </tr>
              ))
            ) : logs.length === 0 ? (
              <tr><td colSpan={6} className="text-center py-12 text-slate-400">No logs found</td></tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td>
                  <div className="text-sm font-medium text-slate-900">{log.user.name}</div>
                  <div className="text-xs text-slate-500">{log.user.role}</div>
                </td>
                <td className={`text-sm font-bold uppercase ${getActionColor(log.action)}`}>
                  {log.action}
                </td>
                <td className="text-sm text-slate-700">{log.entity}</td>
                <td><code className="text-xs bg-slate-100 px-2 py-0.5 rounded">{log.entityId || '—'}</code></td>
                <td className="max-w-xs truncate text-xs text-slate-600" title={log.details ?? undefined}>
                  {log.details || '—'}
                </td>
                <td className="text-xs text-slate-500">
                  {formatDate(log.createdAt, { dateStyle: 'medium', timeStyle: 'short' })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <p className="text-sm text-slate-500">
          Showing page {pagination.page} of {pagination.totalPages}
        </p>
        <div className="flex gap-2">
          <button 
            disabled={pagination.page <= 1} 
            onClick={() => {
              setLoading(true)
              void loadLogs(pagination.page - 1)
            }}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            Previous
          </button>
          <button 
            disabled={pagination.page >= pagination.totalPages} 
            onClick={() => {
              setLoading(true)
              void loadLogs(pagination.page + 1)
            }}
            className="btn-secondary btn-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  )
}
