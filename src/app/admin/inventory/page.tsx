'use client'
import { useEffect, useState } from 'react'
import { classifyStockLevel } from '@/lib/utils'
import { exportInventoryMatrixPDF } from '@/lib/reports'

export default function InventoryPage() {
  const [data, setData] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [locations, setLocations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/reports?type=inventory').then(r => r.json()),
      fetch('/api/locations').then(r => r.json()),
    ]).then(([reportData, locs]) => {
      setData(reportData.inventoryMatrix || [])
      setLocations(locs)
      // Extract unique products
      const prodMap = new Map<string, any>()
      reportData.inventoryMatrix?.forEach((s: any) => {
        if (!prodMap.has(s.productId)) prodMap.set(s.productId, s.product)
      })
      setProducts(Array.from(prodMap.values()))
      setLoading(false)
    })
  }, [])

  function getStock(productId: string, locationId: string) {
    return data.find(s => s.productId === productId && s.locationId === locationId)
  }

  const warehouses = locations.filter(l => l.type === 'WAREHOUSE')
  const shops = locations.filter(l => l.type === 'SHOP')

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-slate-200 rounded w-48" />
        <div className="card h-96 bg-slate-100" />
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Inventory Matrix</h1>
          <p className="text-sm text-slate-500">Stock levels across all locations</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-3">
            <span className="stock-healthy">● Healthy</span>
            <span className="stock-low">● Low</span>
            <span className="stock-empty">● Empty/Out</span>
          </div>
          <button 
            onClick={() => exportInventoryMatrixPDF(data, products, locations)}
            className="btn-secondary btn-sm"
          >
            📄 Export to PDF
          </button>
        </div>
      </div>

      {/* Smart Alerts */}
      {(() => {
        const lowItems = products.filter(p => {
          const total = data.filter(s => s.productId === p.id).reduce((sum, s) => sum + s.quantity, 0)
          return total <= p.lowStockAt
        })
        if (lowItems.length === 0) return null
        return (
          <div className="bg-orange-50 border border-orange-100 rounded-2xl p-4 flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center flex-shrink-0 text-xl font-bold">⚠️</div>
            <div className="flex-1">
              <h3 className="text-sm font-bold text-orange-800">Low Stock Alert ({lowItems.length} items)</h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {lowItems.slice(0, 5).map(p => (
                  <a key={p.id} href={`/admin/products/${p.id}`} className="bg-white/60 hover:bg-white text-[10px] font-bold text-orange-700 px-2 py-1 rounded-lg border border-orange-200 transition-colors">
                    {p.name} (Refill {Math.ceil(p.lowStockAt * 2)} {p.unit})
                  </a>
                ))}
                {lowItems.length > 5 && <span className="text-[10px] text-orange-500 font-medium">+{lowItems.length - 5} more</span>}
              </div>
            </div>
            <a href="/admin/stock-in" className="btn-secondary btn-sm bg-white border-orange-200 text-orange-700 hover:bg-orange-100">Record Stock-In →</a>
          </div>
        )
      })()}

      <div className="table-container overflow-x-auto">
        <table className="table whitespace-nowrap">
          <thead>
            <tr>
              <th className="sticky left-0 bg-slate-50 z-10 min-w-48">Product / SKU</th>
              {warehouses.map(l => <th key={l.id} className="text-center">{l.name}</th>)}
              {shops.map(l => <th key={l.id} className="text-center">{l.name}</th>)}
              <th className="text-center font-bold">Total</th>
            </tr>
          </thead>
          <tbody>
            {products.length === 0 ? (
              <tr>
                <td colSpan={locations.length + 2} className="text-center py-12 text-slate-400">
                  No inventory data. <a href="/admin/products" className="text-indigo-600 underline">Add products</a> and <a href="/admin/stock-in" className="text-indigo-600 underline">record stock-in</a>.
                </td>
              </tr>
            ) : products.map((product: any) => {
              const total = data
                .filter(s => s.productId === product.id)
                .reduce((sum, s) => sum + s.quantity, 0)
              return (
                <tr key={product.id}>
                  <td className="sticky left-0 bg-white z-10">
                    <div>
                      <p className="font-medium text-sm text-slate-900">{product.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <code className="text-xs text-slate-400">{product.sku}</code>
                        <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: product.category?.color + '22', color: product.category?.color }}>
                          {product.category?.name}
                        </span>
                      </div>
                    </div>
                  </td>
                  {[...warehouses, ...shops].map(loc => {
                    const stock = getStock(product.id, loc.id)
                    const qty = stock?.quantity ?? 0
                    const level = classifyStockLevel(qty, product.lowStockAt)
                    return (
                      <td key={loc.id} className="text-center">
                        {qty > 0 ? (
                          <span className={`stock-${level} font-mono text-sm`}>{qty.toLocaleString()}</span>
                        ) : (
                          <span className="text-slate-300 text-sm">—</span>
                        )}
                      </td>
                    )
                  })}
                  <td className="text-center">
                    <span className={`font-bold stock-${classifyStockLevel(total, product.lowStockAt)}`}>
                      {total.toLocaleString()} {product.unit}
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
