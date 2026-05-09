import { beforeEach, afterEach } from 'vitest'
import { prisma } from '@/lib/db'

/**
 * Test utilities and fixtures for unit and integration tests
 */

/**
 * Clean database before and after tests
 */
export async function cleanDatabase() {
  beforeEach(async () => {
    // Clean tables in reverse dependency order
    await prisma.auditLog.deleteMany({})
    await prisma.financeReview.deleteMany({})
    await prisma.saleItem.deleteMany({})
    await prisma.sale.deleteMany({})
    await prisma.customerOrder.deleteMany({})
    await prisma.stockOutRequest.deleteMany({})
    await prisma.stockIn.deleteMany({})
    await prisma.stock.deleteMany({})
    await prisma.product.deleteMany({})
    await prisma.category.deleteMany({})
    await prisma.user.deleteMany({})
    await prisma.location.deleteMany({})
    await prisma.supplier.deleteMany({})
  })

  afterEach(async () => {
    await prisma.$disconnect()
  })
}

/**
 * Create a test location
 */
export async function createTestLocation(overrides?: any) {
  return prisma.location.create({
    data: {
      name: 'Test Location',
      code: 'TEST_LOC',
      type: 'warehouse',
      address: '123 Test Street',
      ...overrides,
    },
  })
}

/**
 * Create a test category
 */
export async function createTestCategory(overrides?: any) {
  return prisma.category.create({
    data: {
      name: 'Test Category',
      slug: 'test-category',
      color: '#6366f1',
      ...overrides,
    },
  })
}

/**
 * Create a test product
 */
export async function createTestProduct(categoryId: string, overrides?: any) {
  return prisma.product.create({
    data: {
      name: 'Test Product',
      design: 'Test Design',
      color: 'Test Color',
      colorHex: '#000000',
      sku: `SKU-${Date.now()}`,
      categoryId,
      unit: 'meters',
      lowStockAt: 10,
      ...overrides,
    },
  })
}

/**
 * Create a test user
 */
export async function createTestUser(locationId?: string, overrides?: any) {
  return prisma.user.create({
    data: {
      name: 'Test User',
      email: `test-${Date.now()}@example.com`,
      password: 'hashed_password_here',
      role: 'STORE_KEEPER',
      locationId,
      ...overrides,
    },
  })
}

/**
 * Create test stock
 */
export async function createTestStock(productId: string, locationId: string, quantity = 100) {
  return prisma.stock.create({
    data: {
      productId,
      locationId,
      quantity,
    },
  })
}

/**
 * Create mock request object for API route testing
 */
export function createMockRequest(method = 'GET', body?: any) {
  return new Request('http://localhost:3000/api/test', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

/**
 * Mock environment variables
 */
export function mockEnv(overrides: Record<string, string>) {
  const original = { ...process.env }
  Object.assign(process.env, overrides)
  return () => {
    Object.assign(process.env, original)
  }
}
