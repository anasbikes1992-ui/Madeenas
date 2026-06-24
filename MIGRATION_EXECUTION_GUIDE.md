# 🚀 Hierarchical Product Migration Execution Guide

**Target**: Migrate from flat `Product` model to hierarchical `Product → ProductVariant → ProductColor` system  
**Status**: READY TO EXECUTE  
**Risk Level**: MEDIUM (requires database backup)  
**Estimated Time**: 5-15 minutes (depends on product count)

---

## 📋 Pre-Flight Checklist

### ✅ Prerequisites (ALL MUST BE GREEN)

- [ ] **Database backup created** (`npm run backup:create` completed successfully)
- [ ] **Backup file verified** (check `backups/` folder for `.sql` file)
- [ ] **Production DATABASE_URL configured** (in `.env`)
- [ ] **Migration script exists** (`scripts/migrate-to-variants.ts`)
- [ ] **No active users on system** (best practice: migrate during maintenance window)
- [ ] **Rollback plan understood** (restore from backup if verification fails)

---

## 🎯 Execution Steps

### **Step 1: Verify Current State**

Run the verification command to see what will be migrated:

```powershell
npx tsx scripts/migrate-to-variants.ts verify
```

**Expected Output**:
```
Verifying migration...

Products migrated: 0
Colors in master: 0
Product variants: 0
Product colors: 0
Stock variants: 0

✓ All SKUs are unique

Stock totals:
  Old system: 1250
  New system: 0
  ⚠ Stock quantities don't match - investigation needed (NORMAL - not migrated yet)
```

**Action**: Verify the "Old system" stock total makes sense. If it's 0, you may have no stock to migrate (OK to proceed).

---

### **Step 2: Backup Database (CRITICAL)**

```powershell
# Create timestamped backup
npm run backup:create

# Expected output:
# Backup created: backups/backup-YYYYMMDD-HHMMSS.sql
```

**Verify Backup**:
```powershell
# Check file exists and has size > 0
dir backups\backup-*.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 1
```

**🚨 DO NOT PROCEED if backup fails!**

---

### **Step 3: Execute Migration**

Run the full migration:

```powershell
npx tsx scripts/migrate-to-variants.ts
```

**What Happens**:
1. Finds all products where `hasVariants = false`
2. For each product:
   - Creates/finds color in `ColorMaster` table
   - Creates default `ProductVariant` (using existing design as code)
   - Creates `ProductColor` with generated SKU (`CAT-PROD-VARIANT-COLOR`)
   - Migrates all stock records to `StockVariant`
   - Marks product as `hasVariants = true`
3. Runs automatic verification
4. Reports success/error counts

**Expected Output**:
```
Starting product migration to variant system...

Found 42 products to migrate

Migrating product abc123...
Processing: Cotton Fabric (SHADE-001) - Red
  ✓ Color: Red
  ✓ Variant: SHADE-001
  ✓ ProductColor: COTTON-FABRIC-SHADE-001-RED
    ✓ Stock: Location loc1 = 100
    ✓ Stock: Location loc2 = 50
  ✓ Product marked as migrated

[... more products ...]

========================================
Migration complete!
  Success: 42
  Errors: 0
========================================

Verifying migration...

Products migrated: 42
Colors in master: 15
Product variants: 42
Product colors: 42
Stock variants: 84

✓ All SKUs are unique

Stock totals:
  Old system: 1250
  New system: 1250
  ✓ Stock quantities match
```

---

### **Step 4: Verify Migration Success**

Check critical data:

```sql
-- Run in your PostgreSQL client (or Prisma Studio)

-- 1. All products migrated
SELECT COUNT(*) as migrated_products FROM "Product" WHERE "hasVariants" = true;
-- Expected: Same as "Found X products to migrate"

-- 2. SKU uniqueness
SELECT "sku", COUNT(*) FROM "ProductColor" GROUP BY "sku" HAVING COUNT(*) > 1;
-- Expected: 0 rows (no duplicates)

-- 3. Stock totals match
SELECT SUM(quantity) as old_total FROM "Stock";
SELECT SUM(quantity) as new_total FROM "StockVariant";
-- Expected: old_total = new_total

-- 4. No orphaned records
SELECT COUNT(*) FROM "ProductVariant" WHERE "productId" NOT IN (SELECT id FROM "Product");
-- Expected: 0

SELECT COUNT(*) FROM "ProductColor" WHERE "variantId" NOT IN (SELECT id FROM "ProductVariant");
-- Expected: 0
```

---

### **Step 5: Post-Migration Smoke Tests**

Test critical user flows:

#### **Test 1: Product Search**
```bash
# Hit the search API
curl "http://localhost:3000/api/products/search?q=cotton&locationId=<your-location-id>"

# Expected: Products returned with SKU in format CAT-PROD-VARIANT-COLOR
```

#### **Test 2: Stock-In Operation**
1. Go to `/admin/inventory`
2. Create a new stock-in entry
3. Verify quantity increases in both `Stock` and `StockVariant` tables

#### **Test 3: Sales Flow**
1. Add product to cart (customer portal)
2. Complete checkout
3. Verify stock deducted correctly

#### **Test 4: Dashboard**
```bash
curl "http://localhost:3000/api/dashboard"

# Expected: Dashboard loads without errors
# Check: lowStockCount, totalProducts, totalStockUnits
```

