# Madeenas v2 - Redesign & Re-architecture Plan

## Vision
Modern, scalable textile inventory platform with enhanced customer self-service, VAT compliance, real-time capabilities, and improved UX.

## Tech Stack (Updated)
- **Frontend**: Next.js 16+ (App Router, Server Actions/Components)
- **Database**: Prisma + PostgreSQL
- **Styling**: Tailwind CSS + shadcn/ui
- **State Management**: TanStack Query/Table + Zustand
- **Authentication**: Auth.js (NextAuth v5) with RBAC
- **Caching**: Redis (caching, rate limiting, sessions)
- **Realtime**: Supabase/Pusher for live updates
- **Validation**: Zod + React Hook Form
- **Export**: jsPDF + Excel export

## Folder Structure (Feature-Based)
```
src/
├── app/                     # Routes (admin/, finance/, customer/, api/)
├── features/
│   ├── auth/               # Authentication & authorization
│   ├── products/           # Product catalog & management
│   ├── inventory/          # Stock management & tracking
│   ├── sales/              # POS + sales orders
│   ├── customer-portal/    # New: login, cart, orders
│   ├── dashboard/          # Analytics & reporting
│   └── shared/             # Shared components & utilities
├── lib/
│   ├── auth.ts            # Auth configuration
│   ├── db.ts              # Prisma client
│   ├── tax.ts             # VAT calculation utilities
│   ├── validation.ts      # Zod schemas
│   └── utils.ts           # Shared utilities
├── services/              # Business logic layer
├── components/            # Shared UI components
└── types/                # TypeScript type definitions
```

---

## Sprint Plan

### Sprint 0: Foundation ✅ (Current Sprint)
**Goal**: Establish solid foundation for all future work

#### Tasks:
- [x] Create DEVELOPMENT-PLAN.md
- [ ] Update dependencies & Next.js config
- [ ] Implement strict RBAC + middleware for roles (including CUSTOMER)
- [ ] Extend Prisma schema:
  - VAT fields on Sale/SaleItem
  - Cart and CartItem models
  - CustomerOrder and OrderItem models
  - Customer model enhancements
- [ ] Restructure to feature-based folders
- [ ] Add Zod schemas for all major entities
- [ ] Set up TanStack Query, Zustand for global state
- [ ] Global error/toast system
- [ ] Create tax calculation utility (lib/tax.ts)

**Deliverables**:
- Updated Prisma schema with migration
- Tax calculation utilities
- Feature-based folder structure
- RBAC middleware with CUSTOMER role support

---

### Sprint 1: Core Enhancements + VAT
**Goal**: Integrate VAT calculations throughout the system

#### Tasks:
- [ ] Update Sale / SaleItem creation/update logic with VAT
- [ ] Modify POS UI to show VAT breakdown
- [ ] Update invoice/receipt templates with tax details
- [ ] Improve product catalog with better search/filter
- [ ] Add barcode scanning (web + mobile support)
- [ ] Enhanced audit logging for financial transactions
- [ ] VAT configuration settings page

**Deliverables**:
- VAT-compliant sale transactions
- Updated invoices with tax breakdown
- Improved product catalog
- Barcode scanning capability

---

### Sprint 2: Customer Portal - Auth & Profile
**Goal**: Enable customers to create accounts and manage profiles

#### Tasks:
- [ ] Customer registration flow (`/customer/signup`)
- [ ] Customer login / logout (`/customer/login`)
- [ ] Protected customer routes middleware
- [ ] Customer dashboard (`/customer/dashboard`)
- [ ] Profile management page:
  - View/edit contact details
  - Manage addresses
  - View credit eligibility
- [ ] Role-based navigation (separate customer menu)
- [ ] Password reset flow
- [ ] Email verification (optional)

**Deliverables**:
- Complete customer authentication system
- Customer dashboard and profile management
- Role-based access control for customer routes

---

### Sprint 3: Cart & Checkout
**Goal**: Enable customers to browse, add products to cart, and place orders

#### Tasks:
- [ ] Shopping cart functionality:
  - Add to cart (with real-time stock validation)
  - Update quantity
  - Remove items
  - Persistent cart (DB + localStorage sync)
- [ ] Cart UI component with:
  - Product images
  - Prices
  - Quantity controls
  - Stock availability indicators
- [ ] Checkout process:
  - Cart review page
  - Shipping/billing details form
  - VAT calculation display
  - Order summary
- [ ] Create CustomerOrder on checkout
- [ ] Order confirmation page

