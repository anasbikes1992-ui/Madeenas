'use client'
import { useEffect, useState } from 'react'

export const dynamic = 'force-dynamic'

type CategoryItem = {
  id: string
  name: string
  slug: string
  color: string
  icon?: string | null
  _count?: { products: number }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export default function CategoriesSettingsPage() {
  const [categories, setCategories] = useState<CategoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editCategory, setEditCategory] = useState<CategoryItem | null>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', slug: '', color: '#6366f1', icon: '' })
  const [editForm, setEditForm] = useState({ name: '', slug: '', color: '#6366f1', icon: '' })

  function showToast(message: string) {
    setToast(message)
    setTimeout(() => setToast(null), 3000)
  }

  async function load() {
    setLoading(true)
    const response = await fetch('/api/categories')
    const data = await response.json()
    setCategories(data)
    setLoading(false)
  }

  useEffect(() => {
    let active = true
    async function initialize() {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (!active) return
      setCategories(data)
      setLoading(false)
    }
    void initialize()
    return () => { active = false }
  }, [])

  async function handleSave(event: React.FormEvent) {
    event.preventDefault()
    setSaving(true)
    const response = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, slug: form.slug || slugify(form.name) }),
    })
    setSaving(false)
    if (response.ok) {
      setShowForm(false)
      setForm({ name: '', slug: '', color: '#6366f1', icon: '' })
      await load()
      showToast('Category created!')
    }
  }

  function openEdit(cat: CategoryItem) {
    setEditCategory(cat)
    setEditForm({ name: cat.name, slug: cat.slug, color: cat.color, icon: cat.icon || '' })
    setFormError(null)
  }

  async function handleEditSave(event: React.FormEvent) {
    event.preventDefault()
    if (!editCategory) return
    setSaving(true)
    setFormError(null)
    const res = await fetch(`/api/categories/${editCategory.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...editForm, slug: editForm.slug || slugify(editForm.name) }),
    })
    setSaving(false)
    if (res.ok) {
      setEditCategory(null)
      await load()
      showToast('Category updated!')
    } else {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || 'Failed to update category')
    }
  }

  async function handleDelete(cat: CategoryItem) {
    if (!confirm(`Delete "${cat.name}"? This cannot be undone.`)) return
    const res = await fetch(`/api/categories/${cat.id}`, { method: 'DELETE' })
    if (res.ok) {
      await load()
      showToast('Category deleted')
    } else {
      const data = await res.json().catch(() => ({}))
      alert(data.error || 'Failed to delete category')
    }
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-500">{categories.length} product categories</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">+ Add Category</button>
      </div>

      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          [...Array(6)].map((_, index) => <div key={index} className="card h-32 bg-slate-100 animate-pulse" />)
        ) : categories.length === 0 ? (
          <div className="card md:col-span-2 xl:col-span-3 text-center py-12 text-slate-400">No categories yet</div>
        ) : (
          categories.map((category) => (
            <div key={category.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white text-lg" style={{ backgroundColor: category.color }}>
                    {category.icon || '🏷️'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-900 truncate">{category.name}</p>
                    <code className="text-xs text-slate-400">{category.slug}</code>
                  </div>
                </div>
                <span className="badge badge-indigo">{category._count?.products || 0} products</span>
              </div>
              <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                <button onClick={() => openEdit(category)} className="text-xs btn-secondary py-1 px-3 flex-1">Edit</button>
                <button
                  onClick={() => void handleDelete(category)}
                  className="text-xs py-1 px-3 rounded-lg font-medium bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  disabled={(category._count?.products || 0) > 0}
                  title={(category._count?.products || 0) > 0 ? 'Cannot delete: has products' : 'Delete category'}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Category Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setShowForm(false) }}>
          <div className="modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Add Category</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={e => void handleSave(e)} className="space-y-4">
              <div className="form-group">
                <label className="label">Category Name *</label>
                <input
                  required className="input" value={form.name}
                  onChange={(event) => setForm((current) => ({ ...current, name: event.target.value, slug: slugify(event.target.value) }))}
                  placeholder="e.g. Woven Fabrics"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Slug *</label>
                  <input required className="input font-mono" value={form.slug} onChange={(event) => setForm({ ...form, slug: slugify(event.target.value) })} placeholder="woven-fabrics" />
                </div>
                <div className="form-group">
                  <label className="label">Color</label>
                  <input type="color" className="input h-11 p-2" value={form.color} onChange={(event) => setForm({ ...form, color: event.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Icon</label>
                <input className="input" value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} placeholder="Optional emoji, e.g. 🧵" maxLength={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Creating…' : 'Create Category'}</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Category Modal */}
      {editCategory && (
        <div className="modal-overlay" onClick={(event) => { if (event.target === event.currentTarget) setEditCategory(null) }}>
          <div className="modal">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">Edit Category</h2>
              <button onClick={() => setEditCategory(null)} className="text-slate-400 text-2xl">&times;</button>
            </div>
            <form onSubmit={e => void handleEditSave(e)} className="space-y-4">
              <div className="form-group">
                <label className="label">Category Name *</label>
                <input
                  required className="input" value={editForm.name}
                  onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value, slug: slugify(event.target.value) }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="label">Slug *</label>
                  <input required className="input font-mono" value={editForm.slug} onChange={(event) => setEditForm({ ...editForm, slug: slugify(event.target.value) })} />
                </div>
                <div className="form-group">
                  <label className="label">Color</label>
                  <input type="color" className="input h-11 p-2" value={editForm.color} onChange={(event) => setEditForm({ ...editForm, color: event.target.value })} />
                </div>
              </div>
              <div className="form-group">
                <label className="label">Icon</label>
                <input className="input" value={editForm.icon} onChange={(event) => setEditForm({ ...editForm, icon: event.target.value })} placeholder="Optional emoji, e.g. 🧵" maxLength={2} />
              </div>
              {formError && <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">{formError}</div>}
              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={saving} className="btn-primary flex-1 justify-center">{saving ? 'Saving…' : 'Save Changes'}</button>
                <button type="button" onClick={() => setEditCategory(null)} className="btn-secondary">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast-success">✅ {toast}</div>}
    </div>
  )
}
