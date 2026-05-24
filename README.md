# Madeenas Textile Management System

Modern textile inventory, sales, and customer ordering platform built for Sri Lankan textile raw material trading operations.

**Version**: 2.0
**Region**: Sri Lanka (LKR + VAT)
**Tech Stack**: Next.js 16 + Prisma + PostgreSQL + Flutter

## 🎯 Platform Components

- **Web/API**: Next.js + Prisma (`textilestock`)
- **Mobile**: Flutter (`textilestock_mobile`)

---

## ✨ What's New in v2.0

### 🧾 VAT Integration (18%)
- Sri Lanka-ready VAT support with 18% tax rate
- Automatic tax calculations on all sales and orders
- Tax breakdown display: Subtotal + Tax Amount = Grand Total
- Comprehensive tax reporting

### 🛒 Customer Portal
- Customer registration and authentication
- Multi-product shopping cart with persistence
- Online ordering system
- Order tracking and history

### 📦 Enhanced Order Management
- Multi-product order support (replaced single-product orders)
- Order approval workflow: PENDING → APPROVED → PROCESSING → SHIPPED → DELIVERED
- Order-to-sale conversion on fulfillment
- Stock deduction at fulfillment time

### 🔐 Role-Based Access Control (RBAC)
- **ADMIN**: Full system access
- **STORE_KEEPER**: Inventory management
- **FINANCE**: Financial reporting and analytics
- **CUSTOMER**: Shopping cart and order placement (NEW)

---

## Documentation

Use these docs as the current source of truth:

- **[QUICK-START.md](./QUICK-START.md)** - local setup, commands, and implementation examples
- **[API-DOCUMENTATION.md](./API-DOCUMENTATION.md)** - markdown API reference
- **`/api-docs`** - browser API reference page
- **`/openapi.json`** - OpenAPI specification for tooling or Swagger-compatible viewers

---

## 🏗️ Architecture

### Service Layer (Business Logic)
All business logic is isolated in service files:
- `src/services/sales.service.ts` - Sales with VAT calculations
- `src/services/cart.service.ts` - Shopping cart management
- `src/services/orders.service.ts` - Customer order workflow

### Tax Utilities
- `src/lib/tax.ts` - Comprehensive VAT calculation functions
- `src/lib/validation.ts` - Zod schemas for type-safe validation

### Database Schema (Prisma)
- Enhanced models with VAT fields
- Cart and CartItem for shopping cart
- CustomerOrder with OrderItem for multi-product orders
- OrderStatus enum for workflow tracking

### Key Features
✅ Point of Sale (POS) with VAT breakdown and invoice export  
✅ Inventory management with multi-location support  
✅ Customer database with credit tracking  
✅ Sales reporting with tax analytics  
✅ Stock management (IN/OUT requests)  
✅ Audit logging for all critical operations  
✅ Customer portal with cart, checkout, and order tracking  
🚧 Mobile app (Flutter) - verify parity with the latest web/API flows  

---

## Getting Started (Web)

### Prerequisites
- Node.js 20+ 
- PostgreSQL 15+
- npm/pnpm/yarn

### Step 1: Install Dependencies

```bash
cd textilestock
npm install
```

### Step 2: Configure Database

Create `.env.local` file:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/madeenas"
DIRECT_URL="postgresql://username:password@localhost:5432/madeenas"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-a-random-secret-here"

# Optional stock transfer policy (approval workflow)
# If transfer quantity >= threshold OR transfer value >= threshold,
# approval is required before dispatch.
STOCK_TRANSFER_APPROVAL_QTY_THRESHOLD=500
STOCK_TRANSFER_APPROVAL_VALUE_THRESHOLD=200000

# Optional: Backup system (see below)
BACKUP_ENABLED=false
```

**Important**: Ensure special characters in password are URL-encoded!

### Step 3: Setup Database Schema

```bash
# Generate Prisma client
npx prisma generate

# Push schema to database
npx prisma db push

# (Optional) Seed with initial data
npx prisma db seed
```

### Step 4: Run Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Mobile App (Flutter)

Build using your Flutter SDK path:

```bash
cd ../textilestock_mobile
d:/Flutter/bin/flutter.bat pub get
d:/Flutter/bin/flutter.bat analyze
d:/Flutter/bin/flutter.bat test
d:/Flutter/bin/flutter.bat build apk --release --dart-define=ENV=production --dart-define=API_URL=https://madeenas.vercel.app/api
```

APK output:

```text
textilestock_mobile/build/app/outputs/flutter-apk/app-release.apk
```

## Hourly Database Backup Email (Vercel Cron)

The app includes an internal cron endpoint at `/api/internal/backup/hourly`.

It is scheduled hourly via `vercel.json` and is protected by `BACKUP_CRON_SECRET`.

Required environment variables:

- `BACKUP_ENABLED=true`
- `BACKUP_CRON_SECRET=<long-random-secret>`
- `BACKUP_ADMIN_EMAILS=admin1@domain.com,admin2@domain.com`
- `BACKUP_FROM_EMAIL=noreply@domain.com`
- `RESEND_API_KEY=re_xxx`
- `BACKUP_MAX_ROWS_PER_TABLE=5000`

Manual smoke test:

```bash
curl -X POST http://localhost:3000/api/internal/backup/hourly \
	-H "Authorization: Bearer YOUR_BACKUP_CRON_SECRET"
```

---

## 🔧 Common Development Tasks

### Create a Sale with VAT
```typescript
import { createSale } from '@/services/sales.service';

const sale = await createSale({
  locationId: 'location-id',
  items: [
    { productId: 'prod-1', quantity: 10, unitPrice: 100 }
  ],
  paymentMode: 'CASH',
}, userId);

console.log(sale.grandTotal); // 1180 (1000 + 18% tax)
```

### Add to Cart
```typescript
import { addToCart } from '@/services/cart.service';

await addToCart({
  customerId: 'customer-id',
  productId: 'product-id',
  quantity: 5,
});
```

### Create Order from Cart
```typescript
import { createOrderFromCart } from '@/services/orders.service';

const order = await createOrderFromCart('customer-id', {
  shippingAddress: 'No. 145, First Cross Street, Pettah, Colombo 11',
  phoneNumber: '+94771234567',
});

console.log(order.orderNumber); // ORD-2026-0001
```

### Generate Tax Report
```typescript
import { generateTaxReport } from '@/services/sales.service';

const report = await generateTaxReport(
  new Date('2026-01-01'),
  new Date('2026-12-31'),
  true // Include location breakdown
);
```

---

## 🧪 Testing

```bash
# Unit tests
npm run test

# E2E tests
npm run e2e

# Coverage report
npm run test:coverage

# Type checking
npm run typecheck
```

---

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
