# Services layer

Domain workflows that should stay **thin at the route boundary**:

- [`customer-orders.service.ts`](./customer-orders.service.ts) — list/update gallery `CustomerOrder` records for admin APIs.

**Next extractions (recommended):** stock-out lifecycle, sales checkout, and finance review transitions — move Prisma transactions here from `src/app/api/**/route.ts` for easier testing.
