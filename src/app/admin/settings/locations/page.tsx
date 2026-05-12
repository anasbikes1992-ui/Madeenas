'use client'
import { useEffect, useState } from 'react'
import { MapPin, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'

interface Location {
  id: string
  name: string
  code: string
  type: string
  address?: string | null
  isActive: boolean
  stocks?: any[]
}

const LOCATION_TYPES = [
  { value: 'WAREHOUSE', label: 'Warehouse', description: 'Main storage facility' },
  { value: 'SHOP', label: 'Shop', description: 'Retail location' },
  { value: 'FACTORY', label: 'Factory', description: 'Manufacturing site' },
  { value: 'OFFICE', label: 'Office', description: 'Administrative location' },
]

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editLocation, setEditLocation] = useState<Location | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: '',
    code: '',
    type: 'WAREHOUSE',
    address: ''
  })

  const [editForm, setEditForm] = useState({
    name: '',
    code: '',
    type: 'WAREHOUSE',
    address: '',
    isActive: true
  })

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    loadLocations()
  }, [])

  async function loadLocations() {
    setLoading(true)
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    setFormError(null)

    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          address: form.address || null
        }),
      })

      if (res.ok) {
        setShowForm(false)
        setForm({ name: '', code: '', type: 'WAREHOUSE', address: '' })
        await loadLocations()
        showToast('Location created successfully!')
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to create location')
      }
    } catch (error) {
      setFormError('Network error occurred')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(location: Location) {
    setEditLocation(location)
    setEditForm({
      name: location.name,
      code: location.code,
      type: location.type,
      address: location.address || '',
      isActive: location.isActive
    })
    setFormError(null)
  }

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!editLocation) return

    setSaving(true)
    setFormError(null)

    try {
      const res = await fetch(`/api/locations/${editLocation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editForm,
          address: editForm.address || null
        }),
      })

      if (res.ok) {
        setEditLocation(null)
        await loadLocations()
        showToast('Location updated successfully!')
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to update location')
      }
    } catch (error) {
      setFormError('Network error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(location: Location) {
    if (!confirm(`${location.isActive ? 'Deactivate' : 'Activate'} ${location.name}?`)) return

    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !location.isActive }),
      })

      if (res.ok) {
        await loadLocations()
        showToast(`Location ${location.isActive ? 'deactivated' : 'activated'}`)
      }
    } catch (error) {
      console.error('Failed to toggle location status:', error)
    }
  }

  async function handleDelete(location: Location) {
    if (!confirm(`Deactivate ${location.name}? This will prevent usage but preserve data.`)) return

    try {
      const res = await fetch(`/api/locations/${location.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await loadLocations()
        showToast('Location deactivated')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to deactivate location')
      }
    } catch (error) {
      console.error('Failed to deactivate location:', error)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Locations</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8 space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center text-white">
            <MapPin className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Locations</h1>
            <p className="text-sm text-slate-500">{locations.length} locations</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Location
        </button>
      </div>

      {/* Locations Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {locations.length === 0 ? (
          <div className="card md:col-span-2 lg:col-span-3 text-center py-12 text-slate-400">
            No locations found
          </div>
        ) : (
          locations.map((location) => (
            <div key={location.id} className="card">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-slate-900 truncate">{location.name}</h3>
                    {!location.isActive && (
                      <span className="badge badge-gray flex items-center gap-1 text-xs">
                        <EyeOff className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-slate-500 mb-1">
                    <code className="px-2 py-0.5 bg-slate-100 rounded text-xs">{location.code}</code>
                    <span className="mx-2">•</span>
                    <span className="badge badge-indigo text-xs">{location.type}</span>
                  </p>
                  {location.address && (
                    <p className="text-sm text-slate-400 truncate mt-2">📍 {location.address}</p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  onClick={() => openEdit(location)}
                  className="flex-1 text-xs btn-secondary py-1.5 px-3 flex items-center justify-center gap-1.5"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
                <button
                  onClick={() => handleToggleActive(location)}
                  className={`flex-1 text-xs py-1.5 px-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-1.5 ${
                    location.isActive
                      ? 'bg-orange-50 text-orange-600 hover:bg-orange-100'
                      : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
                >
                  {location.isActive ? (
                    <>
                      <EyeOff className="w-3.5 h-3.5" />
                      Deactivate
                    </>
                  ) : (
                    <>
                      <Eye className="w-3.5 h-3.5" />
                      Activate
                    </>
                  )}
                </button>
                <button
                  onClick={() => handleDelete(location)}
                  className="text-xs py-1.5 px-3 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Location Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add New Location</h2>
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
                  <label className="label">Location Name *</label>
                  <input
                    required
                    className="input"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Main Warehouse"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Code *</label>
                  <input
                    required
                    className="input font-mono"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                    placeholder="WH-001"
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Type *</label>
                <select
                  required
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                >
                  {LOCATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Address (Optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Physical address of the location"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Creating…' : 'Create Location'}
                </button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {editLocation && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditLocation(null)}>
          <div className="modal max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Location</h2>
              <button onClick={() => setEditLocation(null)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Location Name *</label>
                  <input
                    required
                    className="input"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Code *</label>
                  <input
                    required
                    className="input font-mono"
                    value={editForm.code}
                    onChange={(e) => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })}
                    maxLength={20}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="label">Type *</label>
                <select
                  required
                  className="input"
                  value={editForm.type}
                  onChange={(e) => setEditForm({ ...editForm, type: e.target.value })}
                >
                  {LOCATION_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="label">Address (Optional)</label>
                <textarea
                  className="input"
                  rows={3}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">Active (location is available for operations)</span>
                </label>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditLocation(null)} className="btn-secondary">
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
