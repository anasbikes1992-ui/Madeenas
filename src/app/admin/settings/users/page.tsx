'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ROLE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

const ROLE_BADGE: Record<string, string> = {
  SUPER_ADMIN: 'badge-red',
  ADMIN: 'badge-indigo',
  MANAGER: 'badge-blue',
  STORE_KEEPER: 'badge-teal',
  SALES_STAFF: 'badge-amber',
}

const ALL_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'STORE_KEEPER', 'SALES_STAFF']

export default function UsersSettingsPage() {
  const { data: session } = useSession()
  const actorRole = session?.user?.role || ''
  const actorId = session?.user?.id || ''
  const canEdit = ['SUPER_ADMIN', 'ADMIN'].includes(actorRole)

  const [users, setUsers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<any | null>(null)
  const [form, setForm] = useState<any>({ name: '', email: '', password: 'Madeena@2024', role: 'STORE_KEEPER', locationId: '' })
  const [editForm, setEditForm] = useState<any>({ name: '', role: '', locationId: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const availableRoles = actorRole === 'SUPER_ADMIN'
    ? ALL_ROLES
    : ALL_ROLES.filter(r => r !== 'SUPER_ADMIN' && r !== 'ADMIN')

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  async function loadUsers() {
    try {
      const [uRes, lRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/locations'),
      ])
      if (uRes.ok) setUsers(await uRes.json())
      if (lRes.ok) setLocations(await lRes.json())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadUsers() }, [])

  function openEdit(u: any) {
    setEditUser(u)
    setEditForm({ name: u.name, role: u.role, locationId: u.locationId || '' })
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setFormError((err as any).error || 'Failed to create user')
        return
      }
      setShowForm(false)
      setForm({ name: '', email: '', password: 'Madeena@2024', role: 'STORE_KEEPER', locationId: '' })
      showToast('User created successfully')
      void loadUsers()
    } finally {
      setSaving(false)
    }
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editUser) return
    setSaving(true)
    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        setFormError((err as any).error || 'Failed to update user')
        return
      }
      setEditUser(null)
      showToast('User updated')
      void loadUsers()
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(u: any) {
    await fetch(`/api/users/${u.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !u.isActive }),
    })
    showToast(u.isActive ? 'User deactivated' : 'User activated')
    void loadUsers()
  }

  if (loading) return <div className="p-8 text-center text-slate-400">Loading users…</div>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {toast && <div className="toast-success fade-in">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-slate-500 text-sm mt-0.5">Manage system users and their roles</p>
        </div>
        {canEdit && (
          <button onClick={() => { setShowForm(true); setFormError(null) }} className="btn-primary">
            + Add User
          </button>
        )}
      </div>

      <div className="card overflow-hidden">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Location</th>
                <th>Status</th>
                <th>Created</th>
                {canEdit && <th>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id}>
                  <td className="font-medium">{u.name}</td>
                  <td className="text-slate-500">{u.email}</td>
                  <td>
                    <span className={ROLE_BADGE[u.role] || 'badge-gray'}>
                      {ROLE_LABELS[u.role as keyof typeof ROLE_LABELS] || u.role}
                    </span>
                  </td>
                  <td className="text-slate-500">{u.location?.name || '—'}</td>
                  <td>
                    <span className={u.isActive ? 'badge-green' : 'badge-gray'}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="text-slate-400 text-sm">{formatDate(u.createdAt)}</td>
                  {canEdit && (
                    <td>
                      <div className="flex gap-2">
                        <button
                          onClick={() => { openEdit(u); setFormError(null) }}
                          className="text-xs px-2 py-1 rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-medium"
                        >
                          Edit
                        </button>
                        {u.id !== actorId && (
                          <button
                            onClick={() => void handleToggleActive(u)}
                            className={`text-xs px-2 py-1 rounded-lg font-medium ${
                              u.isActive
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Add New User</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}
            <form onSubmit={(e) => void handleAdd(e)} className="space-y-4">
              <div className="form-group">
                <label className="label">Name</label>
                <input className="input" required value={form.name}
                  onChange={e => setForm((f: any) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Email</label>
                <input className="input" type="email" required value={form.email}
                  onChange={e => setForm((f: any) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Password</label>
                <input className="input" type="password" required value={form.password}
                  onChange={e => setForm((f: any) => ({ ...f, password: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Role</label>
                <select className="input" value={form.role}
                  onChange={e => setForm((f: any) => ({ ...f, role: e.target.value }))}>
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Location</label>
                <select className="input" value={form.locationId}
                  onChange={e => setForm((f: any) => ({ ...f, locationId: e.target.value }))}>
                  <option value="">— None —</option>
                  {locations.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={() => setEditUser(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="text-slate-400 hover:text-slate-600 text-xl leading-none">×</button>
            </div>
            {formError && <p className="text-red-600 text-sm mb-3">{formError}</p>}
            <form onSubmit={(e) => void handleEditSave(e)} className="space-y-4">
              <div className="form-group">
                <label className="label">Name</label>
                <input className="input" required value={editForm.name}
                  onChange={e => setEditForm((f: any) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Email (read-only)</label>
                <input className="input opacity-60" disabled value={editUser.email} />
              </div>
              <div className="form-group">
                <label className="label">Role</label>
                <select className="input" value={editForm.role}
                  onChange={e => setEditForm((f: any) => ({ ...f, role: e.target.value }))}>
                  {availableRoles.map(r => (
                    <option key={r} value={r}>{ROLE_LABELS[r as keyof typeof ROLE_LABELS] || r}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="label">Location</label>
                <select className="input" value={editForm.locationId}
                  onChange={e => setEditForm((f: any) => ({ ...f, locationId: e.target.value }))}>
                  <option value="">— None —</option>
                  {locations.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-1">
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary flex-1">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

