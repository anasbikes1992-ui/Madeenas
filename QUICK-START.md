# Quick Start Guide - Madeenas v2

## Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Git

## Initial Setup

### 1. Install Dependencies
```bash
cd textilestock
npm install
```

### 2. Configure Environment
```bash
# Copy example env file
cp .env.example .env.local

# Edit .env.local with your credentials
# Example DATABASE_URL format:
# postgresql://username:password@localhost:5432/database_name
```

**Important**: Ensure your `DATABASE_URL` is correctly formatted:
```
DATABASE_URL="postgresql://user:password@host:5432/dbname"
DIRECT_URL="postgresql://user:password@host:5432/dbname"
```

### 3. Setup Database
```bash
# Generate Prisma client
npx prisma generate

# Apply schema to database
npx prisma db push

# Seed initial data (optional)
npx prisma db seed
```

### 4. Run Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Project Structure

```
textilestock/
├── prisma/
│   └── schema.prisma          # Database schema with VAT support
├── src/
│   ├── app/                   # Next.js app router
│   │   ├── admin/            # Admin dashboard
│   │   ├── finance/          # Finance module
│   │   ├── customer/         # Customer portal (NEW)
│   │   └── api/              # API routes
│   ├── lib/
│   │   ├── tax.ts           # ✨ VAT calculation utilities
│   │   ├── validation.ts    # ✨ Zod schemas
│   │   ├── auth.ts          # Authentication config
│   │   └── db.ts            # Prisma client
│   ├── services/            # ✨ Business logic layer
│   │   ├── sales.service.ts
│   │   ├── cart.service.ts
│   │   └── orders.service.ts
│   ├── components/          # React components
│   └── types/              # TypeScript types
├── DEVELOPMENT-PLAN.md     # ✨ Sprint roadmap
└── IMPLEMENTATION-SUMMARY.md  # ✨ What's completed

✨ = New in v2
```

---

## Key Features Implemented

### 1. VAT Integration (18%)
All sales and orders now include proper VAT breakdown:
- Subtotal (before tax)
- Tax amount (18% by default)
- Grand total (subtotal + tax)

### 2. Shopping Cart
Customers can:
- Add multiple products to cart
- Update quantities
- View real-time totals with VAT
- Checkout to create orders

### 3. Customer Orders
Multi-product orders with approval workflow:
- PENDING → APPROVED → PROCESSING → SHIPPED → DELIVERED
- Automatic conversion to Sale on fulfillment
- Stock deduction at fulfillment time

---

## Quick Examples

### Create a Sale with VAT
```typescript
// In your API route or component
import { createSale } from '@/services/sales.service';

const sale = await createSale({
  locationId: 'location-id',
  items: [
    { 
      productId: 'prod-1', 
      quantity: 10, 
      unitPrice: 100 
    },
  ],
  paymentMode: 'CASH',
  customerId: 'customer-id', // Optional
  customerName: 'John Doe',  // Optional
  customerPhone: '+251911234567', // Optional
}, soldById);

console.log(sale.grandTotal); // 1180 (1000 + 180 tax)
```

### Customer Cart Flow
```typescript
import { addToCart, getCartWithTotals } from '@/services/cart.service';

// Add to cart
await addToCart({
  customerId: 'cust-123',
  productId: 'prod-456',
  quantity: 2,
});

// Get cart with VAT calculation
const cart = await getCartWithTotals('cust-123');
console.log(cart.grandTotal); // Includes VAT
```

### Create Order from Cart
```typescript
import { createOrderFromCart } from '@/services/orders.service';

const order = await createOrderFromCart('cust-123', {
  shippingAddress: '123 Main St, Addis Ababa',
  phoneNumber: '+251911234567',
  note: 'Deliver before 5pm',
});

console.log(order.orderNumber); // ORD-2026-0001
```

---

## Testing

### Run Tests
```bash
# Unit tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage
```

### Test VAT Calculations
```typescript
import { calculateGrandTotal, validateTaxCalculation } from '@/lib/tax';

const result = calculateGrandTotal(1000, 18);
// { subTotal: 1000, taxRate: 18, taxAmount: 180, grandTotal: 1180 }

// Validate it's correct
validateTaxCalculation(result); // Returns true or throws
```

