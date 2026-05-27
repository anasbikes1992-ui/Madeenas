import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as stockOutPOST } from '@/app/api/stock-out/route'
import { POST as stockInPOST } from '@/app/api/stock-in/route'
import { PATCH as stockOutPatch } from '@/app/api/stock-out/[id]/route'

vi.mock('@/lib/auth', () => ({
  auth: vi.fn(),
}))

vi.mock('@/lib/db', () => ({
  prisma: {
    location: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    stock: { findUnique: vi.fn(), findMany: vi.fn(), update: vi.fn(), upsert: vi.fn() },
    stockOutRequest: { create: vi.fn(), findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    stockIn: { create: vi.fn() },
    financeReview: { findFirst: vi.fn(), create: vi.fn() },
    user: { findMany: vi.fn() },
    notification: { createMany: vi.fn() },
    $transaction: vi.fn(async (arg: unknown) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg as Promise<unknown>[])
      }
      if (typeof arg === 'function') {
        return (arg as (tx: unknown) => unknown)((await import('@/lib/db')).prisma)
      }
      return arg
    }),
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
  stockInSchema: {
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

  it('creates a batch stock-out request with multiple items', async () => {
    const { auth } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/db')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', locationId: 'locA' },
    } as never)

    vi.mocked(prisma.location.findUnique).mockResolvedValue({ id: 'locA', isActive: true } as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', name: 'Prod 1', unit: 'meters', isActive: true },
      { id: 'p2', name: 'Prod 2', unit: 'meters', isActive: true },
      { id: 'p3', name: 'Prod 3', unit: 'meters', isActive: true },
    ] as never)
    vi.mocked(prisma.stock.findMany).mockResolvedValue([
      { productId: 'p1', quantity: 20 },
      { productId: 'p2', quantity: 15 },
      { productId: 'p3', quantity: 12 },
    ] as never)
    vi.mocked(prisma.stockOutRequest.create).mockResolvedValue({ id: 'r1' } as never)

    const request = new NextRequest('http://localhost/api/stock-out', {
      method: 'POST',
      body: JSON.stringify({
        fromLocationId: 'locA',
        toLocationId: 'locB',
        referenceInvoice: 'INV-001',
        items: [
          { productId: 'p1', quantityRequested: 2 },
          { productId: 'p2', quantityRequested: 3 },
          { productId: 'p3', quantityRequested: 1 },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await stockOutPOST(request)
    expect(response.status).toBe(201)
    expect(vi.mocked(prisma.stockOutRequest.create)).toHaveBeenCalledTimes(3)
  })

  it('creates a batch stock-in receipt with multiple items', async () => {
    const { auth } = await import('@/lib/auth')
    const { prisma } = await import('@/lib/db')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', locationId: 'locA' },
    } as never)

    vi.mocked(prisma.location.findUnique).mockResolvedValue({ id: 'locA', name: 'Main', isActive: true } as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([
      { id: 'p1', name: 'Prod 1', unit: 'meters', isActive: true },
      { id: 'p2', name: 'Prod 2', unit: 'meters', isActive: true },
      { id: 'p3', name: 'Prod 3', unit: 'meters', isActive: true },
    ] as never)
    vi.mocked(prisma.stockIn.create).mockResolvedValue({ id: 's1' } as never)
    vi.mocked(prisma.stock.upsert).mockResolvedValue({} as never)

    const request = new NextRequest('http://localhost/api/stock-in', {
      method: 'POST',
      body: JSON.stringify({
        locationId: 'locA',
        batchNumber: 'B-01',
        supplierId: 'sup1',
        items: [
          { productId: 'p1', quantity: 4, costPrice: 100 },
          { productId: 'p2', quantity: 6, costPrice: 200 },
          { productId: 'p3', quantity: 2, costPrice: 120 },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await stockInPOST(request)
    expect(response.status).toBe(201)
    expect(vi.mocked(prisma.stockIn.create)).toHaveBeenCalledTimes(3)
    expect(vi.mocked(prisma.stock.upsert)).toHaveBeenCalledTimes(3)
  })

  it('rejects stock-out batch with fewer than 3 lines', async () => {
    const { auth } = await import('@/lib/auth')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', locationId: 'locA' },
    } as never)

    const request = new NextRequest('http://localhost/api/stock-out', {
      method: 'POST',
      body: JSON.stringify({
        fromLocationId: 'locA',
        toLocationId: 'locB',
        items: [
          { productId: 'p1', quantityRequested: 2 },
          { productId: 'p2', quantityRequested: 3 },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await stockOutPOST(request)
    expect(response.status).toBe(400)
  })

  it('rejects stock-in batch when products are not distinct', async () => {
    const { auth } = await import('@/lib/auth')

    vi.mocked(auth).mockResolvedValue({
      user: { id: 'u1', role: 'ADMIN', locationId: 'locA' },
    } as never)

    const request = new NextRequest('http://localhost/api/stock-in', {
      method: 'POST',
      body: JSON.stringify({
        locationId: 'locA',
        items: [
          { productId: 'p1', quantity: 4, costPrice: 100 },
          { productId: 'p1', quantity: 6, costPrice: 100 },
          { productId: 'p2', quantity: 2, costPrice: 200 },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await stockInPOST(request)
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
    vi.mocked(prisma.stock.findMany).mockResolvedValue([{ productId: 'p1', quantity: 100 }] as never)
    vi.mocked(prisma.product.findMany).mockResolvedValue([{ id: 'p1', name: 'Prod', unit: 'meters', isActive: true }] as never)
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