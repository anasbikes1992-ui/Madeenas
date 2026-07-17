'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  CreditCard,
  RefreshCw,
  Search,
  Users,
  Wallet,
  X,
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type OutstandingCustomer = {
  customerId: string
  customerName: string
  customerPhone: string | null
  totalOwed: number
  creditLimit: number | null
  lastActivity: string
  oldestUnpaidAt: string | null
  daysOutstanding: number | null
}

type CreditEntry = {
  id: string
  type: 'CHARGE' | 'REFUND_CREDIT' | 'ADJUSTMENT'
  amount: number
  balance: number
  receiptNo: string | null
  note: string | null
  createdAt: string
}

type CreditPayment = {
  id: string
  amount: number
  paymentMode: string
  reference: string | null
  recordedByName: string
  createdAt: string
}

type CreditDetail = {
  customerId: string
  customerName: string
  customerPhone: string | null
  totalOwed: number
  creditLimit: number | null
  availableCredit: number | null
  entries: CreditEntry[]
  payments: CreditPayment[]
}

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'CARD', 'CHEQUE'] as const

/** Colour the age of a debt so overdue accounts stand out at a glance. */
function ageTone(days: number | null): string {
  if (days === null) return 'text-[var(--text-muted)]'
  if (days >= 60) return 'text-rose-500 font-semibold'
  if (days >= 30) return 'text-amber-500 font-medium'
  return 'text-[var(--text-muted)]'
}