---

## Common Tasks

### Add a New API Endpoint
```typescript
// src/app/api/sales/route.ts
import { NextRequest } from 'next/server';
import { createSale } from '@/services/sales.service';
import { createSaleSchema } from '@/lib/validation';
import { getServerSession } from 'next-auth';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const session = await getServerSession();
    if (!session?.user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse and validate
    const body = await request.json();
    const data = createSaleSchema.parse(body);

    // Create sale
    const sale = await createSale(data, session.user.id);

    return Response.json({
      success: true,
      data: sale,
    });
  } catch (error) {
    console.error('Create sale error:', error);
    return Response.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
```

### Generate a Tax Report
```typescript
import { generateTaxReport } from '@/services/sales.service';

const report = await generateTaxReport(
  new Date('2026-01-01'),
  new Date('2026-12-31'),
  true // Include location breakdown
);

console.log(`Tax collected: ${report.totalTaxCollected}`);
```

### Add RBAC Middleware
```typescript
// src/middleware.ts (Update this)
import { withAuth } from 'next-auth/middleware';

export default withAuth({
  callbacks: {
    authorized: ({ req, token }) => {
      const path = req.nextUrl.pathname;
      
      // Customer routes
      if (path.startsWith('/customer')) {
        return token?.role === 'CUSTOMER';
      }
      
      // Admin routes
      if (path.startsWith('/admin')) {
        return token?.role === 'ADMIN';
      }
      
      // Finance routes
      if (path.startsWith('/finance')) {
        return ['ADMIN', 'FINANCE'].includes(token?.role);
      }
      
      return !!token;
    },
  },
});

export const config = {
  matcher: ['/admin/:path*', '/finance/:path*', '/customer/:path*'],
};
```

---

## Troubleshooting

### Database Connection Error
If you see "invalid domain character":
1. Check `DATABASE_URL` format in `.env.local`
2. Escape special characters in password (use URL encoding)
3. Example: `password#123` → `password%23123`

### Prisma Client Not Found
```bash
npx prisma generate
```

### Schema Out of Sync
```bash
npx prisma db push --force-reset
# Warning: This will reset your database!
```

### Type Errors After Schema Changes
1. Regenerate Prisma client: `npx prisma generate`
2. Restart TypeScript server in VS Code: `Ctrl+Shift+P` → "Restart TS Server"

---

## Development Workflow

### Before Making Changes
1. Create a feature branch:
   ```bash
   git checkout -b feature/sprint-1-vat-ui
   ```

2. Check current sprint tasks in `DEVELOPMENT-PLAN.md`

### After Making Changes
1. Run linter:
   ```bash
   npm run lint
   ```

2. Run tests:
   ```bash
   npm run test
   ```

3. Commit with descriptive message:
   ```bash
   git commit -m "feat: add VAT breakdown to POS UI"
   ```

4. Push and create PR:
   ```bash
   git push -u origin feature/sprint-1-vat-ui
   ```

---

## Next Steps

See `DEVELOPMENT-PLAN.md` for the full roadmap.

**Current Sprint**: Sprint 0 - Foundation (80% complete)

**Next Sprint**: Sprint 1 - Core Enhancements + VAT
- Update POS UI with VAT display
- Create invoice templates with tax breakdown
- Add barcode scanning

---

## Useful Commands

```bash
# Development
npm run dev                 # Start dev server
npm run build              # Production build
npm run start              # Start production server

# Database
npx prisma studio          # Open Prisma Studio (DB GUI)
npx prisma db push         # Push schema changes
npx prisma db seed         # Seed data
npx prisma migrate dev     # Create migration

# Code Quality
npm run lint               # Run ESLint
npm run format             # Format with Prettier
npm run type-check         # TypeScript type checking

# Testing
npm run test               # Run unit tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
npm run test:e2e          # E2E tests
```

---

## Getting Help

- **Development Plan**: See `DEVELOPMENT-PLAN.md`
- **Implementation Status**: See `IMPLEMENTATION-SUMMARY.md`
- **API Documentation**: See `API-DOCUMENTATION.md`
- **Prisma Schema**: See `prisma/schema.prisma`

---

**Happy Coding!** 🚀
