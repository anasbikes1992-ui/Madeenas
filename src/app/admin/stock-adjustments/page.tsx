'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  CheckCircle2,
  ClipboardList,
  Info,
  MapPin,
  Package,
  RefreshCw,
  SlidersHorizontal,
  XCircle,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

type FlatVariant = {
  id: string
  sku: string
  colorName: string
  stockUnitLabel: string
  productName: string
}

type LocationOption = {
  id: string
  name: string
  type: string
}

type AdjustmentRow = {
  id: string
  previousQuantity: number
  countedQuantity: number
  delta: number
  reason: string | null
  note: string | null
  createdAt: string
  user: { id: string; name: string; role: string }
  variant: {
    id: string
    sku: string
    colorName: string
    stockUnitLabel: string
    product: { id: string; name: string }
  }
  location: { id: string; name: string; type: string }
}

type Toast = { message: string; type: 'success' | 'error' | 'info' }

// ─── Constants ────────────────────────────────────────────────────────────────

const REASONS = [
  { value: 'STOCKTAKE',  label: 'Stocktake',  color: 'badge-blue'   },
  { value: 'DAMAGE',     label: 'Damage',      color: 'badge-red'    },
  { value: 'THEFT',      label: 'Theft',       color: 'badge-red'    },
  { value: 'WRITE_OFF',  label: 'Write-Off',   color: 'badge-amber'  },
  { value: 'CORRECTION', label: 'Correction',  color: 'badge-indigo' },
  { value: 'EXPIRY',     label: 'Expiry',      color: 'badge-purple' },
  { value: 'OTHER',      label: 'Other',       color: 'badge-gray'   },
] as const

type ReasonValue = (typeof REASONS)[number]['value'] | ''

function ReasonBadge({ reason }: { reason: string | null }) {
  const match = REASONS.find((r) => r.value === reason)
  return (
    <span className={match?.color ?? 'badge-gray'}>
      {match?.label ?? reason ?? '—'}
    </span>
  )
}

// ─── Sub-component: StatPill ──────────────────────────────────────────────────

