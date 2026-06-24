# 🚀 Madeena Textile Management System - V3 Evolution Plan

**Status**: Planning Phase  
**Target**: Incremental improvements with backward compatibility  
**Approach**: Impact-first, test-driven, non-breaking

---

## 📊 Current State Analysis (V2)

### ✅ Strengths
- Modern stack: Next.js 16 + Prisma + PostgreSQL + Supabase
- Clean architecture with service layer separation
- Comprehensive business logic (inventory, sales, orders, returns)
- Security: 2FA, RBAC, rate limiting, audit logs
- VAT integration (18% Sri Lanka)
- Customer portal with cart/checkout
- Hierarchical product system (designed but **migration pending**)

### ⚠️ Gaps & Technical Debt
1. **Low test coverage** (7 tests total: 5 unit, 2 E2E)
2. **Incomplete notifications** (8 TODOs: email, WhatsApp, SMS)
3. **No caching strategy** (potential N+1 queries)
4. **Hierarchical migration not executed** (risk of data inconsistency)
5. **Real-time updates not wired** (WebSocket service exists but unused)
6. **511 linting errors** (CSS classes, accessibility)
7. **No performance monitoring** (APM, slow query detection)
8. **SMS service missing** (2FA uses TOTP only)

---

## 🎯 V3 Priorities (Impact Matrix)

### **Phase 1: Foundation & Stability** (Weeks 1-3)
**Goal**: Fix critical gaps, boost reliability

| Priority | Task | Impact | Effort | Files |
|----------|------|--------|--------|-------|
| 🔴 P0 | Execute hierarchical product migration | High | Medium | `scripts/migrate-to-variants.ts` |
| 🔴 P0 | Complete notification system (8 TODOs) | High | Medium | `services/email.service.ts`, APIs |
| 🔴 P0 | Add comprehensive test coverage (80%+ target) | High | High | All services, critical flows |
| 🟡 P1 | Implement Redis caching layer | High | Medium | New: `lib/cache.ts` |
| 🟡 P1 | Fix accessibility issues (WCAG 2.1) | Medium | Low | UI components |

### **Phase 2: Performance & Scale** (Weeks 4-6)
**Goal**: Optimize for production load

| Priority | Task | Impact | Effort | Files |
|----------|------|--------|--------|-------|
| 🟡 P1 | Query optimization (N+1 elimination) | High | Medium | All API routes |
| 🟡 P1 | Real-time inventory updates (WebSocket) | Medium | Medium | `services/websocket.service.ts` |
| 🟢 P2 | Database indexing review | High | Low | `schema.prisma` |
| 🟢 P2 | API response compression (gzip) | Medium | Low | `next.config.ts` |
| 🟢 P2 | Image optimization pipeline | Medium | Low | Product images |

### **Phase 3: Business Features** (Weeks 7-10)
**Goal**: New capabilities for competitive advantage

| Priority | Task | Impact | Effort | Files |
|----------|------|--------|--------|-------|
| 🟡 P1 | SMS integration (Twilio) for 2FA & alerts | Medium | Medium | New: `services/sms.service.ts` |
| 🟡 P1 | WhatsApp Business API for order updates | Medium | Medium | `services/whatsapp.service.ts` |
| 🟢 P2 | Advanced analytics dashboard | Medium | High | New: `app/admin/analytics` |
| 🟢 P2 | Supplier portal (PO management) | Medium | High | New: `app/supplier` |
| 🟢 P2 | Barcode scanning (mobile app) | Medium | Medium | Flutter app |

### **Phase 4: DevOps & Monitoring** (Weeks 11-12)
**Goal**: Observability and proactive issue detection

| Priority | Task | Impact | Effort | Files |
|----------|------|--------|--------|-------|
| 🟡 P1 | APM integration (Sentry/DataDog) | Medium | Low | `lib/monitoring.ts` |
| 🟡 P1 | Automated DB backups & restore tests | High | Low | `scripts/backup.ts` (enhance) |
| 🟢 P2 | CI/CD pipeline hardening | Medium | Low | `.github/workflows` |
| 🟢 P2 | Load testing suite (k6/Artillery) | Medium | Medium | New: `loadtest/` |

---

## 🔧 Detailed Implementation Roadmap

### **P0: Critical Fixes (Week 1-2)**

