'use client'
import { useEffect, useState } from 'react'


type SupplierItem = {
  id: string
  name: string
  contact?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  isActive: boolean
  _count?: { stockIns: number }
}

export default function SuppliersSettingsPage() {
  const [suppliers, setSuppliers] = useState<SupplierItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', contact: '', email: '', phone: '', address: '' })

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    setLoading(true)
    const response = await fetch('/api/suppliers')
    const data = await response.json()
    setSuppliers(data)
    setLoading(false)
  }

  useEffect(() => {
    let active = true

    async function initialize() {
      const response = await fetch('/api/suppliers')
      const data = await response.json()
      if (!active) return
      setSuppliers(data)
      setLoading(false)
    }

    void initialize()

    return () => {
      active = false
    }
  }, [])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)

    const response = await fetch('/api/suppliers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    setSaving(false)

    if (response.ok) {
      setShowForm(false)
      setForm({ name: '', contact: '', email: '', phone: '', address: '' })
      await load()
      showToast('Supplier created!')
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
          <p className="text-sm text-slate-500">{suppliers.length} suppliers configured</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Supplier</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {loading ? (
          [...Array(4)].map((_, index) => <div key={index} className="card h-40 bg-slate-100 animate-pulse" />)
        ) : suppliers.length === 0 ? (
          <div className="card lg:col-span-2 text-center py-12 text-slate-400">No suppliers yet</div>
        ) : (
          suppliers.map((supplier) => (
            <div key={supplier.id} className="card">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="font-semibold text-slate-900">{supplier.name}</p>
                  {supplier.contact && <p className="text-sm text-slate-500 mt-0.5">Contact: {supplier.contact}</p>}
                </div>
                <span className={supplier.isActive ? 'badge badge-green' : 'badge badge-gray'}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <p>Email: {supplier.email || '—'}</p>
                <p>Phone: {supplier.phone || '—'}</p>
                <p>Address: {supplier.address || '—'}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
                Used in {supplier._count?.stockIns || 0} stock-in entries
              </div>
            </div>
          ))
        )}
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Supplier</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-group">
                <label className="label">Supplier Name *</label>
                <input required className="input" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
              </div>
              <div className="form-group">
                <label className="label">Contact Person</label>
                <input className="input" value={form.contact} onChange={(event) => setForm({ ...form, contact: event.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Email</label>
                  <input type="email" className="input" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
                </div>
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input className="input" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Creating…' : 'Create Supplier'}
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