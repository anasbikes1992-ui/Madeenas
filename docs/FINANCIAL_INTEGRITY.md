# Financial integrity — rules for this codebase

These are the invariants the money in this system depends on. Each one exists
because it was previously broken. Please read before changing anything under
`src/services`, `src/lib/money.ts`, or `prisma/schema.prisma`.

## 1. Never do arithmetic on money with JS numbers

Money is `DECIMAL(12,2)` and quantities are `DECIMAL(12,3)` in Postgres, so
Prisma hands back `Prisma.Decimal`. All financial arithmetic goes through
`src/lib/money.ts`.

```ts
// WRONG — floating point cannot represent currency (0.1 + 0.2 !== 0.3)
const total = price * qty + tax

// RIGHT
import { computeSaleTotals } from '@/lib/money'
const totals = computeSaleTotals(lines, taxRate, discount)
```

`num()` from the same module converts a Decimal to a number for **display or
comparison only** — never to compute a stored figure.

Money serializes to JSON as a number (`Prisma.Decimal.prototype.toJSON` is
overridden in `src/lib/db.ts`), so API consumers see `1250.5`, not `"1250.50"`.
Do not remove that override: every client parses these as numbers.

## 2. The server owns prices. Always.

Clients send **identity and quantity**. The server looks up
`ProductVariant.salePrice` and computes every total.

The web POS may send `unitPrice` as an explicit cashier override; it is audited
in the sale's `AuditLog` entry. Nothing else may set a price.

Retail (customer-facing) prices come from `computeRetailPrice()` using the
`retail_markup` setting. There is exactly one markup, in the database — the app
once hardcoded ×1.25 while the web cart used ×1.20, so the same item had two
prices depending on where you looked.

An unpriced variant has **no price**. Never substitute a fallback; the mobile app
used to default to LKR 1.00 and would happily sell stock for one rupee.

## 3. There is one sale engine

`createSale` / `createSaleInTx` in `src/services/sales.service.ts` is the only
way a `Sale` is created. Web POS, mobile POS, customer-order fulfilment, and
`orders.service.fulfillOrder` all call it. There were once five separate
implementations, each with its own tax maths and its own bugs.

If a sale must be atomic with other writes, use `createSaleInTx(tx, input)` with
`SALE_TX_OPTIONS`.

## 4. Stock is decremented with a guard, last, in a stable order

```ts
const result = await tx.stock.updateMany({
  where: { variantId, locationId, quantity: { gte: needed } },
  data: { quantity: { decrement: needed } },
})
if (result.count === 0) throw new InsufficientStockError(label)
```

Three things matter and all are load-bearing:

- **The `gte` guard** makes overselling impossible. A read-then-write check
  (`findUnique` then `update`) is a TOCTOU race — two concurrent sales both pass
  it. There is also a DB `CHECK (quantity >= 0)` as a backstop.
- **It happens last**, immediately before commit, so the row lock is held for the
  shortest possible time. Concurrent sales queue on that lock while their own
  transaction clock runs; holding it during unrelated work makes legitimate
  sales fail with "transaction expired".
- **Lines are sorted by `variantId`** so two sales sharing items always take
  locks in the same order and cannot deadlock.

Covered by `sales.service.integration.test.ts` ("does not oversell under
concurrency").

## 5. Document numbers come from Postgres sequences

`nextDocNumber()` uses `nextval`, which is atomic and lock-free. Do not replace
it with "find the last one and add one" (a race that produces duplicate keys) or
with `Date.now()` + random (collides by construction). Numbers are globally
monotonic; a rolled-back sale leaves a gap, which is the correct trade-off for
guaranteed uniqueness.

## 6. Credit is real money

A `CREDIT` sale writes a `CreditEntry` and updates `CreditLedger.totalOwed` in
the same transaction as the sale. Repayments go through
`recordCreditPayment()`, which locks the ledger row (`SELECT … FOR UPDATE`) so
concurrent payments cannot double-credit a customer.

Sign convention: `totalOwed > 0` means the customer owes the shop;
`totalOwed < 0` means they hold store credit.

## 7. Business constants live in `AppSetting`

`retail_markup`, `vat_rate`, `currency`, `mobile_min_version`. Read them via
`src/lib/settings.ts`. Do not hardcode a VAT rate or a markup anywhere — that is
precisely how the pricing drift happened.

---

## Danger: `prisma migrate diff --shadow-database-url`

**Prisma resets the database given as the shadow database.** It drops the schema
to replay migrations into it. Point it at a throwaway database only — never at
one holding real data. Passing a live connection string wipes it.

The CI drift check creates a dedicated `madeena_shadow` database for this reason
(see `.github/workflows/ci-cd.yml`).

## Recovering from a wipe

1. `npx prisma migrate deploy` — recreate the schema.
2. `npx prisma db seed` — reseeds `AppSetting` defaults and restores master data
   (locations, users with their original password hashes, products, variants,
   stock, suppliers, customers) from the JSON backup in `BACKUP_DIR`.
3. If the tables exist but Prisma reports migrations as unapplied, baseline them
   rather than re-running:
   `npx prisma migrate resolve --applied <migration_name>` for each.

Transactional history (sales, transfers) is intentionally not restored by the
seed — it starts clean.

## Before you commit

```bash
npm run verify   # typecheck + lint + tests (unit and integration)
```

The integration tests need a real database and are the only thing that proves
the concurrency guarantees above still hold. Do not skip them because they are
slow.