**Deliverables**:
- Fully functional shopping cart
- Complete checkout flow
- Order creation with PENDING status

---

### Sprint 4: Order Workflow & Fulfillment
**Goal**: Admin tools to manage and fulfill customer orders

#### Tasks:
- [ ] Admin order management dashboard
- [ ] Order detail view with line items
- [ ] Order status workflow:
  - PENDING → APPROVED → PROCESSING → SHIPPED → DELIVERED
  - CANCELLED, REFUNDED states
- [ ] Approval interface (Store Manager → Finance)
- [ ] Convert approved order to Sale + StockOut
- [ ] Notification system:
  - In-app notifications
  - Email notifications
  - Status change alerts
- [ ] Customer order tracking page
- [ ] Order history with filters

**Deliverables**:
- Complete order management system
- Approval workflow
- Notification system
- Customer order tracking

---

### Sprint 5: Analytics, Reports & Polish
**Goal**: Enhanced reporting and system polish

#### Tasks:
- [ ] VAT reports:
  - Tax collected by period
  - Tax liability summary
  - Input tax credit (if purchases added)
- [ ] Enhanced dashboards:
  - Sales by product category
  - Sales by location
  - Tax analytics
  - Customer analytics
- [ ] PDF invoice generation with VAT breakdown
- [ ] Excel export for reports
- [ ] Performance optimization:
  - Query optimization
  - Implement Redis caching
  - Image optimization
- [ ] Mobile responsiveness audit
- [ ] PWA improvements (offline mode, service worker)

**Deliverables**:
- Comprehensive VAT reporting
- Enhanced analytics dashboards
- Optimized performance
- Mobile-ready application

---

### Sprint 6: Testing, Mobile & Deployment
**Goal**: Ensure quality and deploy to production

#### Tasks:
- [ ] E2E tests for customer flows (Playwright):
  - Registration/login
  - Browse products
  - Add to cart
  - Checkout
  - Order tracking
- [ ] Unit tests for critical business logic:
  - VAT calculations
  - Order workflow
  - Stock management
- [ ] Flutter mobile app updates:
  - Customer login
  - Product browsing
  - Cart sync
- [ ] Security audit:
  - SQL injection prevention
  - XSS protection
  - CSRF tokens
  - Rate limiting
- [ ] Documentation:
  - API documentation
  - User guide
  - Admin guide
  - Developer setup guide
- [ ] Staging deployment
- [ ] Production deployment
- [ ] Monitoring & logging setup

**Deliverables**:
- Comprehensive test coverage (>80%)
- Updated mobile app
- Security-hardened application
- Complete documentation
- Production deployment

---

## Key Non-Functional Requirements

### Performance
- Page load time < 2 seconds
- API response time < 300ms (95th percentile)
- Support 100+ concurrent users
- Optimistic UI updates for better UX

### Security
- Type-safe API endpoints
- Input validation on all forms
- SQL injection prevention
- XSS protection
- Rate limiting on authentication endpoints
- Audit logging for financial transactions

### Maintainability
- Type safety everywhere (strict TypeScript)
- Comprehensive error handling
- Consistent code style (ESLint + Prettier)
- Feature-based architecture
- Clear separation of concerns

### Accessibility
- WCAG 2.1 Level AA compliance
- Keyboard navigation
- Screen reader support
- High contrast mode

---

## VAT Implementation Details

### Tax Configuration
```typescript
// lib/tax.ts
export const TAX_CONFIG = {
  DEFAULT_RATE: 18, // 18%
  ZERO_RATED_CATEGORIES: [], // Future: zero-rated items
  EXEMPT_CUSTOMER_IDS: [], // Future: tax-exempt customers
}

export function calculateTax(amount: number, rate: number = TAX_CONFIG.DEFAULT_RATE) {
  return (amount * rate) / 100
}

export function calculateGrandTotal(subTotal: number, taxRate: number = TAX_CONFIG.DEFAULT_RATE) {
  const taxAmount = calculateTax(subTotal, taxRate)
  return {
    subTotal,
    taxRate,
    taxAmount,
    grandTotal: subTotal + taxAmount
  }
}
```

