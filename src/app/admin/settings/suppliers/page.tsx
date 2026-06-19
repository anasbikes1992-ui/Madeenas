'use client'
import { useEffect, useState } from 'react'
import { Truck, Plus, Pencil, Trash2, Eye, EyeOff } from 'lucide-react'

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
  const [editSupplier, setEditSupplier] = useState<SupplierItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  
  const [form, setForm] = useState({ 
    name: '', 
    contact: '', 
    email: '', 
    phone: '', 
    address: '' 
  })

  const [editForm, setEditForm] = useState({ 
    name: '', 
    contact: '', 
    email: '', 
    phone: '', 
    address: '',
    isActive: true
  })

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 5000)
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
    setFormError(null)

    try {
      const response = await fetch('/api/suppliers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (response.ok) {
        setShowForm(false)
        setForm({ name: '', contact: '', email: '', phone: '', address: '' })
        await load()
        showToast('Supplier created!')
      } else {
        const data = await response.json()
        setFormError(data.error || 'Failed to create supplier')
      }
    } catch (error) {
      setFormError('Network error occurred')
    } finally {
      setSaving(false)
    }
  }

  function openEdit(supplier: SupplierItem) {
    setEditSupplier(supplier)
    setEditForm({
      name: supplier.name,
      contact: supplier.contact || '',
      email: supplier.email || '',
      phone: supplier.phone || '',
      address: supplier.address || '',
      isActive: supplier.isActive
    })
    setFormError(null)
  }

  async function handleEdit(event: React.FormEvent) {
    event.preventDefault()
    if (!editSupplier) return
    
    setSaving(true)
    setFormError(null)

    try {
      const res = await fetch(`/api/suppliers/${editSupplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })

      if (res.ok) {
        setEditSupplier(null)
        await load()
        showToast('Supplier updated!')
      } else {
        const data = await res.json()
        setFormError(data.error || 'Failed to update supplier')
      }
    } catch (error) {
      setFormError('Network error occurred')
    } finally {
      setSaving(false)
    }
  }

  async function handleToggleActive(supplier: SupplierItem) {
    if (!confirm(`${supplier.isActive ? 'Deactivate' : 'Activate'} ${supplier.name}?`)) return

    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !supplier.isActive }),
      })

      if (res.ok) {
        await load()
        showToast(`Supplier ${supplier.isActive ? 'deactivated' : 'activated'}`)
      }
    } catch (error) {
      console.error('Failed to toggle supplier status:', error)
    }
  }

  async function handleDelete(supplier: SupplierItem) {
    const hasStockIns = (supplier._count?.stockIns || 0) > 0
    const message = hasStockIns
      ? `Deactivate ${supplier.name}? This supplier is used in ${supplier._count?.stockIns} stock-in entries and will be deactivated.`
      : `Delete ${supplier.name}? This action cannot be undone.`
    
    if (!confirm(message)) return

    try {
      const res = await fetch(`/api/suppliers/${supplier.id}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        await load()
        showToast(hasStockIns ? 'Supplier deactivated' : 'Supplier deleted')
      } else {
        const data = await res.json()
        alert(data.error || 'Failed to delete supplier')
      }
    } catch (error) {
      console.error('Failed to delete supplier:', error)
    }
  }

  return (
    <div className="p-8 space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center text-white">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Suppliers</h1>
            <p className="text-sm text-slate-500">{suppliers.length} suppliers configured</p>
          </div>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-5 h-5" />
          Add Supplier
        </button>
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
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-semibold text-slate-900 truncate">{supplier.name}</p>
                    {!supplier.isActive && (
                      <span className="badge badge-gray flex items-center gap-1 text-xs">
                        <EyeOff className="w-3 h-3" />
                        Inactive
                      </span>
                    )}
                  </div>
                  {supplier.contact && <p className="text-sm text-slate-500">Contact: {supplier.contact}</p>}
                </div>
                <span className={supplier.isActive ? 'badge badge-green' : 'badge badge-gray'}>
                  {supplier.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-1.5 text-sm text-slate-600">
                <p>📧 {supplier.email || '—'}</p>
                <p>📱 {supplier.phone || '—'}</p>
                <p>📍 {supplier.address || '—'}</p>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Used in {supplier._count?.stockIns || 0} stock-in entries
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(supplier)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit supplier"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleToggleActive(supplier)}
                    className={`p-2 rounded-lg transition-colors ${
                      supplier.isActive 
                        ? 'text-orange-600 hover:bg-orange-50' 
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={supplier.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {supplier.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => handleDelete(supplier)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete supplier"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Supplier Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <div className="modal max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Supplier</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleSave} className="space-y-4">
              <div className="form-group">
                <label className="label">Supplier Name *</label>
                <input 
                  required 
                  className="input" 
                  value={form.name} 
                  onChange={(event) => setForm({ ...form, name: event.target.value })} 
                  placeholder="ABC Textiles Ltd."
                />
              </div>
              <div className="form-group">
                <label className="label">Contact Person</label>
                <input 
                  className="input" 
                  value={form.contact} 
                  onChange={(event) => setForm({ ...form, contact: event.target.value })} 
                  placeholder="John Smith"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Email</label>
                  <input 
                    type="email" 
                    className="input" 
                    value={form.email} 
                    onChange={(event) => setForm({ ...form, email: event.target.value })} 
                    placeholder="contact@supplier.com"
                  />
                </div>
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input 
                    className="input" 
                    value={form.phone} 
                    onChange={(event) => setForm({ ...form, phone: event.target.value })} 
                    placeholder="+1234567890"
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Address</label>
                <textarea 
                  className="input" 
                  rows={3}
                  value={form.address} 
                  onChange={(event) => setForm({ ...form, address: event.target.value })} 
                  placeholder="Physical address"
                />
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

      {/* Edit Supplier Modal */}
      {editSupplier && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setEditSupplier(null) }}>
          <div className="modal max-w-2xl">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Supplier</h2>
              <button onClick={() => setEditSupplier(null)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            {formError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {formError}
              </div>
            )}
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="form-group">
                <label className="label">Supplier Name *</label>
                <input 
                  required 
                  className="input" 
                  value={editForm.name} 
                  onChange={(event) => setEditForm({ ...editForm, name: event.target.value })} 
                />
              </div>
              <div className="form-group">
                <label className="label">Contact Person</label>
                <input 
                  className="input" 
                  value={editForm.contact} 
                  onChange={(event) => setEditForm({ ...editForm, contact: event.target.value })} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Email</label>
                  <input 
                    type="email" 
                    className="input" 
                    value={editForm.email} 
                    onChange={(event) => setEditForm({ ...editForm, email: event.target.value })} 
                  />
                </div>
                <div className="form-group">
                  <label className="label">Phone</label>
                  <input 
                    className="input" 
                    value={editForm.phone} 
                    onChange={(event) => setEditForm({ ...editForm, phone: event.target.value })} 
                  />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Address</label>
                <textarea 
                  className="input" 
                  rows={3}
                  value={editForm.address} 
                  onChange={(event) => setEditForm({ ...editForm, address: event.target.value })} 
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
                  <span className="text-sm text-slate-700">Active (supplier is available for selection)</span>
                </label>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
                <button type="button" onClick={() => setEditSupplier(null)} className="btn-secondary">Cancel</button>
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