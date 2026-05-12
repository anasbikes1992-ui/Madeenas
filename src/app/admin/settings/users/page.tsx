'use client'
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

interface User {
  id: string
  name: string
  email: string
  role: string
  location?: { name: string }
}

export default function UsersPage() {
  const { data: session } = useSession()
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUsers()
  }, [])

  async function loadUsers() {
    try {
      const response = await fetch('/api/users')
      if (response.ok) {
        const data = await response.json()
        setUsers(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Failed to load users:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">Users</h1>
        <p>Loading...</p>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Users</h1>
      <div className="space-y-4">
        {users.length === 0 ? (
          <p className="text-slate-500">No users found</p>
        ) : (
          users.map((user) => (
            <div key={user.id} className="card p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{user.name}</h3>
                  <p className="text-sm text-slate-500">{user.email}</p>
                  {user.location && <p className="text-sm text-slate-400 mt-1">{user.location.name}</p>}
                </div>
                <span className="badge badge-blue">{user.role}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