#### 1️⃣ **Execute Hierarchical Product Migration** 
**Risk**: Data inconsistency between flat `Product` and variant system

**Steps**:
```bash
# Backup database first
npm run backup:create

# Dry run (verify only)
npx tsx scripts/migrate-to-variants.ts verify

# Migrate all products
npx tsx scripts/migrate-to-variants.ts

# Verify migration
SELECT COUNT(*) FROM "Product" WHERE "hasVariants" = true;
SELECT COUNT(*) FROM "ProductColor";
SELECT COUNT(*) FROM "StockVariant";
```

**Success Criteria**:
- ✅ All products migrated with `hasVariants = true`
- ✅ SKUs generated (`CAT-PROD-VARIANT-COLOR`)
- ✅ Stock totals match pre-migration
- ✅ Zero data loss

**Rollback Plan**: Restore from backup if verification fails

---

#### 2️⃣ **Complete Notification System**
**Current**: 8 TODOs across checkout, orders, returns

**Tasks**:
- [ ] **Order confirmation emails** → `src/app/api/checkout/route.ts:54`
- [ ] **Admin order notifications** → `src/app/api/checkout/route.ts:55`
- [ ] **Fulfillment notifications** → `src/app/api/orders/[id]/fulfill/route.ts:40`
- [ ] **Order approval notifications** → `src/app/api/orders/[id]/approve/route.ts:47`
- [ ] **Cancellation notifications** → `src/app/api/orders/[id]/cancel/route.ts:53`
- [ ] **Return status updates** → `src/services/returns.service.ts:186,222,335`

**Implementation**:
```typescript
// services/notification-dispatcher.service.ts (NEW)
export async function dispatchOrderNotification(
  event: 'ORDER_CREATED' | 'ORDER_APPROVED' | 'ORDER_FULFILLED' | 'ORDER_CANCELLED',
  order: CustomerOrder
) {
  const tasks = [];
  
  // Email customer
  tasks.push(sendOrderEmail(order.customer.email, event, order));
  
  // Notify admin via email
  tasks.push(sendAdminAlert(event, order));
  
  // WhatsApp notification (if enabled)
  if (order.customer.phone && isTenantFeatureEnabled('whatsapp')) {
    tasks.push(sendWhatsAppNotification(order.customer.phone, event, order));
  }
  
  // In-app notification
  tasks.push(createNotification({
    type: event,
    userId: order.customerId,
    message: getEventMessage(event, order),
  }));
  
  await Promise.allSettled(tasks); // Don't block on notification failures
}
```

**Success Criteria**:
- ✅ All 8 TODOs removed
- ✅ Email templates created (transactional)
- ✅ Notification fallback logic (if email fails, still create in-app notification)
- ✅ Tests for each notification type

---

#### 3️⃣ **Test Coverage to 80%+**
**Current**: 7 tests total (inadequate)

**Target Coverage**:
- ✅ Services: 90%+ (critical business logic)
- ✅ API routes: 80%+ (integration tests)
- ✅ E2E flows: 10 critical paths

**Priority Test Suites**:

1. **Sales Service** (`src/services/sales.service.ts`)
```typescript
// src/services/sales.service.test.ts
describe('Sales Service', () => {
  describe('VAT calculation', () => {
    it('calculates 18% VAT correctly', () => {});
    it('handles credit sales with customer credit check', () => {});
    it('deducts stock on sale creation', () => {});
  });
  
  describe('error handling', () => {
    it('throws on insufficient stock', () => {});
    it('throws on invalid customer credit', () => {});
  });
});
```

2. **Stock Management** (IN/OUT/Adjustments)
3. **Order Fulfillment Flow** (E2E)
4. **Cart & Checkout** (E2E)
5. **Returns Processing**

**Tools**:
- Unit: Vitest (already configured)
- E2E: Playwright (already configured)
- Coverage: `npm run test:coverage`

**Success Criteria**:
- ✅ 80%+ line coverage across services
- ✅ All critical API endpoints tested
- ✅ E2E tests for 10 core flows

---

### **P1: Performance & Scale (Week 3-4)**

#### 4️⃣ **Implement Redis Caching Layer**
**Problem**: Multiple N+1 queries visible in search results (product lookups, location queries)