export default function CreditPage() {
  const [customers, setCustomers] = useState<OutstandingCustomer[]>([])
  const [totalReceivables, setTotalReceivables] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<CreditDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const [payAmount, setPayAmount] = useState('')
  const [payMode, setPayMode] = useState<string>('CASH')
  const [payReference, setPayReference] = useState('')
  const [saving, setSaving] = useState(false)

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type })
    setTimeout(() => setToast(null), 4000)
  }

  async function loadAccounts() {
    setLoading(true)
    try {
      const res = await fetch('/api/credit')
      if (!res.ok) throw new Error('request failed')
      const data = await res.json()
      setCustomers(data.customers ?? [])
      setTotalReceivables(data.totalReceivables ?? 0)
    } catch {
      showToast('Failed to load credit accounts. Please refresh.', 'error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAccounts()
  }, [])

  async function openCustomer(customerId: string) {
    setDetailLoading(true)
    try {
      const res = await fetch(`/api/customers/${customerId}/credit`)
      if (!res.ok) throw new Error('request failed')
      const data: CreditDetail = await res.json()
      setSelected(data)
      setPayAmount('')
      setPayReference('')
      setPayMode('CASH')
    } catch {
      showToast('Failed to load this account.', 'error')
    } finally {
      setDetailLoading(false)
    }
  }

  async function submitPayment(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return

    const amount = Number(payAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      return showToast('Enter a payment amount greater than zero.', 'error')
    }
    if (amount > selected.totalOwed) {
      return showToast(
        `Payment cannot exceed the outstanding balance of ${formatCurrency(selected.totalOwed)}.`,
        'error'
      )
    }

    setSaving(true)
    try {
      const res = await fetch('/api/credit/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selected.customerId,
          amount,
          paymentMode: payMode,
          reference: payReference.trim() || undefined,
        }),
      })
      const payload = await res.json().catch(() => ({}))
      if (!res.ok) {
        showToast(payload.error ?? 'Failed to record payment.', 'error')
        return
      }

      showToast(
        `Payment of ${formatCurrency(amount)} recorded. Remaining: ${formatCurrency(payload.remainingOwed)}.`,
        'success'
      )
      await Promise.all([loadAccounts(), openCustomer(selected.customerId)])
    } catch {
      showToast('Failed to record payment.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter(
      (c) =>
        c.customerName.toLowerCase().includes(q) ||
        (c.customerPhone ?? '').toLowerCase().includes(q)
    )
  }, [customers, search])

  const overdueCount = customers.filter((c) => (c.daysOutstanding ?? 0) >= 30).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Credit Accounts</h1>
          <p className="text-sm text-[var(--text-muted)]">
            Outstanding customer balances and repayments.
          </p>
        </div>
        <button
          onClick={() => void loadAccounts()}
          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      {/* Summary */}
      <div className="grid gap-4 sm:grid-cols-3">
        <SummaryTile
          Icon={Wallet}
          label="Total receivables"
          value={formatCurrency(totalReceivables)}
          tone="text-[var(--text-primary)]"
        />
        <SummaryTile
          Icon={Users}
          label="Customers with balance"
          value={String(customers.length)}
          tone="text-[var(--text-primary)]"
        />
        <SummaryTile
          Icon={AlertTriangle}
          label="Overdue (30+ days)"
          value={String(overdueCount)}
          tone={overdueCount > 0 ? 'text-amber-500' : 'text-[var(--text-primary)]'}
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by customer name or phone"
          aria-label="Search credit accounts"
          className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-2 pl-9 pr-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
        />
      </div>

      {/* Accounts table */}
      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-4 py-3 font-medium">Customer</th>
                <th className="px-4 py-3 font-medium">Phone</th>
                <th className="px-4 py-3 text-right font-medium">Outstanding</th>
                <th className="px-4 py-3 text-right font-medium">Limit</th>
                <th className="px-4 py-3 text-right font-medium">Age</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)]">
                    Loading accounts…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-[var(--text-muted)]">
                    {customers.length === 0
                      ? 'No outstanding credit. Every account is settled.'
                      : 'No customers match your search.'}
                  </td>
                </tr>
              ) : (
                filtered.map((c) => (
                  <tr
                    key={c.customerId}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-hover)]"
                  >
                    <td className="px-4 py-3 font-medium text-[var(--text-primary)]">
                      {c.customerName}
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">{c.customerPhone ?? '—'}</td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--text-primary)]">
                      {formatCurrency(c.totalOwed)}
                    </td>
                    <td className="px-4 py-3 text-right text-[var(--text-muted)]">
                      {c.creditLimit === null ? '—' : formatCurrency(c.creditLimit)}
                    </td>
                    <td className={`px-4 py-3 text-right ${ageTone(c.daysOutstanding)}`}>
                      {c.daysOutstanding === null ? '—' : `${c.daysOutstanding}d`}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => void openCustomer(c.customerId)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-medium text-white transition-opacity hover:opacity-90"
                      >
                        <CreditCard className="h-3.5 w-3.5" />
                        Record payment
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail / payment dialog */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Credit account for ${selected.customerName}`}
        >
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-xl">
            <div className="flex items-start justify-between border-b border-[var(--border)] p-5">
              <div>
                <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                  {selected.customerName}
                </h2>
                <p className="text-sm text-[var(--text-muted)]">{selected.customerPhone ?? '—'}</p>
              </div>
              <button
                onClick={() => setSelected(null)}
                aria-label="Close"
                className="rounded-lg p-1.5 text-[var(--text-muted)] transition-colors hover:bg-[var(--surface-hover)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-4 border-b border-[var(--border)] p-5 sm:grid-cols-3">
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  Outstanding
                </p>
                <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  {formatCurrency(selected.totalOwed)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Limit</p>
                <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  {selected.creditLimit === null ? '—' : formatCurrency(selected.creditLimit)}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-[var(--text-muted)]">Available</p>
                <p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">
                  {selected.availableCredit === null
                    ? '—'
                    : formatCurrency(selected.availableCredit)}
                </p>
              </div>
            </div>

            {/* Record payment */}
            <form onSubmit={submitPayment} className="space-y-4 border-b border-[var(--border)] p-5">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">Record a payment</h3>
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <label
                    htmlFor="pay-amount"
                    className="mb-1 block text-xs text-[var(--text-muted)]"
                  >
                    Amount
                  </label>
                  <input
                    id="pay-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={selected.totalOwed}
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="pay-mode" className="mb-1 block text-xs text-[var(--text-muted)]">
                    Method
                  </label>
                  <select
                    id="pay-mode"
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] focus:border-[var(--primary)] focus:outline-none"
                  >
                    {PAYMENT_MODES.map((mode) => (
                      <option key={mode} value={mode}>
                        {mode.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="pay-reference"
                    className="mb-1 block text-xs text-[var(--text-muted)]"
                  >
                    Reference (optional)
                  </label>
                  <input
                    id="pay-reference"
                    value={payReference}
                    onChange={(e) => setPayReference(e.target.value)}
                    placeholder="Cheque / transfer no."
                    className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--primary)] focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={saving || selected.totalOwed <= 0}
                  className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? 'Recording…' : 'Record payment'}
                </button>
                {selected.totalOwed > 0 && (
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(selected.totalOwed))}
                    className="rounded-lg border border-[var(--border)] px-3 py-2 text-sm text-[var(--text-primary)] transition-colors hover:bg-[var(--surface-hover)]"
                  >
                    Settle full balance
                  </button>
                )}
              </div>
            </form>

            {/* History */}
            <div className="grid gap-5 p-5 sm:grid-cols-2">
              <section>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Charges</h3>
                {selected.entries.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No charges.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.entries.map((entry) => (
                      <li key={entry.id} className="rounded-lg border border-[var(--border)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-[var(--text-primary)]">
                            {entry.receiptNo ?? entry.type.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-medium text-[var(--text-primary)]">
                            {formatCurrency(entry.amount)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                          <span>{new Date(entry.createdAt).toLocaleDateString()}</span>
                          <span>
                            {entry.balance > 0
                              ? `${formatCurrency(entry.balance)} unpaid`
                              : 'Settled'}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">Payments</h3>
                {selected.payments.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">No payments recorded.</p>
                ) : (
                  <ul className="space-y-2">
                    {selected.payments.map((payment) => (
                      <li key={payment.id} className="rounded-lg border border-[var(--border)] p-3">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm text-[var(--text-primary)]">
                            {payment.paymentMode.replace('_', ' ')}
                          </span>
                          <span className="text-sm font-medium text-emerald-500">
                            {formatCurrency(payment.amount)}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-[var(--text-muted)]">
                          <span>{new Date(payment.createdAt).toLocaleDateString()}</span>
                          <span>{payment.recordedByName}</span>
                        </div>
                        {payment.reference && (
                          <p className="mt-1 text-xs text-[var(--text-muted)]">
                            Ref: {payment.reference}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>
        </div>
      )}

      {detailLoading && !selected && (
        <p className="text-sm text-[var(--text-muted)]">Loading account…</p>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 rounded-lg px-4 py-3 text-sm text-white shadow-lg ${
            toast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}

function SummaryTile({
  Icon,
  label,
  value,
  tone,
}: {
  Icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: string
}) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-2 text-[var(--text-muted)]">
        <Icon className="h-4 w-4" />
        <span className="text-xs uppercase tracking-wide">{label}</span>
      </div>
      <p className={`mt-2 text-2xl font-semibold ${tone}`}>{value}</p>
    </div>
  )
}
