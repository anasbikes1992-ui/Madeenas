'use client'

import { FormEvent, useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    const response = await fetch('/api/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const data = await response.json()

    if (!response.ok) {
      setLoading(false)
      setError(data.error || 'Could not create your account.')
      return
    }

    const signInResult = await signIn('credentials', {
      email: form.email,
      password: form.password,
      redirect: false,
    })

    setLoading(false)

    if (signInResult?.ok) {
      router.push('/gallery')
      router.refresh()
      return
    }

    setSuccess('Account created successfully. Please sign in.')
    router.push('/login')
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(14,165,233,0.12),transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_38%,#ffffff_100%)] px-6 py-10 lg:px-10">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <div className="space-y-6 rounded-[2rem] border border-slate-200/70 bg-white p-8 shadow-[0_24px_90px_rgba(15,23,42,0.08)] lg:p-10">
          <Link href="/gallery" className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm">
            ← Back to Gallery
          </Link>
          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">Customer sign up</p>
            <h1 className="text-4xl font-black leading-tight text-slate-950 sm:text-5xl">
              Create your account and keep your textile orders in one place.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600">
              Registration gives customers a faster path back into the gallery and prepares the flow for order history, quotes, and confirmations later in the release.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">1</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Create account</p>
              <p className="mt-1 text-sm text-slate-500">Use your email and password to register as a customer.</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">2</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Browse gallery</p>
              <p className="mt-1 text-sm text-slate-500">Your home page remains the product gallery and order storefront.</p>
            </div>
            <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">3</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Ready for next logic</p>
              <p className="mt-1 text-sm text-slate-500">We can extend this into customer order history and quote tracking.</p>
            </div>
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200/80 bg-white p-8 shadow-[0_24px_90px_rgba(15,23,42,0.08)]">
          <h2 className="text-2xl font-black text-slate-950">Create customer account</h2>
          <p className="mt-2 text-sm text-slate-500">You will be signed in automatically if registration succeeds.</p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            <div className="form-group">
              <label className="label">Full name</label>
              <input required className="input" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Email</label>
              <input required type="email" className="input" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            </div>
            <div className="form-group">
              <label className="label">Phone or WhatsApp</label>
              <input className="input" value={form.phone} onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))} placeholder="94770000000 or +94770000000" />
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <div className="form-group">
                <label className="label">Password</label>
                <input required minLength={8} type="password" className="input" value={form.password} onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
              </div>
              <div className="form-group">
                <label className="label">Confirm password</label>
                <input required minLength={8} type="password" className="input" value={form.confirmPassword} onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))} />
              </div>
            </div>

            {error ? <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            {success ? <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3 text-base">
              {loading ? 'Creating account...' : 'Create account'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}