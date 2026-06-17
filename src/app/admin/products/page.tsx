'use client'
import { useEffect, useState, useRef } from 'react'
import { parseImages, formatDate, truncate } from '@/lib/utils'
import { generateProductLabelPDF } from '@/lib/barcode'
import { toast } from 'react-hot-toast'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormData } from '@/lib/validations'

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editProduct, setEditProduct] = useState<any>(null)
  const [imageFiles, setImageFiles] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

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

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema) as any
  })

  function openNew() {
    setEditProduct(null)
    reset({
      name: '', design: '', color: '', colorHex: '#3730a3',
      sku: `TXT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
      unit: 'meters', alternateUnit: 'yards', conversionFactor: null, lowStockAt: 10,
    })
    setImageFiles([])
    setShowForm(true)
  }

  function openEdit(p: any) {
    setEditProduct(p)
    reset(p)
    setImageFiles(parseImages(p.images))
    setShowForm(true)
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files) return
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const payload = await res.json()
      const url = payload?.data?.url || payload?.url

      if (!res.ok) {
        showToast(payload?.error?.message || 'Image upload failed', 'error')
        continue
      }

      if (url) {
        setImageFiles(prev => [...prev, url])
      } else {
        showToast('Image upload failed', 'error')
      }
    }
  }

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true)
    const body = { ...data, images: imageFiles }
    const res = editProduct
      ? await fetch(`/api/products/${editProduct.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      : await fetch('/api/products', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    setSaving(false)
    if (res.ok) {
      setShowForm(false)
      loadProducts()
      showToast(editProduct ? 'Product updated!' : 'Product created!')
    } else {
      const err = await res.json()
      showToast(err.error || 'Error saving product', 'error')
    }
  }

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
          <button onClick={openNew} className="btn-primary">+ Add Product</button>
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
              <th>Design</th>
              <th>Color</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Unit</th>
              <th>Stock</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j}><div className="h-4 bg-slate-100 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : products.length === 0 ? (
              <tr>
                <td colSpan={8} className="text-center py-12 text-slate-400">
                  No products found. <button onClick={openNew} className="text-indigo-600 underline">Add one</button>
                </td>
              </tr>
            ) : products.map((p: any) => {
              const imgs = parseImages(p.images)
              const totalStock = p.stocks?.reduce((sum: number, s: any) => sum + s.quantity, 0) || 0
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
                  <td className="text-sm text-slate-700">{truncate(p.design, 25)}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full border border-slate-200" style={{ background: p.colorHex }} />
                      <span className="text-sm text-slate-700">{p.color}</span>
                    </div>
                  </td>
                  <td><code className="text-xs bg-slate-100 px-2 py-0.5 rounded font-mono">{p.sku}</code></td>
                  <td>
                    <span className="badge" style={{ background: p.category?.color + '22', color: p.category?.color }}>
                      {p.category?.name}
                    </span>
                  </td>
                  <td className="text-sm text-slate-600">
                    <div>
                      <span>{p.unit}</span>
                      {p.alternateUnit && p.conversionFactor ? (
                        <p className="text-xs text-slate-400">1 {p.unit} = {p.conversionFactor} {p.alternateUnit}</p>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span className={totalStock <= 0 ? 'stock-empty' : totalStock <= p.lowStockAt ? 'stock-low' : 'stock-healthy'}>
                      {totalStock.toLocaleString()} {p.unit}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <a href={`/admin/products/${p.id}`} className="btn-secondary btn-sm">View</a>
                      <button 
                        onClick={() => generateProductLabelPDF({
                          name: p.name,
                          sku: p.sku,
                          design: p.design,
                          color: p.color,
                          category: p.category?.name,
                          unit: p.unit
                        })} 
                        className="btn-secondary btn-sm"
                        title="Print Barcode Label"
                      >
                        🏷️
                      </button>
                      <button onClick={() => openEdit(p)} className="btn-secondary btn-sm">Edit</button>
                      <button onClick={() => handleDelete(p.id)} className="btn-danger btn-sm">Del</button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowForm(false) }}>
          <div className="modal max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold">{editProduct ? 'Edit Product' : 'Add New Product'}</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 text-2xl leading-none">&times;</button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="form-group col-span-2">
                <label className="label">Product Name *</label>
                <input className={`input ${errors.name ? 'border-red-500' : ''}`} {...register('name')} placeholder="e.g. Premium Cotton Voile" />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Design *</label>
                <input className={`input ${errors.design ? 'border-red-500' : ''}`} {...register('design')} placeholder="e.g. Floral Print V3" />
                {errors.design && <p className="text-red-500 text-xs mt-1">{errors.design.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">SKU / Barcode *</label>
                <input className={`input font-mono ${errors.sku ? 'border-red-500' : ''}`} {...register('sku')} />
                {errors.sku && <p className="text-red-500 text-xs mt-1">{errors.sku.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Color Name *</label>
                <input className={`input ${errors.color ? 'border-red-500' : ''}`} {...register('color')} placeholder="e.g. Ivory White" />
                {errors.color && <p className="text-red-500 text-xs mt-1">{errors.color.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Color (hex)</label>
                <div className="flex gap-2">
                  <input 
                    type="color" 
                    title="Choose color"
                    className="h-10 w-14 rounded-lg cursor-pointer border border-slate-200" 
                    value={watch('colorHex')}
                    onChange={(e) => setValue('colorHex', e.target.value)}
                  />
                  <input 
                    className={`input ${errors.colorHex ? 'border-red-500' : ''}`} 
                    {...register('colorHex')} 
                  />
                </div>
                {errors.colorHex && <p className="text-red-500 text-xs mt-1">{errors.colorHex.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Category *</label>
                <select className={`input ${errors.categoryId ? 'border-red-500' : ''}`} {...register('categoryId')}>
                  <option value="">Select category</option>
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.categoryId && <p className="text-red-500 text-xs mt-1">{errors.categoryId.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Unit</label>
                <select className={`input ${errors.unit ? 'border-red-500' : ''}`} {...register('unit')}>
                  <option value="meters">Meters</option>
                  <option value="yards">Yards</option>
                  <option value="bale">Bale</option>
                  <option value="kg">Kilograms</option>
                  <option value="rolls">Rolls</option>
                  <option value="pieces">Pieces</option>
                  <option value="bundles">Bundles</option>
                </select>
                {errors.unit && <p className="text-red-500 text-xs mt-1">{errors.unit.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Low Stock Threshold</label>
                <input type="number" className={`input ${errors.lowStockAt ? 'border-red-500' : ''}`} {...register('lowStockAt')} />
                {errors.lowStockAt && <p className="text-red-500 text-xs mt-1">{errors.lowStockAt.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Alternate Unit</label>
                <input className="input" {...register('alternateUnit')} placeholder="e.g. meters" />
              </div>
              <div className="form-group">
                <label className="label">Conversion Factor</label>
                <input type="number" step="0.0001" className={`input ${errors.conversionFactor ? 'border-red-500' : ''}`} {...register('conversionFactor')} placeholder="1 unit = factor alternate unit" />
                {errors.conversionFactor && <p className="text-red-500 text-xs mt-1">{errors.conversionFactor.message}</p>}
              </div>
              <div className="form-group">
                <label className="label">Cost Price (optional)</label>
                <input type="number" step="0.01" className={`input ${errors.costPrice ? 'border-red-500' : ''}`} {...register('costPrice')} placeholder="0.00" />
                {errors.costPrice && <p className="text-red-500 text-xs mt-1">{errors.costPrice.message}</p>}
              </div>
              <div className="form-group col-span-2">
                <label className="label">Description</label>
                <textarea className={`input ${errors.description ? 'border-red-500' : ''}`} rows={2} {...register('description')} placeholder="Product description..." />
              </div>

              {/* Image Upload */}
              <div className="form-group col-span-2">
                <label className="label">Product Images</label>
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-4 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/30 transition-colors"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files) }}
                >
                  <input ref={fileRef} title="Upload product images" type="file" multiple accept="image/*" className="hidden" onChange={e => handleImageUpload(e.target.files)} />
                  <p className="text-sm text-slate-500">📷 Drag & drop or click to upload images</p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP up to 10MB each</p>
                </div>
                {imageFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {imageFiles.map((url, i) => (
                      <div key={i} className="relative group">
                        <img src={url} alt="" className="w-16 h-16 object-cover rounded-lg border border-slate-200" />
                        <button
                          type="button"
                          onClick={() => setImageFiles(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >&times;</button>
                        {i === 0 && <span className="absolute bottom-0 left-0 right-0 text-center text-white text-[9px] bg-black/60 rounded-b-lg py-0.5">Primary</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-slate-100">
              <button onClick={handleSubmit(onSubmit)} disabled={saving} className="btn-primary flex-1 justify-center">
                {saving ? 'Saving…' : (editProduct ? 'Update Product' : 'Create Product')}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
