'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { productSchema, type ProductFormData } from '@/lib/validations'
import { toast } from 'react-hot-toast'
import { ArrowLeft, Plus, Trash2 } from 'lucide-react'

export default function NewProductPage() {
  const router = useRouter()
  const [categories, setCategories] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [saving, setSaving] = useState(false)

  const { register, control, handleSubmit, formState: { errors }, watch, setValue } = useForm<any>({
    resolver: zodResolver(productSchema) as any,
    defaultValues: {
      name: '',
      categoryId: '',
      description: '',
      variants: [{
        sku: `TXT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        colorName: '',
        colorHex: '#6366f1',
        stockUnit: '',
        stockUnitLabel: '',
        altUnit: '',
        altUnitLabel: '',
        saleUnit: '',
        saleUnitLabel: '',
        saleToStockFactor: 1,
        costPrice: null,
        salePrice: null,
        lowStockAt: 10
      }]
    }
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'variants'
  })

  useEffect(() => {
    async function fetchData() {
      const [catsRes, unitsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/settings/units')
      ])
      setCategories(await catsRes.json())
      setUnits(await unitsRes.json())
    }
    fetchData()
  }, [])

  const onSubmit = async (data: ProductFormData) => {
    setSaving(true)
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    setSaving(false)

    if (res.ok) {
      toast.success('Product created successfully!')
      router.push('/admin/products')
    } else {
      const err = await res.json()
      toast.error(err.error || 'Failed to create product')
    }
  }

  return (
    <div className="space-y-6 fade-in max-w-5xl mx-auto">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Add New Product</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Master Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Product Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Product Name *</label>
              <input {...register('name')} className="input" placeholder="e.g. Century Gold Fabric" />
              {(errors as any).name && <p className="text-red-500 text-sm mt-1">{(errors as any).name.message}</p>}
            </div>
            <div>
              <label className="label">Category *</label>
              <select {...register('categoryId')} className="input">
                <option value="">Select Category</option>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {(errors as any).categoryId && <p className="text-red-500 text-sm mt-1">{(errors as any).categoryId.message}</p>}
            </div>
            <div className="md:col-span-2">
              <label className="label">Description</label>
              <textarea {...register('description')} className="input min-h-[100px]" placeholder="Optional description..." />
            </div>
          </div>
        </div>

        {/* Detail Section - Variants */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-lg font-semibold text-slate-800">Product Variants</h2>
            <button 
              type="button" 
              onClick={() => append({
                sku: `TXT-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                colorName: '',
                colorHex: '#6366f1',
                stockUnit: 'meters',
                stockUnitLabel: 'Meters',
                altUnit: '',
                altUnitLabel: '',
                saleUnit: 'meters',
                saleUnitLabel: 'Meters',
                saleToStockFactor: 1,
                costPrice: null,
                salePrice: null,
                lowStockAt: 10
              })} 
              className="btn-secondary text-sm flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Add Variant
            </button>
          </div>
          
          {(errors as any).variants?.root && <p className="text-red-500 text-sm">{(errors as any).variants.root.message}</p>}

          <div className="space-y-6">
            {fields.map((field, index) => (
              <div key={field.id} className="p-4 border rounded-lg bg-slate-50 relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {fields.length > 1 && (
                    <button type="button" onClick={() => remove(index)} className="p-1.5 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                
                <h3 className="font-medium text-slate-700 mb-3">Variant #{index + 1}</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="label text-xs">SKU *</label>
                    <input {...register(`variants.${index}.sku`)} className="input" />
                    {(errors as any).variants?.[index]?.sku && <p className="text-red-500 text-xs mt-1">{(errors as any).variants[index]?.sku?.message}</p>}
                  </div>
                  <div>
                    <label className="label text-xs">Color Name *</label>
                    <input {...register(`variants.${index}.colorName`)} className="input" placeholder="e.g. Navy Blue" />
                    {(errors as any).variants?.[index]?.colorName && <p className="text-red-500 text-xs mt-1">{(errors as any).variants[index]?.colorName?.message}</p>}
                  </div>
                  <div>
                    <label className="label text-xs">Color Hex</label>
                    <div className="flex gap-2">
                      <input type="color" {...register(`variants.${index}.colorHex`)} className="h-10 w-10 p-1 rounded cursor-pointer" />
                      <input {...register(`variants.${index}.colorHex`)} className="input flex-1" />
                    </div>
                  </div>
                  <div>
                    <label className="label text-xs">Cost Price</label>
                    <input type="number" step="0.01" {...register(`variants.${index}.costPrice`)} className="input" placeholder="0.00" />
                  </div>
                  
                  <div>
                    <label className="label text-xs">Stock Unit *</label>
                    <input
                      list="unitsList"
                      {...register(`variants.${index}.stockUnit`)}
                      className="input"
                      placeholder="e.g. m, pcs"
                      onChange={(e) => {
                        const val = e.target.value
                        const u = units.find(x => x.abbreviation === val || x.name === val)
                        if (u) {
                          setValue(`variants.${index}.stockUnit`, u.abbreviation)
                          setValue(`variants.${index}.stockUnitLabel`, u.name)
                        } else {
                          setValue(`variants.${index}.stockUnit`, val)
                          setValue(`variants.${index}.stockUnitLabel`, val)
                        }
                      }}
                    />
                  </div>
                  <div className="hidden">
                    <input {...register(`variants.${index}.stockUnitLabel`)} />
                  </div>
                  <div>
                    <label className="label text-xs">Alt Unit (Optional)</label>
                    <input
                      list="unitsList"
                      {...register(`variants.${index}.altUnit`)}
                      className="input"
                      placeholder="e.g. roll, box"
                      onChange={(e) => {
                        const val = e.target.value
                        const u = units.find(x => x.abbreviation === val || x.name === val)
                        if (u) {
                          setValue(`variants.${index}.altUnit`, u.abbreviation)
                          setValue(`variants.${index}.altUnitLabel`, u.name)
                        } else {
                          setValue(`variants.${index}.altUnit`, val)
                          setValue(`variants.${index}.altUnitLabel`, val)
                        }
                      }}
                    />
                  </div>
                  <div className="hidden">
                    <input {...register(`variants.${index}.altUnitLabel`)} />
                  </div>
                  
                  <div>
                    <label className="label text-xs">Sale Unit *</label>
                    <input
                      list="unitsList"
                      {...register(`variants.${index}.saleUnit`)}
                      className="input"
                      placeholder="e.g. m, pcs"
                      onChange={(e) => {
                        const val = e.target.value
                        const u = units.find(x => x.abbreviation === val || x.name === val)
                        if (u) {
                          setValue(`variants.${index}.saleUnit`, u.abbreviation)
                          setValue(`variants.${index}.saleUnitLabel`, u.name)
                          
                          // Check if conversion exists from saleUnit to stockUnit
                          const stockAbbr = watch(`variants.${index}.stockUnit`)
                          if (stockAbbr && stockAbbr !== u.abbreviation) {
                            const stockUnit = units.find(x => x.abbreviation === stockAbbr)
                            const conversion = u.conversionsFrom?.find((c: any) => c.toUnitId === stockUnit?.id)
                            if (conversion) {
                              setValue(`variants.${index}.saleToStockFactor`, conversion.factor)
                            }
                          } else if (stockAbbr === u.abbreviation) {
                            setValue(`variants.${index}.saleToStockFactor`, 1)
                          }
                        } else {
                          setValue(`variants.${index}.saleUnit`, val)
                          setValue(`variants.${index}.saleUnitLabel`, val)
                        }
                      }}
                    />
                  </div>
                  <div className="hidden">
                    <input {...register(`variants.${index}.saleUnitLabel`)} />
                  </div>
                  <div>
                    <label className="label text-xs">Sale to Stock Factor *</label>
                    <input type="number" step="0.0001" {...register(`variants.${index}.saleToStockFactor`)} className="input" title="1 Sale Unit = X Stock Units" />
                  </div>
                  <div>
                    <label className="label text-xs">Low Stock Threshold</label>
                    <input type="number" {...register(`variants.${index}.lowStockAt`)} className="input" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6">
          <button type="button" onClick={() => router.back()} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={saving} className="btn-primary min-w-[140px]">
            {saving ? 'Saving...' : 'Save Product'}
          </button>
        </div>
      </form>
      
      <datalist id="unitsList">
        {units.map(u => <option key={u.id} value={u.abbreviation}>{u.name}</option>)}
      </datalist>
    </div>
  )
}