**Strategy**:
```typescript
// lib/cache.ts (NEW)
import { Redis } from '@upstash/redis'

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

export async function cachedQuery<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 300 // 5 minutes default
): Promise<T> {
  const cached = await redis.get<T>(key)
  if (cached) return cached
  
  const fresh = await fetcher()
  await redis.setex(key, ttl, JSON.stringify(fresh))
  return fresh
}

export async function invalidateCache(pattern: string) {
  // Invalidate on stock changes, product updates
  await redis.del(pattern)
}
```

**Apply to hot paths**:
- ✅ Product search (`/api/products/search`)
- ✅ Dashboard stats (`/api/dashboard`)
- ✅ Inventory matrix (`/api/inventory`)
- ✅ Gallery products (`/api/gallery`)

**Cache Invalidation Triggers**:
- Stock IN/OUT/Adjustment → Invalidate `inventory:*`, `product:*`
- Product update → Invalidate `product:{id}`, `search:*`
- Location change → Invalidate `location:*`

**Success Criteria**:
- ✅ 50%+ reduction in DB queries for read-heavy endpoints
- ✅ Dashboard load time < 500ms (from ~2s)
- ✅ Search response time < 300ms

---

#### 5️⃣ **Query Optimization (N+1 Elimination)**

**Audit Results** (from semantic search):
- ❌ `/api/dashboard` - Multiple `findMany` calls without `include`
- ❌ `/api/stock-journal` - Separate queries for IN/OUT/Adjustments
- ❌ `/api/inventory` - Reorder suggestions loop over products

**Optimization Examples**:

**Before** (N+1):
```typescript
// BAD: N+1 query
const orders = await prisma.customerOrder.findMany({ where: { status: 'PENDING' } })
for (const order of orders) {
  const customer = await prisma.customer.findUnique({ where: { id: order.customerId } })
  // ... process
}
```

**After** (Single query):
```typescript
// GOOD: Include relation
const orders = await prisma.customerOrder.findMany({
  where: { status: 'PENDING' },
  include: {
    customer: true,
    items: { include: { product: true } }
  }
})
```

**Database Indexing** (add to `schema.prisma`):
```prisma
model Stock {
  // ...existing fields
  
  @@index([locationId, quantity])  // NEW: Fast low-stock queries
  @@index([productId, updatedAt])  // NEW: Recent stock changes
}

model Sale {
  // ...existing fields
  
  @@index([locationId, createdAt])  // NEW: Sales reports by location
  @@index([customerId, createdAt])  // NEW: Customer order history
}

model StockOutRequest {
  // ...existing fields
  
  @@index([status, fromLocationId])  // NEW: Pending requests by location
  @@index([requestedBy, createdAt])   // NEW: User request history
}
```

**Success Criteria**:
- ✅ Zero N+1 queries in production logs
- ✅ All API routes < 500ms P95 latency
- ✅ Database query count reduced 30%+

---

#### 6️⃣ **Real-Time Inventory Updates (WebSocket)**
**Status**: Service exists but not wired to UI

**Implementation**:
```typescript
// services/websocket.service.ts (ENHANCE)
export function broadcastStockUpdate(locationId: string, productId: string, delta: number) {
  io.to(`location:${locationId}`).emit('stock:update', {
    productId,
    delta,
    timestamp: new Date().toISOString()
  })
}

// Hook into stock changes
// src/app/api/stock-in/route.ts
await prisma.stock.update({...})
broadcastStockUpdate(locationId, productId, quantity) // ADD THIS
```

**Frontend** (`src/hooks/useRealtimeStock.ts`):
```typescript
import { useEffect } from 'react'
import { socket } from '@/lib/socket'

export function useRealtimeStock(locationId: string, onUpdate: (data: StockUpdate) => void) {
  useEffect(() => {
    socket.emit('join', `location:${locationId}`)
    socket.on('stock:update', onUpdate)
    
    return () => {
      socket.off('stock:update', onUpdate)
      socket.emit('leave', `location:${locationId}`)
    }
  }, [locationId, onUpdate])
}
```

**Success Criteria**:
- ✅ Stock changes reflect instantly across all connected clients
- ✅ Location-scoped rooms (users only see their location updates)
- ✅ Reconnection logic handles network drops

---

### **P2: Business Features (Week 5-8)**

