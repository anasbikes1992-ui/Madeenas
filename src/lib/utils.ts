import { type ClassValue, clsx } from 'clsx'

export function cn(...inputs: ClassValue[]) {
  return inputs.filter(Boolean).join(' ')
}

export function formatDate(date: Date | string | null, opts?: Intl.DateTimeFormatOptions) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    ...opts,
  }).format(new Date(date))
}

export function formatCurrency(amount: number | null, currency = 'USD') {
  if (amount === null || amount === undefined) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount)
}

export function generateSKU(categoryCode: string) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let suffix = ''
  for (let i = 0; i < 6; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return `TXT-${categoryCode.toUpperCase().slice(0, 3)}-${suffix}`
}

export function getInitials(name: string) {
  return name
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function parseImages(images: string): string[] {
  try {
    const parsed = JSON.parse(images)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function truncate(str: string, length = 50) {
  return str.length > length ? str.slice(0, length) + '…' : str
}

export function classifyStockLevel(qty: number, threshold: number) {
  if (qty <= 0) return 'empty'
  if (qty <= threshold) return 'low'
  return 'healthy'
}
