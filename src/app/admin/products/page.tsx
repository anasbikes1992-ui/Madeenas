'use client'
import { useEffect, useState } from 'react'
import { parseImages, formatDate } from '@/lib/utils'
import { toast } from 'react-hot-toast'
import { useRouter } from 'next/navigation'

export default function ProductsPage() {
  const router = useRouter()
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')

  function showToast(msg: string, type = 'success') {
    if (type === 'success') toast.success(msg)
    else toast.error(msg)
  }

  async function loadProducts() {
    setLoading(true)
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (category) params.set('category', category)
    const res = await fetch('/api/products?' + params)
    const data = await res.json()
    setProducts(data.products || [])
    setLoading(false)
  }

  async function loadCategories() {
    const res = await fetch('/api/categories')
    const data = await res.json()
    setCategories(data)
  }

  async function handleExcelImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('/api/products/import', {
        method: 'POST',
        body: formData,
      })
      const payload = await res.json()
      if (!res.ok) {
        toast.error(payload.error || 'Import failed')
        return
      }
      toast.success(`Import completed: ${payload.imported} success, ${payload.failed} failed`)
      loadProducts()
    } catch {
      toast.error('Error importing file')
    }
  }

  async function handleExport(format: 'xlsx' | 'csv') {
    try {
      const res = await fetch(`/api/products/export?format=${format}`)
      if (!res.ok) {
        toast.error('Export failed')
        return
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `products-export-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Exported products as ${format.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
  }

  useEffect(() => { loadCategories() }, [])
  useEffect(() => { loadProducts() }, [search, category])

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this product?')) return
    await fetch(`/api/products/${id}`, { method: 'DELETE' })
    loadProducts()
    showToast('Product deactivated')
  }

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-500 mt-0.5">{products.length} products found</p>
        </div>
        <div className="flex gap-2">
          <label className="btn-secondary cursor-pointer">
            📥 Import XLSX/CSV
            <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={handleExcelImport} />
          </label>
          <button onClick={() => handleExport('xlsx')} className="btn-secondary">⬇️ Export XLSX</button>
          <button onClick={() => handleExport('csv')} className="btn-secondary">⬇️ Export CSV</button>
          <button onClick={() => router.push('/admin/products/new')} className="btn-primary">+ Add Product</button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search by name, SKU, design..."
          aria-label="Search products"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input max-w-xs"
        />
        <select id="category-filter" aria-label="Filter by category" value={category} onChange={e => setCategory(e.target.value)} className="input max-w-xs">
          <option value="">All Categories</option>
          {categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Variants</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(5)].map((_, j) => (
                    <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-12 text-slate-400">
                  No products found. <button onClick={() => router.push('/admin/products/new')} className="text-indigo-600 underline">Add one</button>
                </td>
              </tr>
            ) : products.map((p: any) => {
              const imgs = parseImages(p.images)
              const variants = p.variants || []
              let totalStock = 0
              variants.forEach((v: any) => {
                totalStock += v.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0
              })
              // Fallback to old stock logic if variants is missing
              if (variants.length === 0) {
                 totalStock = p.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0
              }

              return (
                <tr key={p.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {imgs[0] ? (
                        <img src={imgs[0]} alt={p.name} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-500 text-lg flex-shrink-0">📦</div>
                      )}
                      <div>
                        <p className="font-medium text-slate-900 text-sm">{p.name}</p>
                        <p className="text-xs text-slate-400">{formatDate(p.createdAt)}</p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="badge" style={{ background: p.category?.color + '22', color: p.category?.color }}>
                      {p.category?.name}
                    </span>
                  </td>
                  <td>
                    {variants.length > 0 ? (
                      <div className="flex flex-col gap-1">
                        <span className="text-sm text-slate-700">{variants.length} variant{variants.length > 1 ? 's' : ''}</span>
                        <div className="flex gap-1 flex-wrap">
                          {variants.map((v: any) => (
                            <div 
                              key={v.id} 
                              className="w-4 h-4 rounded-full border border-slate-200" 
                              style={{ backgroundColor: v.colorHex || '#ccc' }} 
                              title={v.color} 
                            />
                          ))}
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-slate-400">No variants</span>
                    )}
                  </td>
                  <td>
                    <span className={totalStock <= 0 ? 'stock-empty' : totalStock <= (p.lowStockAt || 10) ? 'stock-low' : 'stock-healthy'}>
                      {totalStock.toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <a href={`/admin/products/${p.id}`} className="btn-secondary btn-sm">View</a>
                      <button onClick={() => router.push(`/admin/products/${p.id}/edit`)} className="btn-secondary btn-sm">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="btn-danger btn-sm">Del</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
