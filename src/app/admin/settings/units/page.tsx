'use client'

import { useState, useEffect } from 'react'
import { toast } from 'react-hot-toast'
import { Plus, Trash2, ArrowRight } from 'lucide-react'

export default function UnitsSettings() {
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Modals state
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [showConvModal, setShowConvModal] = useState(false)

  // Forms
  const [unitForm, setUnitForm] = useState({ name: '', abbreviation: '' })
  const [convForm, setConvForm] = useState({ fromUnitId: '', toUnitId: '', factor: '' })

  const fetchUnits = async () => {
    try {
      const res = await fetch('/api/settings/units')
      const data = await res.json()
      setUnits(data)
    } catch (e) {
      toast.error('Failed to load units')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnits()
  }, [])

  const handleCreateUnit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/settings/units', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(unitForm)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Unit created!')
      setShowUnitModal(false)
      setUnitForm({ name: '', abbreviation: '' })
      fetchUnits()
    } catch (e: any) {
      toast.error(e.message || 'Failed to create unit')
    }
  }

  const handleDeleteUnit = async (id: string) => {
    if (!confirm('Are you sure? This might break products using this unit!')) return
    try {
      const res = await fetch(`/api/settings/units/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Unit deleted')
      fetchUnits()
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete unit')
    }
  }

  const handleCreateConv = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await fetch('/api/settings/conversions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(convForm)
      })
      if (!res.ok) throw new Error((await res.json()).error)
      toast.success('Conversion added!')
      setShowConvModal(false)
      setConvForm({ fromUnitId: '', toUnitId: '', factor: '' })
      fetchUnits()
    } catch (e: any) {
      toast.error(e.message || 'Failed to add conversion')
    }
  }

  const handleDeleteConv = async (id: string) => {
    if (!confirm('Are you sure?')) return
    try {
      const res = await fetch(`/api/settings/conversions/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      toast.success('Conversion deleted')
      fetchUnits()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  if (loading) return <div className="p-4 animate-pulse">Loading units...</div>

  return (
    <div className="space-y-6 fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Unit Matrix</h1>
          <p className="text-sm text-slate-500 dark:text-navy-300">Manage standard units and their conversions</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Units List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg dark:text-white">Standard Units</h2>
            <button onClick={() => setShowUnitModal(true)} className="btn-primary btn-sm flex items-center gap-1">
              <Plus className="w-4 h-4" /> Add Unit
            </button>
          </div>
          
          <div className="space-y-3">
            {units.length === 0 ? <p className="text-slate-400 text-sm">No units found.</p> : null}
            {units.map(u => (
              <div key={u.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-navy-800 rounded-xl bg-slate-50/50 dark:bg-navy-900/50">
                <div>
                  <div className="font-bold text-slate-800 dark:text-white">{u.name}</div>
                  <div className="text-xs text-slate-500 font-mono">Abbr: {u.abbreviation}</div>
                </div>
                <button onClick={() => handleDeleteUnit(u.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Conversions List */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg dark:text-white">Conversions</h2>
            <button onClick={() => setShowConvModal(true)} className="btn-primary btn-sm flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700">
              <Plus className="w-4 h-4" /> Add Conversion
            </button>
          </div>

          <div className="space-y-3">
            {units.flatMap(u => u.conversionsFrom).length === 0 ? <p className="text-slate-400 text-sm">No conversions found.</p> : null}
            {units.flatMap(u => u.conversionsFrom).map((c: any) => (
              <div key={c.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-navy-800 rounded-xl bg-slate-50/50 dark:bg-navy-900/50">
                <div className="flex items-center gap-3 text-sm font-medium dark:text-white">
                  <span>1 {units.find(u => u.id === c.fromUnitId)?.abbreviation}</span>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">{c.factor} {c.toUnit?.abbreviation}</span>
                </div>
                <button onClick={() => handleDeleteConv(c.id)} className="text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 p-2 rounded-lg transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showUnitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-navy-950 rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-bold text-lg mb-4 dark:text-white">Add Unit</h3>
            <form onSubmit={handleCreateUnit} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 dark:text-navy-300">Name (e.g., Yards)</label>
                <input required value={unitForm.name} onChange={e => setUnitForm({...unitForm, name: e.target.value})} className="input w-full dark:bg-navy-900 dark:border-navy-700 dark:text-white" />
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-navy-300">Abbreviation (e.g., yd)</label>
                <input required value={unitForm.abbreviation} onChange={e => setUnitForm({...unitForm, abbreviation: e.target.value})} className="input w-full dark:bg-navy-900 dark:border-navy-700 dark:text-white" />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowUnitModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Unit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showConvModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white dark:bg-navy-950 rounded-2xl w-full max-w-sm shadow-xl p-6">
            <h3 className="font-bold text-lg mb-4 dark:text-white">Add Conversion</h3>
            <form onSubmit={handleCreateConv} className="space-y-4">
              <div>
                <label className="block text-sm mb-1 dark:text-navy-300">From Unit</label>
                <select required value={convForm.fromUnitId} onChange={e => setConvForm({...convForm, fromUnitId: e.target.value})} className="input w-full dark:bg-navy-900 dark:border-navy-700 dark:text-white">
                  <option value="">Select...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-navy-300">To Unit</label>
                <select required value={convForm.toUnitId} onChange={e => setConvForm({...convForm, toUnitId: e.target.value})} className="input w-full dark:bg-navy-900 dark:border-navy-700 dark:text-white">
                  <option value="">Select...</option>
                  {units.map(u => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm mb-1 dark:text-navy-300">Multiplier Factor</label>
                <input required type="number" step="0.0001" value={convForm.factor} onChange={e => setConvForm({...convForm, factor: e.target.value})} className="input w-full dark:bg-navy-900 dark:border-navy-700 dark:text-white" placeholder="e.g. 0.9144" />
                <p className="text-xs text-slate-500 mt-1">1 [From] = [Factor] [To]</p>
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <button type="button" onClick={() => setShowConvModal(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary bg-emerald-600">Save Conversion</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
