import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as stockSendPost } from '@/app/api/stock-send/route'
import { PATCH as stockSendPatch } from '@/app/api/stock-send/[id]/route'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    stockOutRequest: {
      count: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
      countMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
    },
    location: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    stock: { findMany: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
    entityHistory: { create: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) => {
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)((await import('@/lib/db')).prisma)
      }
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[])
      }
      return arg
    }),
  },
}))

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn(),
  createNotification: vi.fn(),
}))

vi.mock('@/lib/history', () => ({
  logHistoryEvent: vi.fn(),
}))

describe('stock-send API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates direct send and marks as in-transit', async () => {
    const { auth } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/db')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', locationId: 'loc1' },
    } as never)

    vi.mocked(prisma.stockOutRequest.count).mockResolvedValue(0 as never)
    vi.mocked(prisma.location.findUnique)
      .mockResolvedValueOnce({ id: 'loc1', name: 'Main WH', isActive: true } as never)
      .mockResolvedValueOnce({ id: 'loc2', name: 'Shop A', isActive: true } as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', name: 'Cotton', unit: 'yards', isActive: true },
    ] as never)
    vi.mocked(prisma.stock.findMany).mockResolvedValue([{ productId: 'p1', quantity: 100 }] as never)
    vi.mocked(prisma.stockOutRequest.create).mockResolvedValue({ id: 's1' } as never)
    vi.mocked(prisma.stock.upsert).mockResolvedValue({ id: 'st1' } as never)
    vi.mocked(prisma.user.findMany).mockResolvedValue([] as never)

    const request = new NextRequest('http://localhost/api/stock-send', {
      method: 'POST',
      body: JSON.stringify({
        fromLocationId: 'loc1',
        toLocationId: 'loc2',
        items: [{ productId: 'p1', quantityDispatched: 5 }],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await stockSendPost(request)
    expect(response.status).toBe(201)
    expect(vi.mocked(prisma.stockOutRequest.create)).toHaveBeenCalledTimes(1)
    expect(vi.mocked(prisma.stock.upsert)).toHaveBeenCalledTimes(1)
  })

  it('requires discrepancy reason for partial acknowledge', async () => {
    const { auth } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/db')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u2', role: 'SHOP_STAFF', locationId: 'loc2' },
    } as never)

    vi.mocked(prisma.stockOutRequest.findUnique).mockResolvedValue({
      id: 's1',
      flowType: 'SEND_DIRECT',
      status: 'IN_TRANSIT',
      toLocationId: 'loc2',
      fromLocationId: 'loc1',
      productId: 'p1',
      quantityRequested: 5,
      quantityApproved: 5,
      quantityDispatched: 5,
      product: { unit: 'yards', name: 'Cotton' },
      fromLocation: { name: 'Main WH' },
      toLocation: { name: 'Shop A' },
      requestedByUser: { id: 'u1', name: 'Sender' },
    } as never)

    const request = new NextRequest('http://localhost/api/stock-send/s1', {
      method: 'PATCH',
      body: JSON.stringify({ action: 'acknowledge', quantityReceived: 4 }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await stockSendPatch(request, { params: Promise.resolve({ id: 's1' }) })
    expect(response.status).toBe(400)
  })
})
