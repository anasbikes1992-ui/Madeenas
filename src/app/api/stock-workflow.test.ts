import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as stockOutPOST } from '@/app/api/stock-out/route'
import { PATCH as stockOutPatch } from '@/app/api/stock-out/[id]/route'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    location: { findUnique: vi.fn() },
    stock: { findUnique: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    stockOutRequest: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    financeReview: { findFirst: vi.fn(), create: vi.fn() },
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
    $transaction: vi.fn(async (callback: (tx: unknown) => unknown) => callback((await import('@/lib/db')).prisma)),
  },
}))

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn(),
  createNotification: vi.fn(),
}))

vi.mock('@/lib/validations', () => ({
  stockOutRequestSchema: {
    safeParse: vi.fn((body: unknown) => ({ success: true, data: body })),
  },
}))

describe('Stock workflow API hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects stock-out create when destination is missing', async () => {
    const { auth } = await import('@/lib/auth')
    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', locationId: 'locA' },
    } as never)

    const request = new NextRequest('http://localhost/api/stock-out', {
      method: 'POST',
      body: JSON.stringify({
        productId: 'p1',
        fromLocationId: 'locA',
        quantityRequested: 1,
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await stockOutPOST(request)
    expect(response.status).toBe(400)
  })

  it('returns 409 when dispatch state changed concurrently', async () => {
    const { auth } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/db')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', locationId: 'locA' },
    } as never)

    vi.mocked(prisma.stockOutRequest.findUnique).mockResolvedValue({
      id: 'r1',
      status: 'APPROVED',
      productId: 'p1',
      fromLocationId: 'locA',
      toLocationId: 'locB',
      requestedBy: 'u2',
      quantityRequested: 5,
      quantityApproved: 5,
      product: { name: 'Prod', unit: 'meters' },
      fromLocation: { name: 'From A' },
      toLocation: { name: 'To B' },
    } as never)

    vi.mocked(prisma.stock.findUnique).mockResolvedValue({ quantity: 100 } as never)
    vi.mocked(prisma.financeReview.findFirst).mockResolvedValue(null as never)
    vi.mocked(prisma.stockOutRequest.updateMany).mockResolvedValue({ count: 0 } as never)

    const request = new NextRequest('http://localhost/api/stock-out/r1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'dispatch' }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await stockOutPatch(request, { params: Promise.resolve({ id: 'r1' }) })
    expect(response.status).toBe(409)
  })
})