#### 7️⃣ **SMS Integration (Twilio)**
**Use Cases**: 2FA OTP, low-stock alerts, order status

```typescript
// services/sms.service.ts (IMPLEMENT)
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

export async function sendSMS(to: string, body: string) {
  try {
    const message = await client.messages.create({
      body,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: formatPhoneNumber(to) // +94771234567
    })
    return { success: true, sid: message.sid }
  } catch (error) {
    console.error('SMS send failed:', error)
    return { success: false, error }
  }
}

export async function send2FAOTP(phone: string, code: string) {
  return sendSMS(phone, `Your Madeena verification code: ${code}. Valid for 5 minutes.`)
}
```

**Success Criteria**:
- ✅ OTP SMS for 2FA (alternative to TOTP app)
- ✅ Low-stock alerts to warehouse managers
- ✅ Order shipped notifications to customers

---

#### 8️⃣ **WhatsApp Business API**
**Status**: Infrastructure exists, needs activation

**Implementation**:
```typescript
// services/whatsapp.service.ts (ACTIVATE)
export async function sendOrderStatusWhatsApp(
  phone: string,
  orderNumber: string,
  status: OrderStatus
) {
  const message = generateWhatsAppTemplate(status, orderNumber)
  return sendWhatsAppMessage(phone, message)
}
```

**Templates**:
- Order Confirmed
- Order Shipped (with tracking)
- Order Delivered
- Stock Replenishment Alert (for shop staff)

**Success Criteria**:
- ✅ 90%+ delivery rate for order notifications
- ✅ Opt-in/opt-out mechanism for customers

---

## 📈 Success Metrics (V3)

| Metric | V2 Baseline | V3 Target |
|--------|-------------|-----------|
| Test Coverage | ~5% | 80%+ |
| API P95 Latency | ~2000ms | <500ms |
| Dashboard Load Time | ~3s | <800ms |
| Notification Delivery Rate | 0% (not implemented) | 95%+ |
| Real-time Stock Updates | No | Yes |
| Database Query Efficiency | N+1 present | Zero N+1 |
| Linting Errors | 511 | <50 |
| Mobile App Parity | 70% | 95% |

---

## 🛡️ Risk Mitigation

### **Data Migration Risks**
- ✅ **Backup before migration** (automated: `npm run backup:create`)
- ✅ **Dry run verification** (`verify` mode)
- ✅ **Rollback plan** (restore from backup)
- ✅ **Gradual rollout** (migrate in batches, validate each)

### **Breaking Changes**
- ✅ **Feature flags** for new functionality
- ✅ **Backward compatibility** (support both flat + hierarchical products temporarily)
- ✅ **API versioning** if schema changes required

### **Performance Degradation**
- ✅ **Load testing** before production deploy
- ✅ **Gradual rollout** (canary deployment)
- ✅ **Monitoring alerts** (Sentry/DataDog)

---

## 🚦 Next Steps (Action Items)

### **This Week** (Immediate)
1. ✅ Review & approve this V3 plan
2. 🔴 **Execute hierarchical product migration** (P0, 2-3 days)
3. 🔴 **Complete notification system** (P0, 3-4 days)
4. 🔴 **Start test coverage push** (P0, ongoing)

### **Week 2-3**
5. 🟡 Implement Redis caching (P1)
6. 🟡 Query optimization audit & fixes (P1)
7. 🟡 Fix accessibility issues (P1)

### **Week 4-6**
8. 🟡 Real-time WebSocket integration (P1)
9. 🟢 Database indexing review (P2)
10. 🟢 SMS & WhatsApp integration (P2)

---

## 📞 Questions & Decisions

**For You to Decide**:
1. **Should we execute the hierarchical migration now?** (Recommended: Yes, with backup)
2. **Which notification channel is priority?** (Email → WhatsApp → SMS)
3. **Budget for Twilio/WhatsApp?** (Affects P2 SMS/WhatsApp timeline)
4. **APM tool preference?** (Sentry vs DataDog vs New Relic)
5. **Load testing schedule?** (Before/after caching implementation?)

**I can start with** the highest-impact items immediately if you approve:
- ✅ Hierarchical product migration
- ✅ Notification system completion
- ✅ Test coverage boost

---

**Ready to proceed?** Let me know which phase/task to tackle first! 🚀