---

## 🔥 Rollback Plan (IF MIGRATION FAILS)

### **Scenario 1: Migration Script Errors (Some Products Failed)**

```powershell
# 1. Check error logs
# Look for "✗ Error migrating product" lines in console output

# 2. Option A: Fix and retry failed products
npx tsx scripts/migrate-to-variants.ts product <failed-product-id>

# 3. Option B: Full rollback (restore backup)
# See Scenario 2 below
```

### **Scenario 2: Critical Failure (Restore from Backup)**

```powershell
# 1. Identify latest backup
dir backups\backup-*.sql | Sort-Object LastWriteTime -Descending | Select-Object -First 1

# 2. Drop current database (⚠️ DESTRUCTIVE)
psql -U postgres -c "DROP DATABASE textilestock;"
psql -U postgres -c "CREATE DATABASE textilestock;"

# 3. Restore from backup
psql -U postgres -d textilestock -f backups\backup-YYYYMMDD-HHMMSS.sql

# 4. Verify restoration
psql -U postgres -d textilestock -c "SELECT COUNT(*) FROM \"Product\" WHERE \"hasVariants\" = false;"
# Expected: Original product count (pre-migration state)

# 5. Run Prisma migrations to ensure schema is current
npx prisma migrate deploy
```

---

## 🛡️ Safety Mechanisms

The migration script includes multiple safety checks:

1. **Idempotent**: Can be run multiple times safely (skips already-migrated products)
2. **Atomic per product**: Each product migration is a separate transaction
3. **Verification**: Automatic post-migration verification
4. **Dry-run mode**: `verify` command shows what will happen without changing data
5. **Backup requirement**: Fails if DATABASE_URL not set (forces production awareness)

---

## 📊 Expected Impact

### **Database Changes**:
- `Product.hasVariants`: `false → true` (all products)
- New records in `ColorMaster`: ~10-50 (unique colors)
- New records in `ProductVariant`: 1 per product (1:1 initially)
- New records in `ProductColor`: 1 per product (1:1 initially)
- New records in `StockVariant`: Same count as `Stock` records

### **Performance Impact**:
- **During migration**: DB writes for ~5-15 minutes (depending on product count)
- **After migration**: Slightly slower queries (more joins) until indexes are added
- **Long-term**: Better scalability for products with multiple variants/colors

### **User Impact**:
- **Zero downtime** if executed during off-peak hours
- **No data loss** (verified by stock totals check)
- **Backward compatible**: Old `Stock` table remains intact (can be archived later)

---

## 🧪 Test Migration (Optional: Run on Staging First)

If you have a staging environment:

```powershell
# 1. Copy production DATABASE_URL to staging
# 2. Run migration on staging
DATABASE_URL="postgresql://staging..." npx tsx scripts/migrate-to-variants.ts

# 3. Test thoroughly on staging
# 4. If successful, run on production with confidence
```

---

## 📞 Troubleshooting

### **Error: "Migration failed: P2002 Unique constraint failed"**
**Cause**: Duplicate SKU generated  
**Fix**: Check `generateSKU()` logic in script. May need to add random suffix for duplicates.

### **Error: "Stock quantities don't match"**
**Cause**: Stock records not fully migrated  
**Fix**: Check console for failed product migrations. Re-run for those products individually.

### **Error: "DATABASE_URL not set"**
**Cause**: Missing `.env` file or DATABASE_URL variable  
**Fix**: Set `DATABASE_URL` in `.env` file with production credentials.

### **Products Already Migrated**
**Symptom**: Script says "already migrated" for all products  
**Fix**: This is OK if migration was run before. Use `verify` to check current state.

---

## ✅ Post-Migration Tasks

After successful migration:

1. **Run Performance Indexes**:
   ```sql
   -- Execute the SQL file
   psql -U postgres -d textilestock -f prisma/migrations/add_performance_indexes.sql
   ```

2. **Update Search UI** (if needed):
   - Product search should now return SKU in format `CAT-PROD-VARIANT-COLOR`
   - Update frontend to display variant/color separately

3. **Archive Old Stock Table** (optional, after verification period):
   ```sql
   -- After 30 days of stable operation
   -- RENAME "Stock" TO "Stock_ARCHIVED_2026";
   ```

4. **Monitor Query Performance**:
   - Check `/api/products/search` response time
   - Verify dashboard load time < 800ms
   - Monitor Redis cache hit rates

---

## 📈 Success Criteria

Migration is considered successful if:

- ✅ All products have `hasVariants = true`
- ✅ All SKUs are unique
- ✅ Stock totals match (old = new)
- ✅ Zero orphaned records
- ✅ Product search works correctly
- ✅ Sales flow completes without errors
- ✅ Dashboard loads correctly

---

## 🚦 Current Status

**Last Updated**: 2026-06-25  
**Backup Status**: ⏳ Pending (run `npm run backup:create`)  
**Migration Status**: 🟡 READY TO EXECUTE  
**Verification**: ⏳ Not run yet  

**Next Action**: Run `npx tsx scripts/migrate-to-variants.ts verify` to see current state.

---

**Questions?** Review the migration script (`scripts/migrate-to-variants.ts`) or consult the V3_EVOLUTION_PLAN.md for context.

**Ready?** Let's migrate! 🚀
