# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: critical-workflows.spec.ts >> Stock request lifecycle >> lets a shop request from a warehouse, then approve, dispatch, and acknowledge
- Location: e2e\critical-workflows.spec.ts:56:7

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.fill: Test timeout of 30000ms exceeded.
Call log:
  - waiting for getByLabel('Invoice Date')

```

# Page snapshot

```yaml
- generic [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e7]
        - generic [ref=e9]:
          - generic [ref=e10]: Madeena Tex
          - generic [ref=e11]: Shop Staff
      - navigation [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Overview
          - link "⊞ Dashboard" [ref=e15] [cursor=pointer]:
            - /url: /admin/dashboard
            - generic [ref=e16]: ⊞
            - generic [ref=e17]: Dashboard
        - generic [ref=e18]:
          - generic [ref=e19]: Stock Requests
          - link "📋 All Requests" [ref=e20] [cursor=pointer]:
            - /url: /admin/stock-out
            - generic [ref=e21]: 📋
            - generic [ref=e22]: All Requests
          - link "📤 My Requests" [ref=e23] [cursor=pointer]:
            - /url: /admin/my-requests
            - generic [ref=e24]: 📤
            - generic [ref=e25]: My Requests
          - link "➕ New Request" [ref=e26] [cursor=pointer]:
            - /url: /admin/new-request
            - generic [ref=e27]: ➕
            - generic [ref=e28]: New Request
        - generic [ref=e29]:
          - generic [ref=e30]: Activity
          - link "🔔 Notifications" [ref=e31] [cursor=pointer]:
            - /url: /admin/notifications
            - generic [ref=e32]: 🔔
            - generic [ref=e33]: Notifications
        - generic [ref=e34]:
          - generic [ref=e35]: Customers
          - link "🖼️ View Gallery" [ref=e36] [cursor=pointer]:
            - /url: /gallery
            - generic [ref=e37]: 🖼️
            - generic [ref=e38]: View Gallery
        - generic [ref=e39]:
          - generic [ref=e40]: Sales & POS
          - link "🛒 Point of Sale" [ref=e41] [cursor=pointer]:
            - /url: /admin/pos
            - generic [ref=e42]: 🛒
            - generic [ref=e43]: Point of Sale
          - link "🧾 Sales History" [ref=e44] [cursor=pointer]:
            - /url: /admin/sales
            - generic [ref=e45]: 🧾
            - generic [ref=e46]: Sales History
      - generic [ref=e48]:
        - generic [ref=e49]: SA
        - generic [ref=e50]:
          - generic [ref=e51]: Shop A Staff
          - generic [ref=e52]: shop.a@textilestock.com
        - button "Sign out" [ref=e53]:
          - img [ref=e54]
    - generic [ref=e56]:
      - banner [ref=e57]:
        - generic [ref=e58]:
          - button "Collapse sidebar" [ref=e59]:
            - img [ref=e60]
          - navigation [ref=e62]:
            - generic [ref=e63]: Madeena Tex
            - generic [ref=e64]: /
            - generic [ref=e65]: new request
            - generic [ref=e66]: 10:51:31 PM
        - generic [ref=e67]:
          - button "🔔" [ref=e69]
          - link "🖼️ Gallery" [ref=e70] [cursor=pointer]:
            - /url: /gallery
          - link "+ New Request" [ref=e71] [cursor=pointer]:
            - /url: /admin/new-request
      - main [ref=e72]:
        - generic [ref=e73]:
          - generic [ref=e74]:
            - heading "New Stock Movement Request" [level=1] [ref=e75]
            - paragraph [ref=e76]: Request stock from a warehouse to your assigned shop. Warehouse staff dispatch it, then your shop acknowledges receipt.
          - generic [ref=e77]:
            - generic [ref=e78]:
              - generic [ref=e79]: Product *
              - combobox "Select product" [ref=e80]:
                - option "Select a product"
                - option "Silk Cut Piece — BL-007" [selected]
                - option "Nylon Lot — BL-006"
                - option "Printed Lot Mixed — BL-005"
                - option "Cotton Cut Piece — BL-004"
                - option "Viscose Cut Piece New — BL-003"
                - option "Reyon Lot China — BL-002"
                - option "Maaza Printed Lot — BL-001"
                - option "Ribbon Lace — LT-006"
                - option "Elastic Border — LT-005"
                - option "Lace Nylon — LT-004"
                - option "Border Sarong — LT-003"
                - option "Lace Cotton Printed — LT-002"
                - option "Lace Cotton Plain — LT-001"
                - option "Plain Shirting 45\" — SH-011"
                - option "Check Shirting — SH-010"
                - option "Poly Viscose Suiting — SH-009"
                - option "TC Suiting — SH-008"
                - option "Cotton Poplin Stripe — SH-007"
                - option "Cotton Dobbi 60\" — SH-006"
                - option "Radio Shirting — SH-005"
                - option "TC Shirting 60\" — SH-004"
                - option "Oxford Shirting — SH-003"
                - option "Poplin Printed — SH-002"
                - option "Poplin Plain — SH-001"
                - option "Bed Cover Plain — BED-005"
                - option "Pillow Cover Set — BED-004"
                - option "Cotton Bed Sheet New — BED-003"
                - option "Bed Sheet Double — BED-002"
                - option "Bed Sheet Single — BED-001"
                - option "3MTR Premium Set — NF-010"
                - option "3MTR Fancy Nighty — NF-009"
                - option "3MTR Classic Designer — NF-008"
                - option "3MTR Star Galaxy — NF-007"
                - option "3MTR Vama Export — NF-006"
                - option "3MTR Moonlight Rajwadi — NF-005"
                - option "3MTR Century Gold — NF-004"
                - option "3MTR Babagold — NF-003"
                - option "3MTR Ocean Pearl Dhaman — NF-002"
                - option "3MTR Kushboo Export — NF-001"
                - option "Moonlight Rajwadi Saree — SAR-008"
                - option "Century Gold Saree — SAR-007"
                - option "Ocean Pearl Saree — SAR-006"
                - option "Butterfly Saree — SAR-005"
                - option "Royal Queen Saree — SAR-004"
                - option "Golden Rose Saree — SAR-003"
                - option "Flora Saree — SAR-002"
                - option "Aura Saree — SAR-001"
                - option "Pure Silk Charmeuse — SS-001"
                - option "Interlock Cotton Knit — KF-002"
                - option "Jersey Knit Single — KF-001"
                - option "Dobby Weave Fabric — WF-003"
                - option "Cotton Poplin Stripe — WF-002"
                - option "Premium Cotton Voile — WF-001"
              - generic [ref=e82]:
                - text: Silk Cut Piece
                - generic [ref=e83]: (Bulk / Lots)
            - generic [ref=e84]:
              - generic [ref=e85]: Fulfill From Warehouse *
              - combobox "Source location" [ref=e86]:
                - option "Select warehouse"
                - option "[WAREHOUSE] Warehouse A (Main)" [selected]
                - option "[WAREHOUSE] Warehouse B (Secondary)"
              - generic [ref=e87]:
                - text: "Available at this location:"
                - strong [ref=e88]: 200 KG
            - generic [ref=e89]:
              - generic [ref=e90]: Requesting Location
              - generic [ref=e91]:
                - generic [ref=e92]: Shop A (Downtown)
                - generic [ref=e93]: This request will be delivered here and must be acknowledged by your shop account.
            - generic [ref=e94]:
              - generic [ref=e95]:
                - generic [ref=e96]: Quantity Requested *
                - spinbutton [ref=e97]
              - generic [ref=e98]:
                - generic [ref=e99]: Invoice Date
                - textbox [ref=e100]
            - generic [ref=e101]:
              - generic [ref=e102]: Invoice Number / Reference *
              - textbox "Invoice number or reference" [active] [ref=e103]:
                - /placeholder: e.g. INV-2024-00123
                - text: E2E-1778692862432
              - paragraph [ref=e104]: Enter the invoice number from your external invoicing system
            - generic [ref=e105]:
              - generic [ref=e106]: Notes / Remarks
              - textbox "Additional notes for this request..." [ref=e107]
            - generic [ref=e108]:
              - button "📤 Submit Request" [ref=e109]
              - link "Cancel" [ref=e110] [cursor=pointer]:
                - /url: /admin/stock-out
  - button "Open Next.js Dev Tools" [ref=e116] [cursor=pointer]:
    - img [ref=e117]
  - alert [ref=e120]
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
  48  |     await page.goto('/admin/kpi-dashboard')
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
> 71  |     await page.getByLabel('Invoice Date').fill('2026-05-13')
      |                                           ^ Error: locator.fill: Test timeout of 30000ms exceeded.
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