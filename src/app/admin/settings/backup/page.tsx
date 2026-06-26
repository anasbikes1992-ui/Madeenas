'use client'
import { useState } from 'react'
import { Database, Download, RefreshCw, CheckCircle, AlertCircle, Package, BarChart2, Users, ShoppingCart, ArrowLeftRight } from 'lucide-react'

interface TableInfo {
  table: string
  rowCount: number
}

interface BackupResult {
  success: boolean
  fileName: string
  generatedAt: string
  totalTables: number
  totalRows: number
  sizeBytes: number
  preview: TableInfo[]
}

const TABLE_ICONS: Record<string, any> = {
  users: Users,
  products: Package,
  stocks: BarChart2,
  sales: ShoppingCart,
  stockTransfers: ArrowLeftRight,
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
}

export default function BackupPage() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<BackupResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloading, setDownloading] = useState(false)

  async function runBackup() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch('/api/admin/backup')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Backup failed')
      setResult(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function downloadBackup() {
    setDownloading(true)
    try {
      const res = await fetch('/api/admin/backup?format=download')
      if (!res.ok) throw new Error('Download failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = result?.fileName || `madeena-backup-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="space-y-8 fade-in max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Backup &amp; Data</h1>
        <p className="text-sm text-slate-500 mt-1">Export a full database snapshot as a JSON backup file.</p>
      </div>

      {/* Backup Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Database Backup</h2>
              <p className="text-indigo-200 text-sm">Create a complete snapshot of all your data</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          {result ? (
            <div className="space-y-6">
              {/* Success banner */}
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl flex items-center gap-3 text-green-700">
                <CheckCircle className="w-5 h-5 flex-shrink-0" />
                <div>
                  <p className="font-medium text-sm">Backup generated successfully</p>
                  <p className="text-xs text-green-600 mt-0.5">
                    {result.totalRows.toLocaleString()} rows across {result.totalTables} tables · {formatBytes(result.sizeBytes)}
                  </p>
                </div>
              </div>

              {/* Table breakdown */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {result.preview?.map((t) => {
                  const Icon = TABLE_ICONS[t.table] || Database
                  return (
                    <div key={t.table} className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-4 h-4 text-indigo-500" />
                        <span className="text-xs font-medium text-slate-600 capitalize">{t.table}</span>
                      </div>
                      <p className="text-xl font-bold text-slate-900">{t.rowCount.toLocaleString()}</p>
                      <p className="text-xs text-slate-400">records</p>
                    </div>
                  )
                })}
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={downloadBackup}
                  disabled={downloading}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {downloading ? 'Downloading...' : 'Download JSON'}
                </button>
                <button onClick={runBackup} disabled={loading} className="btn-secondary flex items-center gap-2">
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Regenerate
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Database className="w-8 h-8 text-indigo-400" />
              </div>
              <p className="text-slate-600 mb-2">No backup generated yet.</p>
              <p className="text-sm text-slate-400 mb-6">
                Click the button below to create a full JSON snapshot of all your products, stock, sales, and customers.
              </p>
              <button
                onClick={runBackup}
                disabled={loading}
                className="btn-primary inline-flex items-center gap-2 px-6"
              >
                {loading ? (
                  <><RefreshCw className="w-4 h-4 animate-spin" /> Generating backup...</>
                ) : (
                  <><Database className="w-4 h-4" /> Generate Backup Now</>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-2">📦 What's included</h3>
          <ul className="space-y-1 text-sm text-slate-600">
            <li>✓ Products &amp; Variants</li>
            <li>✓ Stock levels (all locations)</li>
            <li>✓ Stock In records</li>
            <li>✓ Stock Transfers</li>
            <li>✓ Sales &amp; Sale Items</li>
            <li>✓ Customers &amp; Orders</li>
            <li>✓ Users &amp; Locations</li>
          </ul>
        </div>
        <div className="bg-white rounded-xl border border-slate-100 p-5 shadow-sm">
          <h3 className="font-semibold text-slate-800 mb-2">🔒 Automated Backups</h3>
          <p className="text-sm text-slate-600">
            Automated hourly backups are sent via email when configured.
            The backup is compressed and sent as a JSON attachment.
          </p>
          <p className="text-sm text-slate-500 mt-3">
            Configure <code className="bg-slate-100 px-1 rounded text-xs">BACKUP_ENABLED=true</code> and{' '}
            <code className="bg-slate-100 px-1 rounded text-xs">BACKUP_EMAIL</code> in your environment to enable.
          </p>
        </div>
      </div>
    </div>
  )
}
