'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { ROLE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'

export default function UsersSettingsPage() {
  const { data: session } = useSession()
  const actorRole = session?.user?.role || ''
  const [users, setUsers] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<any>({ name: '', email: '', password: 'Madeena@2024', role: 'STORE_KEEPER', locationId: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function load() {
    const [u, l] = await Promise.all([
      fetch('/api/users').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()),
    ])
    setUsers(u.users || [])
    setLocations(l)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError(null)
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      setForm({ name: '', email: '', password: 'Madeena@2024', role: 'STORE_KEEPER', locationId: '' })
      load()
      showToast('User created!')
    } else {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || `Error ${res.status}: Failed to create user`)
    }
  }

  const availableRoles = Object.entries(ROLE_LABELS).filter(([value]) => {
    if (actorRole === 'SUPER_ADMIN') return true
    if (actorRole === 'ADMIN') return !['SUPER_ADMIN', 'ADMIN'].includes(value)
    return false
  })

  const selectedRoleNeedsLocation = ['STORE_KEEPER', 'SHOP_STAFF'].includes(form.role)

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: 'badge-red', ADMIN: 'badge-indigo', MANAGER: 'badge-blue',
    STORE_KEEPER: 'badge-amber', SHOP_STAFF: 'badge-green', FINANCE: 'badge-teal', CUSTOMER: 'badge-gray',
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="text-sm text-slate-500">{users.length} total users</p>
        </div>
        <button onClick={() => { setShowForm(true); setFormError(null) }} className="btn-primary">+ Add User</button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Email</th><th>Role</th><th>Location</th><th>Status</th><th>Joined</th></tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(4)].map((_, i) => <tr key={i}>{[...Array(6)].map((_, j) => <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>)}</tr>)
            ) : users.map((u: any) => (
              <tr key={u.id}>
                <td className="font-medium text-slate-900">{u.name}</td>
                <td className="text-sm text-slate-600">{u.email}</td>
                <td><span className={roleColors[u.role] || 'badge-gray'}>{ROLE_LABELS[u.role]}</span></td>
                <td className="text-sm text-slate-600">{u.location?.name || '—'}</td>
                <td>
                  <span className={u.isActive ? 'badge-green' : 'badge-gray'}>
                    {u.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="text-sm text-slate-500">{formatDate(u.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-group">
                <label className="label">Full Name *</label>
                <input required className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Email *</label>
                <input required type="email" className="input" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Initial Password</label>
                <input required className="input" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
                <p className="text-xs text-slate-400 mt-1">Min 12 chars, must include uppercase, lowercase and a digit.</p>
              </div>
              <div className="form-group">
                <label htmlFor="user-role" className="label">Role *</label>
                <select id="user-role" required className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                  {availableRoles.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="user-location" className="label">Assigned Location {selectedRoleNeedsLocation ? '*' : ''}</label>
                <select id="user-location" className="input" required={selectedRoleNeedsLocation} value={form.locationId} onChange={e => setForm({ ...form, locationId: e.target.value })}>
                  <option value="">No specific location</option>
                  {locations.map((l: any) => <option key={l.id} value={l.id}>[{l.type}] {l.name}</option>)}
                </select>
                {selectedRoleNeedsLocation && (
                  <p className="text-xs text-slate-500 mt-1">Store and shop users must be linked to one location.</p>
                )}
              </div>
              {formError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {formError}
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Creating…' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {toast && <div className="toast-success">✅ {toast}</div>}
    </div>
  )
}
