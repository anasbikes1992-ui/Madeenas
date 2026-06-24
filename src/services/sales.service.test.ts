/**
 * Comprehensive Test Suite for Sales Service
 * 
 * Tests VAT calculation, credit sales, stock deduction, payment modes, and error handling
 */

import { describe, it, expect, beforeEach, vi, Mock } from 'vitest'
import { createSale, createQuickSale, calculateSaleTotals } from './sales.service'
import { prisma } from '@/lib/db'
import type { Prisma } from '@prisma/client'

// Mock Prisma client
vi.mock('@/lib/db', () => ({
  prisma: {
    sale: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    saleItem: {
      createMany: vi.fn(),
    },
    stock: {
      findUnique: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    customer: {
      findUnique: vi.fn(),
    },
    product: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn((callback) => callback(prisma)),
  },
}))

describe('Sales Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('calculateSaleTotals', () => {
    it('calculates 18% VAT correctly', () => {
      const items = [
        { productId: 'p1', quantity: 2, unitPrice: 1000, productName: 'Product 1', design: 'D1', color: 'Red' },
        { productId: 'p2', quantity: 1, unitPrice: 500, productName: 'Product 2', design: 'D2', color: 'Blue' },
      ]

      const result = calculateSaleTotals(items, 18)

      expect(result.subTotal).toBe(2500) // 2*1000 + 1*500
      expect(result.taxAmount).toBe(450) // 2500 * 0.18
      expect(result.grandTotal).toBe(2950) // 2500 + 450
      expect(result.items).toHaveLength(2)
      expect(result.items[0].taxAmount).toBe(360) // 2000 * 0.18
      expect(result.items[0].total).toBe(2360) // 2000 + 360
    })

    it('calculates totals without VAT when taxRate is 0', () => {
      const items = [{ productId: 'p1', quantity: 1, unitPrice: 1000, productName: 'Product', design: 'D1', color: 'Red' }]

      const result = calculateSaleTotals(items, 0)

      expect(result.subTotal).toBe(1000)
      expect(result.taxAmount).toBe(0)
      expect(result.grandTotal).toBe(1000)
    })

    it('handles fractional VAT rates', () => {
      const items = [{ productId: 'p1', quantity: 1, unitPrice: 100, productName: 'Product', design: 'D1', color: 'Red' }]

      const result = calculateSaleTotals(items, 12.5)

      expect(result.subTotal).toBe(100)
      expect(result.taxAmount).toBe(12.5)
      expect(result.grandTotal).toBe(112.5)
    })
  })

  describe('createQuickSale', () => {
    it('creates a cash sale and deducts stock', async () => {
      const mockStock = { id: 'stock1', productId: 'p1', locationId: 'loc1', quantity: 10 }
      const mockSale = {
        id: 'sale1',
        receiptNo: 'REC-2026-0001',
        subTotal: 1000,
        taxAmount: 180,
        grandTotal: 1180,
        paymentMode: 'CASH',
      }

      ;(prisma.stock.findUnique as Mock).mockResolvedValue(mockStock)
      ;(prisma.sale.create as Mock).mockResolvedValue(mockSale)
      ;(prisma.stock.update as Mock).mockResolvedValue({ ...mockStock, quantity: 8 })

      const result = await createQuickSale({
        items: [{ productId: 'p1', quantity: 2, unitPrice: 500, productName: 'Product', design: 'D1', color: 'Red' }],
        locationId: 'loc1',
        soldBy: 'user1',
        paymentMode: 'CASH',
        taxRate: 18,
      })

      expect(result.receiptNo).toBe('REC-2026-0001')
      expect(result.grandTotal).toBe(1180)
      expect(prisma.stock.update).toHaveBeenCalledWith({
        where: { id: 'stock1' },
        data: { quantity: 8 }, // 10 - 2
      })
    })

    it('throws error on insufficient stock', async () => {
      const mockStock = { id: 'stock1', productId: 'p1', locationId: 'loc1', quantity: 1 }
      ;(prisma.stock.findUnique as Mock).mockResolvedValue(mockStock)

      await expect(
        createQuickSale({
          items: [{ productId: 'p1', quantity: 5, unitPrice: 500, productName: 'Product', design: 'D1', color: 'Red' }],
          locationId: 'loc1',
          soldBy: 'user1',
          paymentMode: 'CASH',
          taxRate: 18,
        })
      ).rejects.toThrow('Insufficient stock')
    })

    it('throws error when stock record not found', async () => {
      ;(prisma.stock.findUnique as Mock).mockResolvedValue(null)

      await expect(
        createQuickSale({
          items: [{ productId: 'p1', quantity: 1, unitPrice: 500, productName: 'Product', design: 'D1', color: 'Red' }],
          locationId: 'loc1',
          soldBy: 'user1',
          paymentMode: 'CASH',
          taxRate: 18,
        })
      ).rejects.toThrow('not found at location')
    })
  })

  describe('createSale (credit sales)', () => {
    it('creates a credit sale with customer credit check', async () => {
      const mockCustomer = { id: 'cust1', creditLimit: 10000, currentCredit: 3000 }
      const mockSale = {
        id: 'sale2',
        receiptNo: 'REC-2026-0002',
        subTotal: 5000,
        taxAmount: 900,
        grandTotal: 5900,
        paymentMode: 'CREDIT',
        customerId: 'cust1',
      }

      ;(prisma.customer.findUnique as Mock).mockResolvedValue(mockCustomer)
      ;(prisma.stock.findUnique as Mock).mockResolvedValue({ id: 'stock1', quantity: 20 })
      ;(prisma.sale.create as Mock).mockResolvedValue(mockSale)
      ;(prisma.stock.update as Mock).mockResolvedValue({})

      const result = await createSale({
        items: [{ productId: 'p1', quantity: 10, unitPrice: 500, productName: 'Product', design: 'D1', color: 'Red' }],
        locationId: 'loc1',
        soldBy: 'user1',
        paymentMode: 'CREDIT',
        customerId: 'cust1',
        taxRate: 18,
      })

      expect(result.grandTotal).toBe(5900)
      expect(result.paymentMode).toBe('CREDIT')
      expect(prisma.customer.findUnique).toHaveBeenCalledWith({ where: { id: 'cust1' } })
    })

    it('throws error when credit limit exceeded', async () => {
      const mockCustomer = { id: 'cust1', creditLimit: 5000, currentCredit: 4500 }
      ;(prisma.customer.findUnique as Mock).mockResolvedValue(mockCustomer)

      await expect(
        createSale({
          items: [{ productId: 'p1', quantity: 10, unitPrice: 500, productName: 'Product', design: 'D1', color: 'Red' }],
          locationId: 'loc1',
          soldBy: 'user1',
          paymentMode: 'CREDIT',
          customerId: 'cust1',
          taxRate: 18,
        })
      ).rejects.toThrow('Credit limit exceeded')
    })

    it('throws error when customer not found for credit sale', async () => {
      ;(prisma.customer.findUnique as Mock).mockResolvedValue(null)

      await expect(
        createSale({
          items: [{ productId: 'p1', quantity: 1, unitPrice: 500, productName: 'Product', design: 'D1', color: 'Red' }],
          locationId: 'loc1',
          soldBy: 'user1',
          paymentMode: 'CREDIT',
          customerId: 'invalid',
          taxRate: 18,
        })
      ).rejects.toThrow('Customer not found')
    })
  })

  describe('payment modes', () => {
    it('supports CASH payment mode', async () => {
      ;(prisma.stock.findUnique as Mock).mockResolvedValue({ id: 'stock1', quantity: 10 })
      ;(prisma.sale.create as Mock).mockResolvedValue({ id: 'sale1', paymentMode: 'CASH' })
      ;(prisma.stock.update as Mock).mockResolvedValue({})

      const result = await createQuickSale({
        items: [{ productId: 'p1', quantity: 1, unitPrice: 100, productName: 'Product', design: 'D1', color: 'Red' }],
        locationId: 'loc1',
        soldBy: 'user1',
        paymentMode: 'CASH',
        taxRate: 18,
      })

      expect(result.paymentMode).toBe('CASH')
    })

    it('supports CARD payment mode', async () => {
      ;(prisma.stock.findUnique as Mock).mockResolvedValue({ id: 'stock1', quantity: 10 })
      ;(prisma.sale.create as Mock).mockResolvedValue({ id: 'sale1', paymentMode: 'CARD' })
      ;(prisma.stock.update as Mock).mockResolvedValue({})

      const result = await createQuickSale({
        items: [{ productId: 'p1', quantity: 1, unitPrice: 100, productName: 'Product', design: 'D1', color: 'Red' }],
        locationId: 'loc1',
        soldBy: 'user1',
        paymentMode: 'CARD',
        taxRate: 18,
      })

      expect(result.paymentMode).toBe('CARD')
    })

    it('supports ONLINE payment mode', async () => {
      ;(prisma.stock.findUnique as Mock).mockResolvedValue({ id: 'stock1', quantity: 10 })
      ;(prisma.sale.create as Mock).mockResolvedValue({ id: 'sale1', paymentMode: 'ONLINE' })
      ;(prisma.stock.update as Mock).mockResolvedValue({})

      const result = await createQuickSale({
        items: [{ productId: 'p1', quantity: 1, unitPrice: 100, productName: 'Product', design: 'D1', color: 'Red' }],
        locationId: 'loc1',
        soldBy: 'user1',
        paymentMode: 'ONLINE',
        taxRate: 18,
      })

      expect(result.paymentMode).toBe('ONLINE')
    })
  })

  describe('stock deduction', () => {
    it('deducts correct quantities for multiple items', async () => {
      ;(prisma.stock.findUnique as Mock)
        .mockResolvedValueOnce({ id: 'stock1', productId: 'p1', quantity: 20 })
        .mockResolvedValueOnce({ id: 'stock2', productId: 'p2', quantity: 15 })

      ;(prisma.sale.create as Mock).mockResolvedValue({ id: 'sale1' })
      ;(prisma.stock.update as Mock).mockResolvedValue({})

      await createQuickSale({
        items: [
          { productId: 'p1', quantity: 3, unitPrice: 100, productName: 'Product 1', design: 'D1', color: 'Red' },
          { productId: 'p2', quantity: 5, unitPrice: 200, productName: 'Product 2', design: 'D2', color: 'Blue' },
        ],
        locationId: 'loc1',
        soldBy: 'user1',
        paymentMode: 'CASH',
        taxRate: 18,
      })

      expect(prisma.stock.update).toHaveBeenCalledTimes(2)
      expect(prisma.stock.update).toHaveBeenCalledWith({
        where: { id: 'stock1' },
        data: { quantity: 17 }, // 20 - 3
      })
      expect(prisma.stock.update).toHaveBeenCalledWith({
        where: { id: 'stock2' },
        data: { quantity: 10 }, // 15 - 5
      })
    })

    it('validates all stock before deducting', async () => {
      ;(prisma.stock.findUnique as Mock)
        .mockResolvedValueOnce({ id: 'stock1', quantity: 10 })
        .mockResolvedValueOnce(null) // Second item has no stock

      await expect(
        createQuickSale({
          items: [
            { productId: 'p1', quantity: 2, unitPrice: 100, productName: 'Product 1', design: 'D1', color: 'Red' },
            { productId: 'p2', quantity: 1, unitPrice: 200, productName: 'Product 2', design: 'D2', color: 'Blue' },
          ],
          locationId: 'loc1',
          soldBy: 'user1',
          paymentMode: 'CASH',
          taxRate: 18,
        })
      ).rejects.toThrow('not found at location')

      // Ensure no stock was deducted
      expect(prisma.stock.update).not.toHaveBeenCalled()
    })
  })
})