function StatPill({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode
  label: string
  value: number
  loading: boolean
}) {
  return (
    <div className="rounded-2xl bg-white/15 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-indigo-200">
        {icon}
        {label}
      </div>
      {loading ? (
        <div className="mt-1.5 h-7 w-12 animate-pulse rounded-lg bg-white/20" />
      ) : (
        <p className="mt-1 text-2xl font-black">{value}</p>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StockAdjustmentsPage() {
  // data
  const [variants, setVariants]   = useState<FlatVariant[]>([])
  const [locations, setLocations] = useState<LocationOption[]>([])
  const [rows, setRows]           = useState<AdjustmentRow[]>([])
  const [loading, setLoading]     = useState(true)

  // form
  const emptyForm = {
    variantId:       '',
    locationId:      '',
    countedQuantity: '',
    reason:          '' as ReasonValue,
    note:            '',
  }
  const [form, setForm]     = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // toast
  const [toast, setToast] = useState<Toast | null>(null)
  function showToast(message: string, type: Toast['type'] = 'info') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 5000)
  }

  // derived
  const selectedVariant = useMemo(
    () => variants.find((v) => v.id === form.variantId) ?? null,
    [variants, form.variantId]
  )

  // ── Data loading ─────────────────────────────────────────────────────────

  async function loadAll() {
    setLoading(true)
    try {
      const [productsRes, locationsRes, adjustmentsRes] = await Promise.all([
        fetch('/api/products?limit=500'),
        fetch('/api/locations'),
        fetch('/api/stock-adjustments?limit=100'),
      ])

      const productsData    = await productsRes.json()
      const locationsData   = await locationsRes.json()
      const adjustmentsData = await adjustmentsRes.json()

      // Flatten products → variants
      const flat: FlatVariant[] = []
      for (const product of productsData.products ?? []) {
        for (const variant of product.variants ?? []) {
          flat.push({
            id:             variant.id,
            sku:            variant.sku,
            colorName:      variant.colorName,
            stockUnitLabel: variant.stockUnitLabel ?? variant.stockUnit ?? 'units',
            productName:    product.name,
          })
        }
      }

      setVariants(flat)
      setLocations(locationsData ?? [])
      setRows(adjustmentsData.adjustments ?? [])
    } catch {
      showToast('Failed to load data. Please refresh.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void loadAll() }, [])

  // ── Submit ───────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.variantId)             return showToast('Please select a variant.', 'error')
    if (!form.locationId)            return showToast('Please select a location.', 'error')
    if (form.countedQuantity === '') return showToast('Enter the counted quantity.', 'error')
    if (!form.reason)                return showToast('Please choose a reason.', 'error')

    setSaving(true)
    try {
      const res = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId:       form.variantId,
          locationId:      form.locationId,
          countedQuantity: Number(form.countedQuantity),
          reason:          form.reason || undefined,
          note:            form.note.trim() || undefined,
        }),
      })

      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast(payload.error ?? 'Failed to save adjustment.', 'error')
        return
      }

      const delta: number = payload.delta ?? 0
      const sign = delta > 0 ? '+' : ''
      showToast(
        `Adjustment saved! Delta: ${sign}${delta} ${selectedVariant?.stockUnitLabel ?? ''}`,
        'success'
      )
      setForm(emptyForm)
      void loadAll()
    } catch {
      showToast('Network error — please try again.', 'error')
    } finally {
      setSaving(false)
    }
  }

  // helper: onChange factory
  function field<K extends keyof typeof emptyForm>(key: K) {
    return (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >
    ) => setForm((f) => ({ ...f, [key]: e.target.value as never }))
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 fade-in">

      {/* ── Hero header ─────────────────────────────────────────────────── */}
      <div className="rounded-3xl bg-gradient-to-r from-violet-700 via-indigo-700 to-blue-700 p-6 text-white shadow-[0_24px_70px_rgba(109,40,217,0.28)]">
        <div className="flex items-start gap-4">
          <div className="rounded-2xl bg-white/15 p-3">
            <SlidersHorizontal className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tight">Stock Adjustments</h1>
            <p className="mt-1 text-sm text-indigo-200">
              Physical count corrections, damage, theft, write-offs — with full audit trail.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatPill
            icon={<Package className="h-4 w-4" />}
            label="Variants"
            value={variants.length}
            loading={loading}
          />
          <StatPill
            icon={<MapPin className="h-4 w-4" />}
            label="Locations"
            value={locations.length}
            loading={loading}
          />
          <StatPill
            icon={<ClipboardList className="h-4 w-4" />}
            label="Recent Entries"
            value={rows.length}
            loading={loading}
          />
        </div>
      </div>

      {/* ── Adjustment form ─────────────────────────────────────────────── */}
      <div className="card">
        <div className="mb-5 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-100 p-2">
            <SlidersHorizontal className="h-5 w-5 text-indigo-700" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">New Adjustment</h2>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">

          {/* Row 1: Variant + Location */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div className="form-group">
              <label className="label">Product / Variant *</label>
              <select
                className="input"
                value={form.variantId}
                onChange={field('variantId')}
                required
              >
                <option value="">— Select variant —</option>
                {variants.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.productName} — {v.colorName} ({v.sku})
                  </option>
                ))}
              </select>
              {selectedVariant && (
                <p className="mt-1 text-xs text-slate-400">
                  Unit:{' '}
                  <span className="font-medium text-slate-600">
                    {selectedVariant.stockUnitLabel}
                  </span>
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="label">Location *</label>
              <select
                className="input"
                value={form.locationId}
                onChange={field('locationId')}
                required
              >
                <option value="">— Select location —</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    [{l.type}] {l.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Row 2: Counted Qty + Reason */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">

            <div className="form-group">
              <label className="label">
                Counted Quantity *
                {selectedVariant && (
                  <span className="ml-1 font-normal text-slate-400">
                    ({selectedVariant.stockUnitLabel})
                  </span>
                )}
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input"
                value={form.countedQuantity}
                onChange={field('countedQuantity')}
                placeholder="Enter physical count"
                required
              />
              <p className="mt-1 text-xs text-slate-400">
                The actual quantity you physically counted — the system calculates the delta automatically.
              </p>
            </div>

            <div className="form-group">
              <label className="label">Reason *</label>
              <select
                className="input"
                value={form.reason}
                onChange={field('reason')}
                required
              >
                <option value="">— Select reason —</option>
                {REASONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Note */}
          <div className="form-group">
            <label className="label">
              Internal Note{' '}
              <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              className="input"
              rows={2}
              value={form.note}
              onChange={field('note')}
              placeholder="e.g. Found during annual stocktake in shelf B3…"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-1">
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Save Adjustment
                </>
              )}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setForm(emptyForm)}
              disabled={saving}
            >
              Clear
            </button>
          </div>
        </form>
      </div>

      {/* ── History table ────────────────────────────────────────────────── */}
      <div className="card">
        <div className="mb-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-slate-100 p-2">
              <ClipboardList className="h-5 w-5 text-slate-600" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Adjustment History
              {!loading && rows.length > 0 && (
                <span className="ml-2 text-sm font-normal text-slate-400">
                  ({rows.length} records)
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={() => void loadAll()}
            className="btn-secondary btn-sm"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-14 text-slate-400">
            <ClipboardList className="h-10 w-10 opacity-40" />
            <p className="text-sm font-medium">No adjustments recorded yet.</p>
            <p className="text-xs">Fill the form above to record your first stock adjustment.</p>
          </div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Product / Variant</th>
                  <th>Location</th>
                  <th>Prev Qty → Counted</th>
                  <th>Delta</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>Adjusted By</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const delta = row.delta ?? row.countedQuantity - row.previousQuantity
                  const isPos = delta > 0
                  const isNeg = delta < 0
                  const unit  = row.variant?.stockUnitLabel ?? ''

                  return (
                    <tr key={row.id}>

                      {/* Product / Variant */}
                      <td>
                        <div className="font-medium text-slate-900">
                          {row.variant?.product?.name ?? '—'}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-400">
                          <span className="font-mono">{row.variant?.sku}</span>
                          {row.variant?.colorName && (
                            <>
                              <span>·</span>
                              <span>{row.variant.colorName}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Location */}
                      <td>
                        <div className="text-sm font-medium text-slate-700">
                          {row.location?.name ?? '—'}
                        </div>
                        <div className="text-xs text-slate-400">{row.location?.type}</div>
                      </td>

                      {/* Prev → Counted */}
                      <td>
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-mono text-slate-500">{row.previousQuantity}</span>
                          <span className="text-slate-300">→</span>
                          <span className="font-mono font-semibold text-slate-800">
                            {row.countedQuantity}
                          </span>
                          {unit && (
                            <span className="text-xs text-slate-400">{unit}</span>
                          )}
                        </div>
                      </td>

                      {/* Delta */}
                      <td>
                        <span
                          className={[
                            'inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold font-mono',
                            isPos ? 'bg-emerald-50 text-emerald-700'
                              : isNeg ? 'bg-red-50 text-red-700'
                              : 'bg-slate-50 text-slate-500',
                          ].join(' ')}
                        >
                          {isPos ? '+' : ''}{delta}
                        </span>
                      </td>

                      {/* Reason badge */}
                      <td>
                        <ReasonBadge reason={row.reason} />
                      </td>

                      {/* Note */}
                      <td className="max-w-[180px]">
                        {row.note ? (
                          <span
                            className="line-clamp-2 text-xs text-slate-500"
                            title={row.note}
                          >
                            {row.note}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>

                      {/* Adjusted By */}
                      <td>
                        <span className="text-sm text-slate-700">
                          {row.user?.name ?? '—'}
                        </span>
                      </td>

                      {/* Date */}
                      <td>
                        <div className="text-xs text-slate-500">
                          {new Date(row.createdAt).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(row.createdAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Toast ────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={
            toast.type === 'success'
              ? 'toast-success'
              : toast.type === 'error'
              ? 'toast-error'
              : 'toast-info'
          }
        >
          {toast.type === 'success' && (
            <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          )}
          {toast.type === 'error' && (
            <XCircle className="h-5 w-5 shrink-0 text-red-600" />
          )}
          {toast.type === 'info' && (
            <Info className="h-5 w-5 shrink-0 text-indigo-600" />
          )}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  )
}
