import { test, expect, type Page } from '@playwright/test'

const users = {
  admin: {
    email: process.env.E2E_ADMIN_EMAIL ?? 'madeenas.lk@gmail.com',
    password: process.env.E2E_ADMIN_PASSWORD ?? '123456',
  },
  manager: {
    email: process.env.E2E_MANAGER_EMAIL ?? 'manager.wh@textilestock.com',
    password: process.env.E2E_MANAGER_PASSWORD ?? 'password123',
  },
  shop: {
    email: process.env.E2E_SHOP_EMAIL ?? 'shop.a@textilestock.com',
    password: process.env.E2E_SHOP_PASSWORD ?? 'password123',
  },
}

async function login(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/(admin|finance|gallery)\//)
}

async function signOut(page: Page) {
  await page.getByRole('button', { name: 'Sign out' }).click()
  await page.waitForURL(/\/login/)
}

test.describe('Admin dashboard smoke', () => {
  test('loads core admin pages and shows LKR formatting on reports surfaces', async ({ page }) => {
    await login(page, users.admin.email, users.admin.password)

    await page.goto('/admin/dashboard')
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
    await expect(page.getByText('Recent Stock Requests')).toBeVisible()

    await page.goto('/admin/inventory')
    await expect(page.getByRole('heading', { name: 'Inventory Matrix' })).toBeVisible()

    await page.goto('/admin/stock-in')
    await expect(page.getByRole('heading', { name: /Stock In/i })).toBeVisible()

    await page.goto('/admin/finance/dashboard')
    await expect(page.getByRole('heading', { name: /Finance Department/i })).toBeVisible()

    await page.goto('/admin/reports')
    await expect(page.getByRole('heading', { name: /Reports & Analytics/i })).toBeVisible()
    await expect(page.locator('body')).not.toContainText('₹')
    await expect(page.locator('body')).not.toContainText('$')
    await expect(page.locator('body')).toContainText(/LKR|Rs\./)
  })
})

test.describe('Stock request lifecycle', () => {
  test('lets a shop request from a warehouse, then approve, dispatch, and acknowledge', async ({ page }) => {
    const reference = `E2E-${Date.now()}`

    await login(page, users.shop.email, users.shop.password)
    await page.goto('/admin/new-request')

    await expect(page.getByText('Requesting Location')).toBeVisible()
    const sourceOptions = page.locator('#from-location option')
    await expect
      .poll(async () => sourceOptions.count(), { timeout: 15000 })
      .toBeGreaterThan(1)
    const sourceOptionCount = await sourceOptions.count()
    expect(sourceOptionCount).toBeGreaterThan(1)

    const warehouseLabel = await sourceOptions.nth(1).textContent()
    if (!warehouseLabel) {
      throw new Error('No warehouse options available for source location')
    }

    // Batch UI: each line has aria-label="Select product {n}" / "Quantity for product {n}"
    await page.getByLabel('Select product 1').selectOption({ index: 1 })
    await page.getByLabel('Source location').selectOption({ label: warehouseLabel.trim() })
    await page.getByLabel('Invoice number or reference').fill(reference)
    await page.locator('input[type="date"]').fill('2026-05-13')
    await page.getByLabel('Quantity for product 1').fill('1')
    await page.getByRole('button', { name: /Submit Request/i }).click()

    await expect(page.getByText('Request Submitted!')).toBeVisible()
    await page.getByRole('link', { name: 'View My Requests' }).click()
    await expect(page.locator('body')).toContainText(reference)
    await expect(page.locator('body')).toContainText('PENDING')

    await signOut(page)
    await login(page, users.manager.email, users.manager.password)
    await page.goto('/admin/stock-out')

    const pendingRow = page.locator('tr', { hasText: reference }).first()
    await expect(pendingRow).toBeVisible()
    await pendingRow.locator('button.btn-success').first().click()
    await page.getByRole('button', { name: 'Approve' }).click()

    await page.getByRole('button', { name: 'In-Progress (Approved/Dispatched)' }).click()
    const approvedRow = page.locator('tr', { hasText: reference }).first()
    await expect(approvedRow).toBeVisible()
    await approvedRow.locator('button.btn-primary').first().click()
    await page.getByRole('button', { name: 'Dispatch' }).click()

    await signOut(page)
    await login(page, users.shop.email, users.shop.password)
    await page.goto('/admin/my-requests')

    await expect(page.locator('body')).toContainText(reference)
    await page.getByRole('button', { name: /Acknowledge Receipt/i }).first().click()
    await expect(page.locator('body')).toContainText('ACKNOWLEDGED')
  })
})
