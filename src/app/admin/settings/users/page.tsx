'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Users as UsersIcon, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'

interface Location {
  id: string
  name: string
  code: string
}

interface User {
  id: string
  name: string
  email: string
  role: string
  locationId?: string | null
  location?: { id: string; name: string }
  isActive: boolean
  createdAt: string
}

const ROLES = [
  { value: 'SUPER_ADMIN', label: 'Super Admin', description: 'Full system access' },
  { value: 'ADMIN', label: 'Admin', description: 'Administrative access' },
  { value: 'MANAGER', label: 'Manager', description: 'Management operations' },
  { value: 'STORE_KEEPER', label: 'Store Keeper', description: 'Warehouse management' },
  { value: 'SHOP_STAFF', label: 'Shop Staff', description: 'Shop operations' },
  { value: 'FINANCE', label: 'Finance', description: 'Financial operations' },
  { value: 'CUSTOMER', label: 'Customer', description: 'Customer portal access' },
]

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editUser, setEditUser] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'STORE_KEEPER',
    locationId: ''
  })

  const [editForm, setEditForm] = useState({
    name: '',
    role: '',
    locationId: '',
    isActive: true
  })

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [usersRes, locationsRes] = await Promise.all([
        fetch('/api/users'),
        fetch('/api/locations')
      ])
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(Array.isArray(data.users) ? data.users : [])
      }
      
      if (locationsRes.ok) {
        const data = await locationsRes.json()
        setLocations(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load data:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          locationId: form.locationId || null
        }),
      })

      if (res.ok) {
        setShowForm(false)
        setForm({ name: '', email: '', password: '', role: 'STORE_KEEPER', locationId: '' })
        await loadData()
        showToast('User created successfully!')
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to create user')
      }
    } catch (error) {
      setFormError('Network error occurred')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(user: User) {
    setEditUser(user)
    setEditForm({
      name: user.name,
      role: user.role,
      locationId: user.locationId || '',
      isActive: user.isActive
    })
    setFormError(null)
  }

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!editUser) return
    
    setSaving(true)
    setFormError(null)

    try {
      const res = await fetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          locationId: editForm.locationId || null
        }),
      })

      if (res.ok) {
        setEditUser(null)
        await loadData()
        showToast('User updated successfully!')
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to update user')
      }
    } catch (error) {
      setFormError('Network error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(user: User) {
    if (!confirm(`${user.isActive ? 'Deactivate' : 'Activate'} ${user.name}?`)) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !user.isActive }),
      })

      if (res.ok) {
        await loadData()
        showToast(`User ${user.isActive ? 'deactivated' : 'activated'}`)
      }
    } catch (error) {
      console.error('Failed to toggle user status:', error)
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`Deactivate ${user.name}? This will prevent login but preserve data.`)) return

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadData()
        showToast('User deactivated')
      }
    } catch (error) {
      console.error('Failed to deactivate user:', error)
    }
  }

  const needsLocation = (role: string) => ['STORE_KEEPER', 'SHOP_STAFF'].includes(role)

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Users</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white">
            <UsersIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Users</h1>
            <p className="text-sm text-slate-500">{users.length} user accounts</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add User
        </button>
      </div>

      {/* Users Grid */}
      <div className="grid gap-4">
        {users.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">No users found</div>
        ) : (
          users.map((user) => (
            <div key={user.id} className="card">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-slate-900">{user.name}</h3>
                    {!user.isActive && (
                      <span className="badge badge-gray flex items-center gap-1">
                        <EyeOff className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-1">{user.email}</p>
                  {user.location && (
                    <p className="text-sm text-slate-400">📍 {user.location.name}</p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className="badge badge-blue">{user.role.replace('_', ' ')}</span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => openEdit(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit user"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleToggleActive(user)}
                      className={`p-2 rounded-lg transition-colors ${
                        user.isActive 
                          ? 'text-orange-600 hover:bg-orange-50' 
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={user.isActive ? 'Deactivate' : 'Activate'}
                    >
                      {user.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    {user.id !== session?.user?.id && (
                      <button
                        onClick={() => handleDelete(user)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Deactivate user"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create User Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add New User</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Full Name *</label>
                  <input
                    required
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="John Doe"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Email *</label>
                  <input
                    required
                    type="email"
                    className="input"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
              </div>
              
              <div className="form-group">
                <label className="label">Password *</label>
                <input
                  required
                  type="password"
                  className="input"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Minimum 8 characters"
                  minLength={8}
                />
                <p className="text-xs text-slate-500 mt-1">At least 8 characters</p>
              </div>

              <div className="form-group">
                <label className="label">Role *</label>
                <select
                  required
                  className="input"
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {needsLocation(form.role) && (
                <div className="form-group">
                  <label className="label">Location *</label>
                  <select
                    required
                    className="input"
                    value={form.locationId}
                    onChange={(e) => setForm({ ...form, locationId: e.target.value })}
                  >
                    <option value="">Select location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Creating…' : 'Create User'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editUser && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditUser(null)}>
          <div className="modal max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit User</h2>
              <button onClick={() => setEditUser(null)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="form-group">
                <label className="label">Full Name *</label>
                <input
                  required
                  className="input"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input bg-slate-50"
                  value={editUser.email}
                  disabled
                />
                <p className="text-xs text-slate-500 mt-1">Email cannot be changed</p>
              </div>

              <div className="form-group">
                <label className="label">Role *</label>
                <select
                  required
                  className="input"
                  value={editForm.role}
                  onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                >
                  {ROLES.map((role) => (
                    <option key={role.value} value={role.value}>
                      {role.label} - {role.description}
                    </option>
                  ))}
                </select>
              </div>

              {needsLocation(editForm.role) && (
                <div className="form-group">
                  <label className="label">Location *</label>
                  <select
                    required
                    className="input"
                    value={editForm.locationId}
                    onChange={(e) => setEditForm({ ...editForm, locationId: e.target.value })}
                  >
                    <option value="">Select location</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name} ({loc.code})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Active (user can login)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditUser(null)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg fade-in">
          {toast}
        </div>
      )}
    </div>
  )
}
