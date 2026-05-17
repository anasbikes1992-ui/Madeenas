# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-workflows.spec.ts >> Admin dashboard smoke >> loads core admin pages and shows LKR formatting on KPI dashboard
- Location: e2e\critical-workflows.spec.ts:32:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
Call log:
  - navigating to "http://127.0.0.1:3100/admin/kpi-dashboard", waiting until "load"

```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test'
  2   | 
  3   | const users = {
  4   |   admin: {
  5   |     email: process.env.E2E_ADMIN_EMAIL ?? 'madeenas.lk@gmail.com',
  6   |     password: process.env.E2E_ADMIN_PASSWORD ?? '123456',
  7   |   },
  8   |   manager: {
  9   |     email: process.env.E2E_MANAGER_EMAIL ?? 'manager.wh@textilestock.com',
  10  |     password: process.env.E2E_MANAGER_PASSWORD ?? 'password123',
  11  |   },
  12  |   shop: {
  13  |     email: process.env.E2E_SHOP_EMAIL ?? 'shop.a@textilestock.com',
  14  |     password: process.env.E2E_SHOP_PASSWORD ?? 'password123',
  15  |   },
  16  | }
  17  | 
  18  | async function login(page: Page, email: string, password: string) {
  19  |   await page.goto('/login')
  20  |   await page.getByLabel('Email address').fill(email)
  21  |   await page.getByLabel('Password').fill(password)
  22  |   await page.getByRole('button', { name: 'Sign in' }).click()
  23  |   await page.waitForURL(/\/(admin|finance|gallery)\//)
  24  | }
  25  | 
  26  | async function signOut(page: Page) {
  27  |   await page.getByRole('button', { name: 'Sign out' }).click()
  28  |   await page.waitForURL(/\/login/)
  29  | }
  30  | 
  31  | test.describe('Admin dashboard smoke', () => {
  32  |   test('loads core admin pages and shows LKR formatting on KPI dashboard', async ({ page }) => {
  33  |     await login(page, users.admin.email, users.admin.password)
  34  | 
  35  |     await page.goto('/admin/dashboard')
  36  |     await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
  37  |     await expect(page.getByText('Recent Stock Requests')).toBeVisible()
  38  | 
  39  |     await page.goto('/admin/inventory')
  40  |     await expect(page.getByRole('heading', { name: 'Inventory Matrix' })).toBeVisible()
  41  | 
  42  |     await page.goto('/admin/stock-in')
  43  |     await expect(page.getByRole('heading', { name: /Stock In/i })).toBeVisible()
  44  | 
  45  |     await page.goto('/admin/finance/dashboard')
  46  |     await expect(page.getByRole('heading', { name: /Finance Department/i })).toBeVisible()
  47  | 
> 48  |     await page.goto('/admin/kpi-dashboard')
      |                ^ Error: page.goto: net::ERR_ABORTED; maybe frame was detached?
  49  |     await expect(page.getByRole('heading', { name: 'KPI Dashboard' })).toBeVisible()
  50  |     await expect(page.locator('body')).not.toContainText('₹')
  51  |     await expect(page.locator('body')).toContainText(/LKR|Rs\./)
  52  |   })
  53  | })
  54  | 
  55  | test.describe('Stock request lifecycle', () => {
  56  |   test('lets a shop request from a warehouse, then approve, dispatch, and acknowledge', async ({ page }) => {
  57  |     const reference = `E2E-${Date.now()}`
  58  | 
  59  |     await login(page, users.shop.email, users.shop.password)
  60  |     await page.goto('/admin/new-request')
  61  | 
  62  |     await expect(page.getByText('Requesting Location')).toBeVisible()
  63  |     await expect(page.locator('#from-location option')).toContainText([
  64  |       'Select warehouse',
  65  |       '[WAREHOUSE] Warehouse A (Main)',
  66  |     ])
  67  | 
  68  |     await page.getByLabel('Select product').selectOption({ index: 1 })
  69  |     await page.getByLabel('Source location').selectOption({ label: '[WAREHOUSE] Warehouse A (Main)' })
  70  |     await page.getByLabel('Invoice number or reference').fill(reference)
  71  |     await page.getByLabel('Invoice Date').fill('2026-05-13')
  72  |     await page.getByRole('spinbutton').fill('1')
  73  |     await page.getByRole('button', { name: /Submit Request/i }).click()
  74  | 
  75  |     await expect(page.getByText('Request Submitted!')).toBeVisible()
  76  |     await page.getByRole('link', { name: 'View My Requests' }).click()
  77  |     await expect(page.locator('body')).toContainText(reference)
  78  |     await expect(page.locator('body')).toContainText('PENDING')
  79  | 
  80  |     await signOut(page)
  81  |     await login(page, users.manager.email, users.manager.password)
  82  |     await page.goto('/admin/stock-out')
  83  | 
  84  |     const pendingRow = page.locator('tr', { hasText: reference }).first()
  85  |     await expect(pendingRow).toBeVisible()
  86  |     await pendingRow.locator('button.btn-success').first().click()
  87  |     await page.getByRole('button', { name: 'Approve' }).click()
  88  | 
  89  |     await page.getByRole('button', { name: 'In-Progress (Approved/Dispatched)' }).click()
  90  |     const approvedRow = page.locator('tr', { hasText: reference }).first()
  91  |     await expect(approvedRow).toBeVisible()
  92  |     await approvedRow.locator('button.btn-primary').first().click()
  93  |     await page.getByRole('button', { name: 'Dispatch' }).click()
  94  | 
  95  |     await signOut(page)
  96  |     await login(page, users.shop.email, users.shop.password)
  97  |     await page.goto('/admin/my-requests')
  98  | 
  99  |     await expect(page.locator('body')).toContainText(reference)
  100 |     await page.getByRole('button', { name: /Acknowledge Receipt/i }).first().click()
  101 |     await expect(page.locator('body')).toContainText('ACKNOWLEDGED')
  102 |   })
  103 | })
  104 | 
```