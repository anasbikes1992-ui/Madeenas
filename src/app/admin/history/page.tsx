'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { formatDate } from '@/lib/utils'

type HistoryEntry = {
  id: string
  entityType: string
  entityId: string
  eventType: string
  title: string
  details: string | null
  payloadJson: string | null
  createdAt: string
  createdByUser: {
    id: string
    name: string
    role: string
    email: string
  }
}

export default function HistoryPage() {
  const { data: session } = useSession()
  const [rows, setRows] = useState<HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [entityType, setEntityType] = useState('')
  const [editRow, setEditRow] = useState<HistoryEntry | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editDetails, setEditDetails] = useState('')
  const [toast, setToast] = useState<string | null>(null)

  const role = session?.user?.role || ''

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    setLoading(true)
    const params = new URLSearchParams()
    if (entityType) params.set('entityType', entityType)
    const response = await fetch(`/api/history?${params.toString()}`)
    if (!response.ok) {
      setRows([])
      setLoading(false)
      return
    }

    const payload = await response.json()
    setRows(payload.entries || [])
    setLoading(false)
  }

  useEffect(() => {
    if (role === 'SUPER_ADMIN') {
      void load()
    }
  }, [role, entityType])

  async function handleDelete(id: string) {
    const response = await fetch(`/api/history/${id}`, { method: 'DELETE' })
    if (!response.ok) {
      showToast('Delete failed')
      return
    }
    showToast('History event deleted')
    await load()
  }

  async function saveEdit() {
    if (!editRow) return
    const response = await fetch(`/api/history/${editRow.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle, details: editDetails }),
    })

    if (!response.ok) {
      showToast('Update failed')
      return
    }

    showToast('History event updated')
    setEditRow(null)
    setEditTitle('')
    setEditDetails('')
    await load()
  }

  if (role !== 'SUPER_ADMIN') {
    return (
      <div className="card text-center py-12">
        <h1 className="text-xl font-bold text-slate-900">History Access Restricted</h1>
        <p className="text-sm text-slate-500 mt-2">Only super admin can view and manage global history.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System History</h1>
          <p className="text-sm text-slate-500">Super admin CRUD for transaction and entity flow history.</p>
        </div>
        <select title="Filter entity type" className="input max-w-xs" value={entityType} onChange={(event) => setEntityType(event.target.value)}>
          <option value="">All Entities</option>
          <option value="STOCK_SEND">Stock Send</option>
          <option value="STOCK_REQUEST">Stock Request</option>
          <option value="PRODUCT">Product</option>
          <option value="INVENTORY">Inventory</option>
        </select>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>When</th>
              <th>Entity</th>
              <th>Event</th>
              <th>Title</th>
              <th>Details</th>
              <th>By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(6)].map((_, index) => (
                <tr key={index}>{[...Array(7)].map((__, c) => <td key={c}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>
              ))
            ) : rows.length === 0 ? (
              <tr><td colSpan={7} className="text-center py-12 text-slate-400">No history records available.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.id}>
                <td className="text-sm text-slate-500">{formatDate(row.createdAt)}</td>
                <td>
                  <div className="text-xs">
                    <p className="font-semibold text-slate-700">{row.entityType}</p>
                    <code className="text-slate-400">{row.entityId}</code>
                  </div>
                </td>
                <td><span className="badge badge-indigo">{row.eventType}</span></td>
                <td className="font-medium text-slate-800">{row.title}</td>
                <td className="text-sm text-slate-600 max-w-xs truncate" title={row.details || ''}>{row.details || '—'}</td>
                <td className="text-xs text-slate-500">{row.createdByUser.name}</td>
                <td>
                  <div className="flex gap-2">
                    <button
                      className="btn-secondary btn-sm"
                      onClick={() => {
                        setEditRow(row)
                        setEditTitle(row.title)
                        setEditDetails(row.details || '')
                      }}
                    >
                      Edit
                    </button>
                    <button className="btn-danger btn-sm" onClick={() => handleDelete(row.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editRow ? (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setEditRow(null) }}>
          <div className="modal max-w-lg">
            <h2 className="text-xl font-bold mb-3">Edit History Event</h2>
            <div className="space-y-3">
              <div className="form-group">
                <label className="label">Title</label>
                <input title="History title" placeholder="Event title" className="input" value={editTitle} onChange={(event) => setEditTitle(event.target.value)} />
              </div>
              <div className="form-group">
                <label className="label">Details</label>
                <textarea title="History details" placeholder="Event details" className="input" rows={4} value={editDetails} onChange={(event) => setEditDetails(event.target.value)} />
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button className="btn-primary flex-1 justify-center" onClick={saveEdit}>Save</button>
              <button className="btn-secondary" onClick={() => setEditRow(null)}>Cancel</button>
            </div>
          </div>
        </div>
      ) : null}

      {toast ? <div className="toast-success">{toast}</div> : null}
    </div>
  )
}
