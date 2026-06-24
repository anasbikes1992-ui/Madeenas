'use client'
import { useState, FormEvent, useEffect, Suspense } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { getDashboardPath } from '@/lib/constants'

function LoginForm() {
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
    <div className="rounded-[2rem] border border-slate-200/80 bg-white p-6 shadow-[0_24px_90px_rgba(15,23,42,0.08)] sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-950">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Staff, customers, and management all sign in here.</p>
        </div>
        <Link href="/gallery" className="text-sm font-semibold text-indigo-600 hover:underline">
          Browse gallery →
        </Link>
      </div>

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

      {process.env.NODE_ENV !== 'production' && (
        <div className="mt-8 rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs text-slate-500 mb-3">Demo accounts:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { role: 'Super Admin', email: 'anasbikes1992@gmail.com', pass: '123456' },
              { role: 'Manager', email: 'manager@Nexus.app', pass: 'password123' },
              { role: 'Store Keeper', email: 'storekeeper@Nexus.app', pass: 'password123' },
              { role: 'Finance', email: 'finance@Nexus.app', pass: 'password123' },
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
      )}
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(99,102,241,0.18),transparent_28%),linear-gradient(180deg,#0f172a_0%,#111827_38%,#f8fafc_38%,#ffffff_100%)] px-6 py-8 lg:px-10 lg:py-10">
      <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl gap-8 lg:grid-cols-[1fr_0.92fr] lg:items-center">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#312e81_100%)] p-8 text-white shadow-[0_30px_120px_rgba(15,23,42,0.3)] sm:p-10 lg:p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_15%,rgba(34,211,238,0.28),transparent_22%),radial-gradient(circle_at_18%_18%,rgba(255,255,255,0.12),transparent_18%)]" aria-hidden="true" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-lg font-black">MT</div>
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100">Nexus Inventory</p>
                <p className="text-sm text-indigo-100">Secure staff, customer, and management access</p>
              </div>
            </div>

            <div className="max-w-2xl space-y-5">
              <p className="inline-flex rounded-full border border-cyan-300/25 bg-cyan-300/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-cyan-100">
                Operational workspace
              </p>
              <h1 className="text-4xl font-black leading-[0.95] sm:text-5xl lg:text-6xl">
                Sign in to manage sales, stock, customer requests, and finance in one place.
              </h1>
              <p className="max-w-xl text-base leading-8 text-indigo-100 sm:text-lg">
                Customers land in the gallery. Staff and management land in the dashboard matching their role. One login form, role-aware routing.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['POS', 'Fast checkout'],
                ['Orders', 'Customer quotes'],
                ['Inventory', 'Stock-safe moves'],
              ].map(([title, body]) => (
                <div key={title} className="rounded-2xl border border-white/10 bg-white/8 p-4 backdrop-blur">
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm text-indigo-100">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-6 flex items-center justify-between gap-4 lg:hidden">
              <Link href="/" className="text-sm font-semibold text-indigo-600 hover:underline">
                ← Back to home
              </Link>
              <Link href="/signup" className="text-sm font-semibold text-indigo-600 hover:underline">
                New customer sign up
              </Link>
            </div>

            <Suspense fallback={<div>Loading login...</div>}>
              <LoginForm />
            </Suspense>

            <div className="mt-6 space-y-3 text-center text-sm text-slate-500">
              <p>
                Need the product catalog?{' '}
                <Link href="/gallery" className="font-medium text-indigo-600 hover:underline">
                  Open the gallery →
                </Link>
              </p>
              <p>
                New customer?{' '}
                <Link href="/signup" className="font-medium text-indigo-600 hover:underline">
                  Create an account →
                </Link>
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
