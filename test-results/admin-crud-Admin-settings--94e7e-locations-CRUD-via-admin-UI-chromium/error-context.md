# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin-crud.spec.ts >> Admin settings CRUD flows >> locations CRUD via admin UI
- Location: e2e\admin-crud.spec.ts:54:7

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('.card').filter({ hasText: 'E2E Location 1781874489119 Updated' }).first().getByText('Inactive')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.card').filter({ hasText: 'E2E Location 1781874489119 Updated' }).first().getByText('Inactive')

```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - generic [ref=e2]:
    - complementary [ref=e4]:
      - generic [ref=e5]:
        - img [ref=e7]
        - generic [ref=e9]:
          - generic [ref=e10]: Madeena Tex
          - generic [ref=e11]: Super Admin
      - navigation [ref=e12]:
        - generic [ref=e13]:
          - generic [ref=e14]: Overview
          - link "⊞ Dashboard" [ref=e15] [cursor=pointer]:
            - /url: /admin/dashboard
            - generic [ref=e16]: ⊞
            - generic [ref=e17]: Dashboard
        - generic [ref=e18]:
          - generic [ref=e19]: Inventory
          - link "📦 Products" [ref=e20] [cursor=pointer]:
            - /url: /admin/products
            - generic [ref=e21]: 📦
            - generic [ref=e22]: Products
          - link "📊 Inventory Matrix" [ref=e23] [cursor=pointer]:
            - /url: /admin/inventory
            - generic [ref=e24]: 📊
            - generic [ref=e25]: Inventory Matrix
          - link "⬇️ Stock In" [ref=e26] [cursor=pointer]:
            - /url: /admin/stock-in
            - generic [ref=e27]: ⬇️
            - generic [ref=e28]: Stock In
          - link "⚖️ Stock Adjustments" [ref=e29] [cursor=pointer]:
            - /url: /admin/stock-adjustments
            - generic [ref=e30]: ⚖️
            - generic [ref=e31]: Stock Adjustments
          - link "📜 Stock Journal" [ref=e32] [cursor=pointer]:
            - /url: /admin/stock-journal
            - generic [ref=e33]: 📜
            - generic [ref=e34]: Stock Journal
        - generic [ref=e35]:
          - generic [ref=e36]: Stock Requests
          - link "📋 All Requests" [ref=e37] [cursor=pointer]:
            - /url: /admin/stock-out
            - generic [ref=e38]: 📋
            - generic [ref=e39]: All Requests
          - link "📤 My Requests" [ref=e40] [cursor=pointer]:
            - /url: /admin/my-requests
            - generic [ref=e41]: 📤
            - generic [ref=e42]: My Requests
          - link "➕ New Request" [ref=e43] [cursor=pointer]:
            - /url: /admin/new-request
            - generic [ref=e44]: ➕
            - generic [ref=e45]: New Request
          - link "🚚 Send Stock" [ref=e46] [cursor=pointer]:
            - /url: /admin/send-stock
            - generic [ref=e47]: 🚚
            - generic [ref=e48]: Send Stock
        - generic [ref=e49]:
          - generic [ref=e50]: Activity
          - link "🔔 Notifications" [ref=e51] [cursor=pointer]:
            - /url: /admin/notifications
            - generic [ref=e52]: 🔔
            - generic [ref=e53]: Notifications
          - link "🕘 History" [ref=e54] [cursor=pointer]:
            - /url: /admin/history
            - generic [ref=e55]: 🕘
            - generic [ref=e56]: History
        - generic [ref=e57]:
          - generic [ref=e58]: Customers
          - link "🛍️ Order Requests" [ref=e59] [cursor=pointer]:
            - /url: /admin/customer-orders
            - generic [ref=e60]: 🛍️
            - generic [ref=e61]: Order Requests
          - link "🖼️ View Gallery" [ref=e62] [cursor=pointer]:
            - /url: /gallery
            - generic [ref=e63]: 🖼️
            - generic [ref=e64]: View Gallery
        - generic [ref=e65]:
          - generic [ref=e66]: Sales & POS
          - link "🛒 Point of Sale" [ref=e67] [cursor=pointer]:
            - /url: /admin/pos
            - generic [ref=e68]: 🛒
            - generic [ref=e69]: Point of Sale
          - link "🧾 Sales History" [ref=e70] [cursor=pointer]:
            - /url: /admin/sales
            - generic [ref=e71]: 🧾
            - generic [ref=e72]: Sales History
        - generic [ref=e73]:
          - generic [ref=e74]: Finance
          - link "💰 Finance Overview" [ref=e75] [cursor=pointer]:
            - /url: /admin/finance/dashboard
            - generic [ref=e76]: 💰
            - generic [ref=e77]: Finance Overview
          - link "🧾 Tally Reviews" [ref=e78] [cursor=pointer]:
            - /url: /admin/finance/reviews
            - generic [ref=e79]: 🧾
            - generic [ref=e80]: Tally Reviews
        - generic [ref=e81]:
          - generic [ref=e82]: Reports
          - link "📈 Reports" [ref=e83] [cursor=pointer]:
            - /url: /admin/reports
            - generic [ref=e84]: 📈
            - generic [ref=e85]: Reports
          - link "📜 Audit Logs" [ref=e86] [cursor=pointer]:
            - /url: /admin/reports/audit-logs
            - generic [ref=e87]: 📜
            - generic [ref=e88]: Audit Logs
        - generic [ref=e89]:
          - generic [ref=e90]: Settings
          - link "👥 Users" [ref=e91] [cursor=pointer]:
            - /url: /admin/settings/users
            - generic [ref=e92]: 👥
            - generic [ref=e93]: Users
          - link "🏭 Locations" [ref=e94] [cursor=pointer]:
            - /url: /admin/settings/locations
            - generic [ref=e95]: 🏭
            - generic [ref=e96]: Locations
          - link "🏷️ Categories" [ref=e97] [cursor=pointer]:
            - /url: /admin/settings/categories
            - generic [ref=e98]: 🏷️
            - generic [ref=e99]: Categories
          - link "🚛 Suppliers" [ref=e100] [cursor=pointer]:
            - /url: /admin/settings/suppliers
            - generic [ref=e101]: 🚛
            - generic [ref=e102]: Suppliers
      - generic [ref=e104]:
        - generic [ref=e105]: MA
        - generic [ref=e106]:
          - generic [ref=e107]: Madeena Admin
          - generic [ref=e108]: madeenas.lk@gmail.com
        - button "Sign out" [ref=e109]:
          - img [ref=e110]
    - generic [ref=e112]:
      - banner [ref=e113]:
        - generic [ref=e114]:
          - button "Collapse sidebar" [ref=e115]:
            - img [ref=e116]
          - navigation [ref=e118]:
            - generic [ref=e119]: Madeena Tex
            - generic [ref=e120]: /
            - generic [ref=e121]: locations
            - generic [ref=e122]: 06:38:20 PM
        - generic [ref=e123]:
          - button "🔔 9+" [ref=e125]:
            - text: 🔔
            - generic [ref=e126]: 9+
          - link "🖼️ Gallery" [ref=e127] [cursor=pointer]:
            - /url: /gallery
          - link "+ New Request" [ref=e128] [cursor=pointer]:
            - /url: /admin/new-request
      - main [ref=e129]:
        - generic [ref=e130]:
          - generic [ref=e131]:
            - generic [ref=e132]:
              - img [ref=e134]
              - generic [ref=e137]:
                - heading "Locations" [level=1] [ref=e138]
                - paragraph [ref=e139]: 5 locations
            - button "Add Location" [ref=e140]:
              - img [ref=e141]
              - text: Add Location
          - generic [ref=e142]:
            - generic [ref=e143]:
              - generic [ref=e145]:
                - heading "Madeena Textile Shop" [level=3] [ref=e147]
                - paragraph [ref=e148]:
                  - code [ref=e149]: MADEENASHOP
                  - text: •
                  - generic [ref=e150]: SHOP
                - paragraph [ref=e151]: 📍 198/C Keyzer Street, Colombo 11
              - generic [ref=e152]:
                - button "Edit" [ref=e153]:
                  - img [ref=e154]
                  - text: Edit
                - button "Deactivate" [ref=e157]:
                  - img [ref=e158]
                  - text: Deactivate
                - button [ref=e163]:
                  - img [ref=e164]
            - generic [ref=e167]:
              - generic [ref=e169]:
                - heading "Dematagoda Store" [level=3] [ref=e171]
                - paragraph [ref=e172]:
                  - code [ref=e173]: DMSTORE
                  - text: •
                  - generic [ref=e174]: WAREHOUSE
                - paragraph [ref=e175]: 📍 Dematagoda Store
              - generic [ref=e176]:
                - button "Edit" [ref=e177]:
                  - img [ref=e178]
                  - text: Edit
                - button "Deactivate" [ref=e181]:
                  - img [ref=e182]
                  - text: Deactivate
                - button [ref=e187]:
                  - img [ref=e188]
            - generic [ref=e191]:
              - generic [ref=e193]:
                - heading "GrandPass Store" [level=3] [ref=e195]
                - paragraph [ref=e196]:
                  - code [ref=e197]: GPST
                  - text: •
                  - generic [ref=e198]: WAREHOUSE
                - paragraph [ref=e199]: 📍 Grandpass Store
              - generic [ref=e200]:
                - button "Edit" [ref=e201]:
                  - img [ref=e202]
                  - text: Edit
                - button "Deactivate" [ref=e205]:
                  - img [ref=e206]
                  - text: Deactivate
                - button [ref=e211]:
                  - img [ref=e212]
            - generic [ref=e215]:
              - generic [ref=e217]:
                - heading "Maligawatte Store" [level=3] [ref=e219]
                - paragraph [ref=e220]:
                  - code [ref=e221]: MS
                  - text: •
                  - generic [ref=e222]: WAREHOUSE
                - paragraph [ref=e223]: 📍 Maligawatte Store
              - generic [ref=e224]:
                - button "Edit" [ref=e225]:
                  - img [ref=e226]
                  - text: Edit
                - button "Deactivate" [ref=e229]:
                  - img [ref=e230]
                  - text: Deactivate
                - button [ref=e235]:
                  - img [ref=e236]
            - generic [ref=e239]:
              - generic [ref=e241]:
                - heading "Reclamation Store" [level=3] [ref=e243]
                - paragraph [ref=e244]:
                  - code [ref=e245]: RECST
                  - text: •
                  - generic [ref=e246]: WAREHOUSE
                - paragraph [ref=e247]: 📍 Reclamation
              - generic [ref=e248]:
                - button "Edit" [ref=e249]:
                  - img [ref=e250]
                  - text: Edit
                - button "Deactivate" [ref=e253]:
                  - img [ref=e254]
                  - text: Deactivate
                - button [ref=e259]:
                  - img [ref=e260]
  - region "Notifications alt+T"
  - button "Open Next.js Dev Tools" [ref=e268] [cursor=pointer]:
    - img [ref=e269]
  - alert [ref=e272]
```

