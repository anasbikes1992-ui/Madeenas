'use client'
import { useCallback, useEffect, useState } from 'react'

interface Location {
  id: string
  name: string
  code: string
  type: string
  address?: string
  isActive: boolean
  stocks?: Array<Record<string, unknown>>
}

export default function LocationsDebugPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)

  const loadLocations = useCallback(async () => {
    try {
      const response = await fetch('/api/locations')
      if (response.ok) {
        const data = await response.json()
        setLocations(Array.isArray(data) ? (data as Location[]) : [])
      }
    } catch (error) {
      console.error('Failed to load locations:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadLocations()
  }, [loadLocations])

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Locations Debug</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Locations Debug</h1>
      <div className="space-y-4">
        {locations.length === 0 ? (
          <p className="text-slate-500">No locations found</p>
        ) : (
          locations.map((location) => (
            <div key={location.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{location.name}</h3>
                  <p className="text-sm text-slate-500">{location.code} - {location.type}</p>
                  {location.address && <p className="text-sm text-slate-400 mt-1">{location.address}</p>}
                </div>
                <span className={`badge ${location.isActive ? 'badge-green' : 'badge-gray'}`}>
                  {location.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
