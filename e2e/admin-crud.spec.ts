import { test, expect, type Page } from '@playwright/test'

const adminUser = {
  email: process.env.E2E_ADMIN_EMAIL ?? 'madeenas.lk@gmail.com',
  password: process.env.E2E_ADMIN_PASSWORD ?? '123456',
}

async function loginAsAdmin(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email address').fill(adminUser.email)
  await page.getByLabel('Password').fill(adminUser.password)
  await page.getByRole('button', { name: 'Sign in' }).click()
  await page.waitForURL(/\/admin\//)
}

test.describe('Admin settings CRUD flows', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page)
  })

  test('categories CRUD via admin UI', async ({ page }) => {
    const seed = Date.now()
    const categoryName = `E2E Category ${seed}`
    const updatedName = `${categoryName} Updated`

    await page.goto('/admin/settings/categories')
    await page.getByRole('button', { name: /Add Category/i }).click()
    const createModal = page.locator('.modal').first()
    await expect(createModal).toBeVisible()

    await createModal.locator('input').nth(0).fill(categoryName)
    await createModal.locator('input').nth(3).fill('🧪')
    await createModal.getByRole('button', { name: /Create Category/i }).click()

    await expect(page.getByText('Category created!')).toBeVisible()
    await expect(page.locator('body')).toContainText(categoryName)

    const row = page.locator('.card', { hasText: categoryName }).first()
    await row.getByRole('button', { name: /Edit/i }).click()
    const editModal = page.locator('.modal').first()
    await expect(editModal).toBeVisible()
    await editModal.locator('input').nth(0).fill(updatedName)
    await editModal.getByRole('button', { name: /Save Changes/i }).click()

    await expect(page.getByText('Category updated!')).toBeVisible()
    await expect(page.locator('body')).toContainText(updatedName)

    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('.card', { hasText: updatedName }).first().getByRole('button', { name: /Delete/i }).click()
    // Toast appears immediately before reload — match via class or partial text
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.toast-success')).toContainText('Category deleted')
    await expect(page.locator('body')).not.toContainText(updatedName)
  })

  test('locations CRUD via admin UI', async ({ page }) => {
    const seed = Date.now()
    const locationName = `E2E Location ${seed}`
    const locationCode = `E2E-${String(seed).slice(-6)}`
    const updatedLocationName = `${locationName} Updated`

    await page.goto('/admin/settings/locations')
    await page.getByRole('button', { name: /Add Location/i }).click()
    const createModal = page.locator('.modal').first()
    await expect(createModal).toBeVisible()

    await createModal.locator('input').nth(0).fill(locationName)
    await createModal.locator('input').nth(1).fill(locationCode)
    await createModal.locator('select').first().selectOption('WAREHOUSE')
    await createModal.locator('textarea').first().fill('E2E test location')
    await createModal.getByRole('button', { name: /Create Location/i }).click()

    await expect(page.getByText('Location created successfully!')).toBeVisible()
    await expect(page.locator('body')).toContainText(locationName)

    const card = page.locator('.card', { hasText: locationName }).first()
    await card.getByRole('button', { name: /Edit/i }).click()
    const editModal = page.locator('.modal').first()
    await expect(editModal).toBeVisible()
    await editModal.locator('input').nth(0).fill(updatedLocationName)
    await editModal.getByRole('button', { name: /Save Changes/i }).click()

    await expect(page.getByText('Location updated successfully!')).toBeVisible()
    await expect(page.locator('body')).toContainText(updatedLocationName)

    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('.card', { hasText: updatedLocationName }).first().getByRole('button', { name: /Deactivate/i }).click()

    // Toast fires before reload — API now returns all locations so card stays visible with Inactive badge
    await expect(page.locator('.toast-success')).toBeVisible({ timeout: 10000 })
    await expect(page.locator('.toast-success')).toContainText(/deactivated|activated/i)
    const updatedCard = page.locator('.card', { hasText: updatedLocationName }).first()
    await expect(updatedCard.getByText('Inactive')).toBeVisible({ timeout: 10000 })
  })

  test('suppliers CRUD via admin UI', async ({ page }) => {
    const seed = Date.now()
    const supplierName = `E2E Supplier ${seed}`
    const updatedSupplierName = `${supplierName} Updated`

    await page.goto('/admin/settings/suppliers')
    await page.getByRole('button', { name: /Add Supplier/i }).click()
    const createModal = page.locator('.modal').first()
    await expect(createModal).toBeVisible()

    await createModal.locator('input').nth(0).fill(supplierName)
    await createModal.locator('input').nth(1).fill('E2E Contact')
    await createModal.locator('input').nth(2).fill(`e2e-${seed}@example.com`)
    await createModal.locator('input').nth(3).fill('0771234567')
    await createModal.locator('textarea').first().fill('E2E supplier address')
    await createModal.getByRole('button', { name: /Create Supplier/i }).click()

    await expect(page.getByText('Supplier created!')).toBeVisible()
    await expect(page.locator('body')).toContainText(supplierName)

    const card = page.locator('.card', { hasText: supplierName }).first()
    await card.locator('button[title="Edit supplier"]').click()
    const editModal = page.locator('.modal').first()
    await expect(editModal).toBeVisible()
    await editModal.locator('input').nth(0).fill(updatedSupplierName)
    await editModal.getByRole('button', { name: /Save Changes/i }).click()

    await expect(page.getByText('Supplier updated!')).toBeVisible()
    await expect(page.locator('body')).toContainText(updatedSupplierName)

    page.once('dialog', (dialog) => dialog.accept())
    await page.locator('.card', { hasText: updatedSupplierName }).first().locator('button[title="Delete supplier"]').click()

    await expect(page.getByText('Supplier deleted')).toBeVisible()
    await expect(page.locator('body')).not.toContainText(updatedSupplierName)
  })
})