### Database Schema Extensions
```prisma
model Sale {
  // ... existing fields
  subTotal      Float   @default(0)   // Sum of all line items before tax
  taxRate       Float   @default(18)  // VAT percentage (default 18%)
  taxAmount     Float   @default(0)   // Calculated tax
  grandTotal    Float                 // subTotal + taxAmount
}

model SaleItem {
  // ... existing fields
  subTotal    Float   @default(0)     // quantity × unitPrice
  taxRate     Float   @default(18)    // VAT percentage
  taxAmount   Float   @default(0)     // Calculated tax for this item
  total       Float   @default(0)     // subTotal + taxAmount
}

model Cart {
  id          String     @id @default(cuid())
  customerId  String
  customer    User       @relation(fields: [customerId], references: [id])
  items       CartItem[]
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt
}

model CartItem {
  id          String   @id @default(cuid())
  cartId      String
  cart        Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  quantity    Float
  unitPrice   Float
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model CustomerOrder {
  id              String        @id @default(cuid())
  orderNumber     String        @unique // e.g., "ORD-2026-0001"
  customerId      String
  customer        User          @relation(fields: [customerId], references: [id])
  items           OrderItem[]
  status          OrderStatus   @default(PENDING)
  
  // Amounts
  subTotal        Float
  taxRate         Float         @default(18)
  taxAmount       Float
  grandTotal      Float
  
  // Shipping
  shippingAddress String
  billingAddress  String?
  phoneNumber     String
  
  // Workflow
  approvedBy      String?
  approvedAt      DateTime?
  fulfilledBy     String?
  fulfilledAt     DateTime?
  
  // Link to Sale after fulfillment
  saleId          String?       @unique
  sale            Sale?         @relation(fields: [saleId], references: [id])
  
  notes           String?
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

enum OrderStatus {
  PENDING
  APPROVED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

model OrderItem {
  id          String        @id @default(cuid())
  orderId     String
  order       CustomerOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId   String
  product     Product       @relation(fields: [productId], references: [id])
  quantity    Float
  unitPrice   Float
  subTotal    Float
  taxRate     Float         @default(18)
  taxAmount   Float
  total       Float
  createdAt   DateTime      @default(now())
}
```

---

## Getting Started in VSCode

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis (optional, for caching)
- Git

### Setup Steps
1. Clone repository and install dependencies:
   ```bash
   git clone <repo-url>
   cd textilestock
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your database credentials
   ```

3. Set up database:
   ```bash
   npx prisma generate
   npx prisma db push
   # or: npx prisma migrate dev --name init
   npx prisma db seed
   ```

4. Install recommended VSCode extensions:
   - ESLint
   - Prettier
   - Prisma
   - Tailwind CSS IntelliSense
   - GitLens

5. Run development server:
   ```bash
   npm run dev
   ```

6. Open http://localhost:3000

### Development Workflow
1. Check current sprint tasks above
2. Create feature branch: `git checkout -b feature/sprint-N-task-name`
3. Implement changes following the architecture
4. Write tests
5. Run linting: `npm run lint`
6. Commit with descriptive message
7. Create pull request
8. After review, merge to main

---

## Current Status

**Active Sprint**: Sprint 0 - Foundation  
**Start Date**: May 11, 2026  
**Progress**: 10%

### Next Immediate Actions
1. ✅ Create DEVELOPMENT-PLAN.md
2. Update Prisma schema with VAT fields and new models
3. Create tax calculation utility
4. Run database migration
5. Implement RBAC middleware for CUSTOMER role
6. Begin folder restructure

---

## Success Criteria

### Sprint 0 Complete When:
- [ ] All Prisma models updated and migrated
- [ ] Tax calculation utility created and tested
- [ ] Feature-based folder structure implemented
- [ ] RBAC middleware supports CUSTOMER role
- [ ] All existing features still work

### Project Complete When:
- [ ] All 6 sprints completed
- [ ] 80%+ test coverage
- [ ] All security audits passed
- [ ] Documentation complete
- [ ] Production deployment successful
- [ ] Customer portal fully functional
- [ ] VAT calculations accurate across all flows

---

## Notes & Decisions

### Why Feature-Based Architecture?
- Better scalability as project grows
- Clear boundaries between features
- Easier for team collaboration
- Simpler to test in isolation

### Why Auth.js over Custom Auth?
- Production-ready with best practices
- Multiple provider support
- Session management handled
- Active community & maintenance

### Why Zod?
- Type-safe validation
- Runtime + compile-time checks
- Great TypeScript inference
- Composable schemas

### Why TanStack Query?
- Powerful caching strategy
- Optimistic updates
- Automatic refetching
- Perfect for data-heavy apps

---

**Last Updated**: May 11, 2026  
**Maintained By**: Development Team  
**Review Frequency**: End of each sprint
