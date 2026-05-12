'use client'
import { useEffect, useState } from 'react'

interface Location {
  id: string
  name: string
  code: string
  type: string
  address?: string
  isActive: boolean
  stocks?: any[]
}

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadLocations()
  }, [])

  async function loadLocations() {
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

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Locations</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Locations</h1>
      <div className="space-y-4">
        {locations.length === 0 ? (
          <p className="text-slate-500">No locations found</p>
        ) : (
          locations.map((location) => (
            <div key={location.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{location.name}</h3>
                  <p className="text-sm text-slate-500">{location.code} - {location.type}</p>
                  {location.address && <p className="text-sm text-slate-400 mt-1">{location.address}</p>}
                </div>
                <span className={`badge ${location.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {location.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

  useEffect(() => { void load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setShowForm(false); setForm({ name: '', code: '', type: 'WAREHOUSE', address: '' }); void load(); showToast('Location added!') }
  }

  function openEdit(l: any) {
    setEditLocation(l)
    setEditForm({ name: l.name, code: l.code, type: l.type, address: l.address || '' })
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editLocation) return
    setSaving(true)
    const res = await fetch(`/api/locations/${editLocation.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (res.ok) { setEditLocation(null); void load(); showToast('Location updated!') }
  }

  async function handleToggleActive(l: any) {
    const res = await fetch(`/api/locations/${l.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: !l.isActive }),
    })
    if (res.ok) { void load(); showToast(l.isActive ? 'Location deactivated' : 'Location activated') }
  }

  const warehouses = locations.filter(l => l.type === 'WAREHOUSE')
  const shops = locations.filter(l => l.type === 'SHOP')

  function LocationGroup({ title, icon, items }: { title: string, icon: string, items: any[] }) {
    return (
      <div className="card">
        <h2 className="font-semibold text-slate-900 mb-4">{icon} {title} ({items.length})</h2>
        {items.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-6">No {title.toLowerCase()} yet</p>
        ) : (
          <div className="space-y-3">
            {items.map(l => (
              <div key={l.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <div>
                  <p className="font-medium text-slate-900 text-sm">{l.name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    <code className="text-xs text-slate-400">{l.code}</code>
                    {l.address && <span className="text-xs text-slate-400">{l.address}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={l.isActive ? 'badge badge-green' : 'badge badge-gray'}>{l.isActive ? 'Active' : 'Inactive'}</span>
                  <span className="text-xs text-slate-500">{l.stocks?.length || 0} SKUs</span>
                  <button onClick={() => openEdit(l)} className="text-xs btn-secondary py-1 px-2">Edit</button>
                  <button
                    onClick={() => void handleToggleActive(l)}
                    className={`text-xs py-1 px-2 rounded-lg font-medium transition-colors ${l.isActive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                  >
                    {l.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Locations</h1>
          <p className="text-sm text-slate-500">{locations.length} total locations</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Location</button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-6">
          {[0, 1].map(i => <div key={i} className="card h-48 bg-slate-100 animate-pulse" />)}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          <LocationGroup title="Warehouses" icon="🏭" items={warehouses} />
          <LocationGroup title="Shops" icon="🏪" items={shops} />
        </div>
      )}

      {/* Add Location Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Location</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={e => void handleSave(e)} className="space-y-4">
              <div className="form-group">
                <label className="label">Location Name *</label>
                <input required className="input" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Warehouse C" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Code *</label>
                  <input required className="input font-mono uppercase" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="WH-C" />
                </div>
                <div className="form-group">
                  <label className="label">Type *</label>
                  <select required className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="SHOP">Shop</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="Physical address" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Adding…' : 'Add Location'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Location Modal */}
      {editLocation && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setEditLocation(null) }}>
          <div className="modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Location</h2>
              <button onClick={() => setEditLocation(null)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={e => void handleEditSave(e)} className="space-y-4">
              <div className="form-group">
                <label className="label">Location Name *</label>
                <input required className="input" value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Code *</label>
                  <input required className="input font-mono uppercase" value={editForm.code} onChange={e => setEditForm({ ...editForm, code: e.target.value.toUpperCase() })} />
                </div>
                <div className="form-group">
                  <label className="label">Type *</label>
                  <select required className="input" value={editForm.type} onChange={e => setEditForm({ ...editForm, type: e.target.value })}>
                    <option value="WAREHOUSE">Warehouse</option>
                    <option value="SHOP">Shop</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="label">Address</label>
                <input className="input" value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} placeholder="Physical address" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" onClick={() => setEditLocation(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast-success">✅ {toast}</div>}
    </div>
  )
}
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', type: 'WAREHOUSE', address: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
