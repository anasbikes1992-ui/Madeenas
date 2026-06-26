'use client'
import { useEffect, useState } from 'react'
import { classifyStockLevel } from '@/lib/utils'
import { toast } from 'react-hot-toast'

export default function InventoryPage() {
  const [data, setData] = useState<any[]>([])
  const [variants, setVariants] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  async function refreshMatrix() {
    const [reportData, locs] = await Promise.all([
      fetch('/api/reports?type=inventory').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()),
    ])
    setData(reportData.inventoryMatrix || [])
    setLocations(locs)
    const variantMap = new Map<string, any>()
    reportData.inventoryMatrix?.forEach((s: any) => {
      if (s.variant && !variantMap.has(s.variantId)) {
        variantMap.set(s.variantId, s.variant)
      }
    })
    setVariants(Array.from(variantMap.values()))
  }

  useEffect(() => {
    refreshMatrix().finally(() => setLoading(false))
  }, [])

  async function handleExport(format: 'xlsx' | 'csv') {
    try {
      const res = await fetch(`/api/inventory/export?format=${format}`)
      if (!res.ok) throw new Error('Failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `inventory-matrix-${new Date().toISOString().slice(0, 10)}.${format}`
      a.click()
      URL.revokeObjectURL(url)
      toast.success(`Inventory exported as ${format.toUpperCase()}`)
    } catch {
      toast.error('Export failed')
    }
  }

  function getStock(variantId: string, locationId: string) {
    return data.find(s => s.variantId === variantId && s.locationId === locationId)
  }

  const warehouses = locations.filter(l => l.type === 'WAREHOUSE')
  const shops = locations.filter(l => l.type === 'SHOP')

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 dark:bg-navy-800 rounded w-48" />
        <div className="card h-96 bg-slate-100 dark:bg-navy-800" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Inventory Matrix</h1>
          <p className="text-sm text-slate-500 dark:text-navy-300">Stock levels across all locations</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div className="flex items-center gap-3 mr-2">
            <span className="stock-healthy">● Healthy</span>
            <span className="stock-low">● Low</span>
            <span className="stock-empty">● Empty/Out</span>
          </div>
          <button onClick={() => handleExport('xlsx')} className="btn-secondary btn-sm">⬇️ XLSX</button>
          <button onClick={() => handleExport('csv')} className="btn-secondary btn-sm">⬇️ CSV</button>
        </div>
      </div>

      {/* Smart Alerts */}
      {(() => {
        const lowItems = variants.filter(v => {
          const total = data.filter(s => s.variantId === v.id).reduce((sum, s) => sum + s.quantity, 0)
          return total <= (v.lowStockThreshold || 0)
        })
        if (lowItems.length === 0) return null
        return (
          <div className="bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/50 rounded-2xl p-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/50 text-orange-600 flex items-center justify-center flex-shrink-0 text-xl font-bold">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-orange-800 dark:text-orange-300">Low Stock Alert ({lowItems.length} items)</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowItems.slice(0, 5).map(v => (
                  <a key={v.id} href={`/admin/products/${v.productId}`} className="bg-white/60 dark:bg-black/20 hover:bg-white dark:hover:bg-black/40 text-[10px] font-bold text-orange-700 dark:text-orange-400 px-2 py-1 rounded-lg border border-orange-200 dark:border-orange-800/50 transition-colors">
                    {v.product?.name} ({v.colorName}) - Refill {Math.ceil((v.lowStockThreshold || 0) * 2)} {v.stockUnit}
                  </a>
                ))}
                {lowItems.length > 5 && <span className="text-[10px] text-orange-500 font-medium">+{lowItems.length - 5} more</span>}
              </div>
            </div>
          </div>
        )
      })()}

      <div className="table-container overflow-x-auto">
        <table className="table whitespace-nowrap">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-50 dark:bg-navy-900 z-10 min-w-64">Product Variant / SKU</th>
              {warehouses.map(l => <th key={l.id} className="text-center">{l.name}</th>)}
              {shops.map(l => <th key={l.id} className="text-center">{l.name}</th>)}
              <th className="text-center font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {variants.length === 0 ? (
              <tr>
                <td colSpan={locations.length + 2} className="text-center py-12 text-slate-400">
                  No inventory data.
                </td>
              </tr>
            ) : variants.map((variant: any) => {
              const total = data
                .filter(s => s.variantId === variant.id)
                .reduce((sum, s) => sum + s.quantity, 0)
              
              const lowThreshold = variant.lowStockThreshold || 0

              return (
                <tr key={variant.id}>
                  <td className="sticky left-0 bg-white dark:bg-navy-950 z-10">
                    <div>
                      <p className="font-medium text-sm text-slate-900 dark:text-white">
                        {variant.product?.name}
                        {variant.colorName && <span className="text-slate-500 ml-1">— {variant.colorName}</span>}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs text-slate-400 dark:text-navy-300">{variant.sku}</code>
                        {variant.product?.category && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: variant.product.category.color + '22', color: variant.product.category.color }}>
                            {variant.product.category.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  {[...warehouses, ...shops].map(loc => {
                    const stock = getStock(variant.id, loc.id)
                    const qty = stock?.quantity ?? 0
                    const level = classifyStockLevel(qty, lowThreshold)
                    return (
                      <td key={loc.id} className="text-center">
                        {qty > 0 ? (
                          <span className={`stock-${level} font-mono text-sm`}>
                            {qty.toLocaleString()}
                            <span className="block text-[10px] text-slate-500 dark:text-navy-400 font-normal mt-0.5">
                              {variant.stockUnit}
                            </span>
                          </span>
                        ) : (
                          <span className="text-slate-300 dark:text-navy-600 text-sm">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="text-center">
                    <span className={`font-bold stock-${classifyStockLevel(total, lowThreshold)}`}>
                      {total.toLocaleString()}
                      <span className="block text-[10px] text-slate-500 dark:text-navy-400 font-normal mt-0.5">
                        {variant.stockUnit}
                      </span>
                    </span>
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
