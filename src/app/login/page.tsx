'use client'
import { useState, FormEvent, useEffect } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { getDashboardPath } from '@/lib/constants'

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Handle NextAuth error codes passed via query string
  useEffect(() => {
    const authError = searchParams.get('error')
    if (authError === 'Configuration') {
      setError('Server configuration error. Please contact the administrator.')
    } else if (authError === 'CredentialsSignin') {
      setError('Invalid email or password.')
    } else if (authError) {
      setError(`Authentication error: ${authError}`)
    }
  }, [searchParams])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      if (result.error === 'Configuration') {
        setError('Server configuration error. Please contact the administrator.')
      } else {
        setError('Invalid email or password.')
      }
    } else if (result?.ok) {
      // Get session to determine role-based redirect
      const session = await getSession()
      const role = (session?.user as any)?.role || ''
      router.push(getDashboardPath(role))
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">TextileStock</span>
        </div>
        <div>
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Raw Materials<br/>Stock Management<br/>System
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed">
            Track every meter, roll, and bundle across all your warehouses and shops — from stock-in to delivery, with complete financial reconciliation.
          </p>
          <div className="mt-10 grid grid-cols-3 gap-6">
            {[
              { label: 'Warehouses', val: '8+' },
              { label: 'Product SKUs', val: '500+' },
              { label: 'Roles', val: '7' },
            ].map(s => (
              <div key={s.label} className="bg-white/10 rounded-2xl p-4 text-center">
                <div className="text-3xl font-bold">{s.val}</div>
                <div className="text-sm text-indigo-300 mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <p className="text-indigo-400 text-sm">© {new Date().getFullYear()} TextileStock. All rights reserved.</p>
      </div>

      {/* Right panel - Login form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <span className="font-bold text-indigo-900 text-lg">Madeena Tex</span>
          </div>

          <div className="card">
            <h2 className="text-2xl font-bold text-slate-900 mb-1">Welcome back</h2>
            <p className="text-slate-500 text-sm mb-8">Sign in to your account to continue</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="form-group">
                <label htmlFor="email" className="label">Email address</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input"
                  placeholder="you@company.com"
                />
              </div>
              <div className="form-group">
                <label htmlFor="password" className="label">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input"
                  placeholder="••••••••"
                />
              </div>
              {error && (
                <div className="rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3 text-base"
              >
                {loading ? (
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : 'Sign in'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-3">Demo accounts:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { role: 'Super Admin', email: 'madeenas.lk@gmail.com', pass: '123456' },
                  { role: 'Manager', email: 'manager.wh@textilestock.com', pass: 'password123' },
                  { role: 'Store Keeper', email: 'storekeeper@textilestock.com', pass: 'password123' },
                  { role: 'Finance', email: 'finance@textilestock.com', pass: 'password123' },
                ].map(u => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => { setEmail(u.email); setPassword(u.pass) }}
                    className="text-left bg-slate-50 hover:bg-indigo-50 border border-slate-200 rounded-lg px-3 py-2 transition-colors"
                  >
                    <div className="font-medium text-slate-700">{u.role}</div>
                    <div className="text-slate-400 truncate">{u.email}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <p className="text-center text-sm text-slate-500 mt-6">
            Need access?{' '}
            <a href="/gallery" className="text-indigo-600 hover:underline font-medium">
              Browse our product gallery →
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