# Test source

```ts
  1   | import { test, expect, type Page } from '@playwright/test'
  2   | 
  3   | const adminUser = {
  4   |   email: process.env.E2E_ADMIN_EMAIL ?? 'madeenas.lk@gmail.com',
  5   |   password: process.env.E2E_ADMIN_PASSWORD ?? '123456',
  6   | }
  7   | 
  8   | async function loginAsAdmin(page: Page) {
  9   |   await page.goto('/login')
  10  |   await page.getByLabel('Email address').fill(adminUser.email)
  11  |   await page.getByLabel('Password').fill(adminUser.password)
  12  |   await page.getByRole('button', { name: 'Sign in' }).click()
  13  |   await page.waitForURL(/\/admin\//)
  14  | }
  15  | 
  16  | test.describe('Admin settings CRUD flows', () => {
  17  |   test.beforeEach(async ({ page }) => {
  18  |     await loginAsAdmin(page)
  19  |   })
  20  | 
  21  |   test('categories CRUD via admin UI', async ({ page }) => {
  22  |     const seed = Date.now()
  23  |     const categoryName = `E2E Category ${seed}`
  24  |     const updatedName = `${categoryName} Updated`
  25  | 
  26  |     await page.goto('/admin/settings/categories')
  27  |     await page.getByRole('button', { name: /Add Category/i }).click()
  28  |     const createModal = page.locator('.modal').first()
  29  |     await expect(createModal).toBeVisible()
  30  | 
  31  |     await createModal.locator('input').nth(0).fill(categoryName)
  32  |     await createModal.locator('input').nth(3).fill('🧪')
  33  |     await createModal.getByRole('button', { name: /Create Category/i }).click()
  34  | 
  35  |     await expect(page.getByText('Category created!')).toBeVisible()
  36  |     await expect(page.locator('body')).toContainText(categoryName)
  37  | 
  38  |     const row = page.locator('.card', { hasText: categoryName }).first()
  39  |     await row.getByRole('button', { name: /Edit/i }).click()
  40  |     const editModal = page.locator('.modal').first()
  41  |     await expect(editModal).toBeVisible()
  42  |     await editModal.locator('input').nth(0).fill(updatedName)
  43  |     await editModal.getByRole('button', { name: /Save Changes/i }).click()
  44  | 
  45  |     await expect(page.getByText('Category updated!')).toBeVisible()
  46  |     await expect(page.locator('body')).toContainText(updatedName)
  47  | 
  48  |     page.once('dialog', (dialog) => dialog.accept())
  49  |     await page.locator('.card', { hasText: updatedName }).first().getByRole('button', { name: /Delete/i }).click()
  50  |     await expect(page.getByText('Category deleted')).toBeVisible()
  51  |     await expect(page.locator('body')).not.toContainText(updatedName)
  52  |   })
  53  | 
  54  |   test('locations CRUD via admin UI', async ({ page }) => {
  55  |     const seed = Date.now()
  56  |     const locationName = `E2E Location ${seed}`
  57  |     const locationCode = `E2E-${String(seed).slice(-6)}`
  58  |     const updatedLocationName = `${locationName} Updated`
  59  | 
  60  |     await page.goto('/admin/settings/locations')
  61  |     await page.getByRole('button', { name: /Add Location/i }).click()
  62  |     const createModal = page.locator('.modal').first()
  63  |     await expect(createModal).toBeVisible()
  64  | 
  65  |     await createModal.locator('input').nth(0).fill(locationName)
  66  |     await createModal.locator('input').nth(1).fill(locationCode)
  67  |     await createModal.locator('select').first().selectOption('WAREHOUSE')
  68  |     await createModal.locator('textarea').first().fill('E2E test location')
  69  |     await createModal.getByRole('button', { name: /Create Location/i }).click()
  70  | 
  71  |     await expect(page.getByText('Location created successfully!')).toBeVisible()
  72  |     await expect(page.locator('body')).toContainText(locationName)
  73  | 
  74  |     const card = page.locator('.card', { hasText: locationName }).first()
  75  |     await card.getByRole('button', { name: /Edit/i }).click()
  76  |     const editModal = page.locator('.modal').first()
  77  |     await expect(editModal).toBeVisible()
  78  |     await editModal.locator('input').nth(0).fill(updatedLocationName)
  79  |     await editModal.getByRole('button', { name: /Save Changes/i }).click()
  80  | 
  81  |     await expect(page.getByText('Location updated successfully!')).toBeVisible()
  82  |     await expect(page.locator('body')).toContainText(updatedLocationName)
  83  | 
  84  |     page.once('dialog', (dialog) => dialog.accept())
  85  |     await page.locator('.card', { hasText: updatedLocationName }).first().getByRole('button', { name: /Deactivate/i }).click()
  86  | 
  87  |     const updatedCard = page.locator('.card', { hasText: updatedLocationName }).first()
> 88  |     await expect(updatedCard.getByText('Inactive')).toBeVisible()
      |                                                     ^ Error: expect(locator).toBeVisible() failed
  89  |     await expect(page.locator('.toast, .toast-success, .toast-info')).toContainText(/Location (deactivated|activated)/i)
  90  |   })
  91  | 
  92  |   test('suppliers CRUD via admin UI', async ({ page }) => {
  93  |     const seed = Date.now()
  94  |     const supplierName = `E2E Supplier ${seed}`
  95  |     const updatedSupplierName = `${supplierName} Updated`
  96  | 
  97  |     await page.goto('/admin/settings/suppliers')
  98  |     await page.getByRole('button', { name: /Add Supplier/i }).click()
  99  |     const createModal = page.locator('.modal').first()
  100 |     await expect(createModal).toBeVisible()
  101 | 
  102 |     await createModal.locator('input').nth(0).fill(supplierName)
  103 |     await createModal.locator('input').nth(1).fill('E2E Contact')
  104 |     await createModal.locator('input').nth(2).fill(`e2e-${seed}@example.com`)
  105 |     await createModal.locator('input').nth(3).fill('0771234567')
  106 |     await createModal.locator('textarea').first().fill('E2E supplier address')
  107 |     await createModal.getByRole('button', { name: /Create Supplier/i }).click()
  108 | 
  109 |     await expect(page.getByText('Supplier created!')).toBeVisible()
  110 |     await expect(page.locator('body')).toContainText(supplierName)
  111 | 
  112 |     const card = page.locator('.card', { hasText: supplierName }).first()
  113 |     await card.locator('button[title="Edit supplier"]').click()
  114 |     const editModal = page.locator('.modal').first()
  115 |     await expect(editModal).toBeVisible()
  116 |     await editModal.locator('input').nth(0).fill(updatedSupplierName)
  117 |     await editModal.getByRole('button', { name: /Save Changes/i }).click()
  118 | 
  119 |     await expect(page.getByText('Supplier updated!')).toBeVisible()
  120 |     await expect(page.locator('body')).toContainText(updatedSupplierName)
  121 | 
  122 |     page.once('dialog', (dialog) => dialog.accept())
  123 |     await page.locator('.card', { hasText: updatedSupplierName }).first().locator('button[title="Delete supplier"]').click()
  124 | 
  125 |     await expect(page.getByText('Supplier deleted')).toBeVisible()
  126 |     await expect(page.locator('body')).not.toContainText(updatedSupplierName)
  127 |   })
  128 | })
  129 | 
```