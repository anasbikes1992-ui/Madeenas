'use client'
import { useEffect, useState } from 'react'

export default function LocationsSettingsPage() {
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', type: 'WAREHOUSE', address: '' })
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 3000) }

  async function load() {
    const res = await fetch('/api/locations')
    setLocations(await res.json())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    setSaving(false)
    if (res.ok) { setShowForm(false); setForm({ name: '', code: '', type: 'WAREHOUSE', address: '' }); load(); showToast('Location added!') }
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
                  <span className="badge badge-green">Active</span>
                  <span className="text-xs text-slate-500">{l.stocks?.length || 0} SKUs</span>
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

      <div className="grid md:grid-cols-2 gap-6">
        <LocationGroup title="Warehouses" icon="🏭" items={warehouses} />
        <LocationGroup title="Shops" icon="🏪" items={shops} />
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Location</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
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
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Adding…' : 'Add Location'}
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
