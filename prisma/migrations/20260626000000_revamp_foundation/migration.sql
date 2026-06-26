-- =============================================================================
-- MADEENA TEX — REVAMP FOUNDATION MIGRATION
-- Data-safe: preserves all existing rows, adds new structure, handles
-- existing enums from prior migrations gracefully.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- STEP 1: CREATE NEW ENUM TYPES (safely — skip if already exists)
-- NOTE: OrderStatus, ReturnStatus, ReturnReason already exist from prior
--       migration with different values — we RENAME them then recreate.
-- -----------------------------------------------------------------------------

DO $$ BEGIN CREATE TYPE "UserRole" AS ENUM ('ADMIN','MANAGER','STORE_KEEPER','SHOP_STAFF','FINANCE','CUSTOMER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "LocationType" AS ENUM ('WAREHOUSE','SHOP');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "TransferStatus" AS ENUM ('PENDING','APPROVED','DISPATCHED','RECEIVED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "PaymentMode" AS ENUM ('CASH','CARD','BANK_TRANSFER','CHEQUE','CREDIT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ChequeStatus" AS ENUM ('PENDING','CLEARED','BOUNCED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "AdjustmentReason" AS ENUM ('STOCKTAKE','DAMAGE','THEFT','WRITE_OFF','CORRECTION','EXPIRY','OTHER');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT','SENT','PARTIAL','RECEIVED','CANCELLED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "ShiftStatus" AS ENUM ('OPEN','CLOSED');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN CREATE TYPE "OrderSource" AS ENUM ('STOREFRONT','WHATSAPP','PHONE','WALK_IN');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- OrderStatus: already exists with old values — add missing values, keep old ones
DO $$ BEGIN ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'READY'; EXCEPTION WHEN others THEN NULL; END $$;

-- ReturnStatus: already exists — add missing canonical values
DO $$ BEGIN ALTER TYPE "ReturnStatus" ADD VALUE IF NOT EXISTS 'COMPLETED'; EXCEPTION WHEN others THEN NULL; END $$;

-- ReturnReason: already exists — add any missing values (SIZE_ISSUE, COLOR_MISMATCH were in old enum)
-- No action needed — our new code uses a subset of what's already there

-- -----------------------------------------------------------------------------
-- STEP 2: DROP LEGACY TABLES (tables no longer in the new schema)
-- Order matters — drop dependent tables first to avoid FK violations
-- -----------------------------------------------------------------------------

DROP TABLE IF EXISTS "StockVariant"    CASCADE;
DROP TABLE IF EXISTS "ProductColor"    CASCADE;
DROP TABLE IF EXISTS "ColorMaster"     CASCADE;
DROP TABLE IF EXISTS "StockOutRequest" CASCADE;
DROP TABLE IF EXISTS "EntityHistory"   CASCADE;
DROP TABLE IF EXISTS "FinanceReview"   CASCADE;
DROP TABLE IF EXISTS "PriceRule"       CASCADE;
DROP TABLE IF EXISTS "Tenant"          CASCADE;

-- -----------------------------------------------------------------------------
-- STEP 3: MIGRATE Location.type — STRING → ENUM
-- -----------------------------------------------------------------------------

ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "type_new" "LocationType";
UPDATE "Location" SET "type_new" = CASE
  WHEN "type" = 'WAREHOUSE' THEN 'WAREHOUSE'::"LocationType"
  ELSE 'SHOP'::"LocationType"
END WHERE "type_new" IS NULL;
ALTER TABLE "Location" DROP COLUMN "type";
ALTER TABLE "Location" RENAME COLUMN "type_new" TO "type";
ALTER TABLE "Location" ALTER COLUMN "type" SET NOT NULL;
ALTER TABLE "Location" ADD COLUMN IF NOT EXISTS "phone" TEXT;

-- -----------------------------------------------------------------------------
-- STEP 4: MIGRATE User.role — STRING → ENUM (SUPER_ADMIN collapses to ADMIN)
-- -----------------------------------------------------------------------------

ALTER TABLE "User" DROP COLUMN IF EXISTS "tenantId";
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "role_new" "UserRole";
UPDATE "User" SET "role_new" = CASE
  WHEN "role" IN ('SUPER_ADMIN','ADMIN') THEN 'ADMIN'::"UserRole"
  WHEN "role" = 'MANAGER'               THEN 'MANAGER'::"UserRole"
  WHEN "role" = 'STORE_KEEPER'          THEN 'STORE_KEEPER'::"UserRole"
  WHEN "role" = 'SHOP_STAFF'            THEN 'SHOP_STAFF'::"UserRole"
  WHEN "role" = 'FINANCE'               THEN 'FINANCE'::"UserRole"
  WHEN "role" = 'CUSTOMER'              THEN 'CUSTOMER'::"UserRole"
  ELSE 'STORE_KEEPER'::"UserRole"
END WHERE "role_new" IS NULL;
ALTER TABLE "User" DROP COLUMN "role";
ALTER TABLE "User" RENAME COLUMN "role_new" TO "role";
ALTER TABLE "User" ALTER COLUMN "role" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'STORE_KEEPER'::"UserRole";

-- -----------------------------------------------------------------------------
-- STEP 5: MIGRATE Sale.paymentMode — STRING → ENUM
-- -----------------------------------------------------------------------------

ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "paymentMode_new" "PaymentMode";
UPDATE "Sale" SET "paymentMode_new" = CASE
  WHEN "paymentMode" = 'CARD'          THEN 'CARD'::"PaymentMode"
  WHEN "paymentMode" = 'BANK_TRANSFER' THEN 'BANK_TRANSFER'::"PaymentMode"
  WHEN "paymentMode" = 'CHEQUE'        THEN 'CHEQUE'::"PaymentMode"
  WHEN "paymentMode" = 'CREDIT'        THEN 'CREDIT'::"PaymentMode"
  ELSE 'CASH'::"PaymentMode"
END WHERE "paymentMode_new" IS NULL;
ALTER TABLE "Sale" DROP COLUMN "paymentMode";
ALTER TABLE "Sale" RENAME COLUMN "paymentMode_new" TO "paymentMode";
ALTER TABLE "Sale" ALTER COLUMN "paymentMode" SET NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "paymentMode" SET DEFAULT 'CASH'::"PaymentMode";

-- Sale — remove totalAmount, add new fields
ALTER TABLE "Sale" DROP COLUMN IF EXISTS "totalAmount";
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "shiftId"         TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "discountAmount"  FLOAT NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "waInvoiceSent"   BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "waInvoiceSentAt" TIMESTAMP;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "waInvoiceError"  TEXT;

-- -----------------------------------------------------------------------------
-- STEP 6: CLEAN UP Product table (remove textile-specific fields)
-- -----------------------------------------------------------------------------

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wcProductId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "wcSyncedAt"  TIMESTAMP;
ALTER TABLE "Product" DROP COLUMN IF EXISTS "design";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "color";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "colorHex";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "unit";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "alternateUnit";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "conversionFactor";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "barcodeType";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "hasVariants";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "costPrice";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "lowStockAt";
ALTER TABLE "Product" DROP COLUMN IF EXISTS "sku";

-- images: was TEXT (JSON string) — convert to TEXT[]
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "images_arr" TEXT[] DEFAULT ARRAY[]::TEXT[];
UPDATE "Product" SET "images_arr" = ARRAY[]::TEXT[] WHERE "images_arr" IS NULL;
ALTER TABLE "Product" DROP COLUMN IF EXISTS "images";
ALTER TABLE "Product" RENAME COLUMN "images_arr" TO "images";

-- -----------------------------------------------------------------------------
-- STEP 7: REBUILD ProductVariant — add all unit matrix columns
-- -----------------------------------------------------------------------------

ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "sku"                  TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "colorName"             TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "colorHex"              TEXT DEFAULT '#6366f1';
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "stockUnit"             TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "stockUnitLabel"        TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "altUnit"               TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "altUnitLabel"          TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "saleUnit"              TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "saleUnitLabel"         TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "saleToStockFactor"     FLOAT DEFAULT 1.0;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "altSaleUnit"           TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "altSaleUnitLabel"      TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "altSaleToStockFactor"  FLOAT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "salePrice"             FLOAT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "lowStockAt"            FLOAT DEFAULT 10.0;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "wcVariantId"           TEXT;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "wcSyncedAt"            TIMESTAMP;
ALTER TABLE "ProductVariant" ADD COLUMN IF NOT EXISTS "updatedAt"             TIMESTAMP DEFAULT NOW();

-- Populate new columns from old code/design/costPrice fields
-- SKU is always made globally unique: code + '-' + first 8 chars of variant id
UPDATE "ProductVariant" SET
  "sku"            = "code" || '-' || SUBSTRING("id", 1, 8),
  "colorName"      = COALESCE("design", "code", 'Default'),
  "colorHex"       = '#6366f1',
  "stockUnit"      = 'metres',
  "stockUnitLabel" = 'Metres',
  "saleUnit"       = 'metres',
  "saleUnitLabel"  = 'Metres',
  "saleToStockFactor" = 1.0,
  "salePrice"      = "costPrice",
  "lowStockAt"     = 10.0,
  "updatedAt"      = NOW()
WHERE "sku" IS NULL;

-- Set NOT NULL
ALTER TABLE "ProductVariant" ALTER COLUMN "sku"            SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "colorName"      SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "stockUnit"      SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "stockUnitLabel" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "saleUnit"       SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "saleUnitLabel"  SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "saleToStockFactor" SET NOT NULL;
ALTER TABLE "ProductVariant" ALTER COLUMN "updatedAt"      SET NOT NULL;

-- Add new unique constraints (drop old ones first)
DROP INDEX IF EXISTS "ProductVariant_productId_code_key";
ALTER TABLE "ProductVariant" DROP CONSTRAINT IF EXISTS "ProductVariant_productId_code_key";
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_sku_key"
  UNIQUE ("sku");
ALTER TABLE "ProductVariant" ADD CONSTRAINT "ProductVariant_productId_colorName_key"
  UNIQUE ("productId", "colorName");

-- Remove old columns no longer in schema
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "code";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "design";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "description";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "images";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "unit";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "alternateUnit";
ALTER TABLE "ProductVariant" DROP COLUMN IF EXISTS "conversionFactor";

-- Create default variants for Products that have NO variants at all
INSERT INTO "ProductVariant" (
  "id","productId","sku","colorName","colorHex",
  "stockUnit","stockUnitLabel","saleUnit","saleUnitLabel",
  "saleToStockFactor","costPrice","lowStockAt","isActive","createdAt","updatedAt"
)
SELECT
  'dflt-' || SUBSTRING(p."id",1,20),
  p."id",
  'DFT-' || SUBSTRING(p."id",1,8),
  'Default',
  '#6366f1',
  'metres','Metres','metres','Metres',1.0,
  NULL,10.0,TRUE,NOW(),NOW()
FROM "Product" p
WHERE NOT EXISTS (
  SELECT 1 FROM "ProductVariant" pv WHERE pv."productId" = p."id"
)
ON CONFLICT DO NOTHING;

-- -----------------------------------------------------------------------------
-- STEP 8: MIGRATE Stock — productId → variantId
-- -----------------------------------------------------------------------------

ALTER TABLE "Stock" ADD COLUMN IF NOT EXISTS "variantId" TEXT;

-- Map each Stock row to the first variant of its product
UPDATE "Stock" s SET "variantId" = (
  SELECT pv."id" FROM "ProductVariant" pv
  WHERE pv."productId" = s."productId"
  ORDER BY pv."createdAt" ASC LIMIT 1
) WHERE "variantId" IS NULL;

-- Delete any orphaned rows that couldn't be mapped
DELETE FROM "Stock" WHERE "variantId" IS NULL;

ALTER TABLE "Stock" ALTER COLUMN "variantId" SET NOT NULL;

-- Swap unique constraint
ALTER TABLE "Stock" DROP CONSTRAINT IF EXISTS "Stock_productId_locationId_key";
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_variantId_locationId_key"
  UNIQUE ("variantId", "locationId");

-- Add FK from Stock.variantId → ProductVariant.id
ALTER TABLE "Stock" ADD CONSTRAINT "Stock_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Remove old column (after FK on productId is dropped)
ALTER TABLE "Stock" DROP CONSTRAINT IF EXISTS "Stock_productId_fkey";
ALTER TABLE "Stock" DROP COLUMN IF EXISTS "productId";

-- -----------------------------------------------------------------------------
-- STEP 9: MIGRATE StockIn — productId → variantId + unit fields
-- -----------------------------------------------------------------------------

ALTER TABLE "StockIn" ADD COLUMN IF NOT EXISTS "variantId"            TEXT;
ALTER TABLE "StockIn" ADD COLUMN IF NOT EXISTS "receivedUnit"         TEXT;
ALTER TABLE "StockIn" ADD COLUMN IF NOT EXISTS "receivedQty"          FLOAT;
ALTER TABLE "StockIn" ADD COLUMN IF NOT EXISTS "conversionFactor"     FLOAT DEFAULT 1.0;
ALTER TABLE "StockIn" ADD COLUMN IF NOT EXISTS "quantityAddedToStock" FLOAT;
ALTER TABLE "StockIn" ADD COLUMN IF NOT EXISTS "invoiceNo"            TEXT;
ALTER TABLE "StockIn" ADD COLUMN IF NOT EXISTS "purchaseOrderId"      TEXT;

UPDATE "StockIn" si SET
  "variantId"            = (SELECT pv."id" FROM "ProductVariant" pv WHERE pv."productId" = si."productId" ORDER BY pv."createdAt" ASC LIMIT 1),
  "receivedUnit"         = 'metres',
  "receivedQty"          = si."quantity",
  "conversionFactor"     = 1.0,
  "quantityAddedToStock" = si."quantity"
WHERE "variantId" IS NULL;

DELETE FROM "StockIn" WHERE "variantId" IS NULL;

ALTER TABLE "StockIn" ALTER COLUMN "variantId"            SET NOT NULL;
ALTER TABLE "StockIn" ALTER COLUMN "receivedUnit"         SET NOT NULL;
ALTER TABLE "StockIn" ALTER COLUMN "receivedQty"          SET NOT NULL;
ALTER TABLE "StockIn" ALTER COLUMN "conversionFactor"     SET NOT NULL;
ALTER TABLE "StockIn" ALTER COLUMN "quantityAddedToStock" SET NOT NULL;

ALTER TABLE "StockIn" DROP CONSTRAINT IF EXISTS "StockIn_productId_fkey";
ALTER TABLE "StockIn" ADD CONSTRAINT "StockIn_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StockIn" DROP COLUMN IF EXISTS "productId";

-- -----------------------------------------------------------------------------
-- STEP 10: MIGRATE StockAdjustment — productId → variantId + reason enum
-- -----------------------------------------------------------------------------

ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "variantId"   TEXT;
ALTER TABLE "StockAdjustment" ADD COLUMN IF NOT EXISTS "reason_new"  "AdjustmentReason";

UPDATE "StockAdjustment" sa SET
  "variantId"  = (SELECT pv."id" FROM "ProductVariant" pv WHERE pv."productId" = sa."productId" ORDER BY pv."createdAt" ASC LIMIT 1),
  "reason_new" = 'CORRECTION'::"AdjustmentReason"
WHERE "variantId" IS NULL;

DELETE FROM "StockAdjustment" WHERE "variantId" IS NULL;

ALTER TABLE "StockAdjustment" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "StockAdjustment" ALTER COLUMN "reason_new" SET NOT NULL;

ALTER TABLE "StockAdjustment" DROP CONSTRAINT IF EXISTS "StockAdjustment_productId_fkey";
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockAdjustment" DROP COLUMN IF EXISTS "reason";
ALTER TABLE "StockAdjustment" RENAME COLUMN "reason_new" TO "reason";
ALTER TABLE "StockAdjustment" DROP COLUMN IF EXISTS "productId";

-- -----------------------------------------------------------------------------
-- STEP 11: MIGRATE SaleItem — productId → variantId + unit fields
-- -----------------------------------------------------------------------------

ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "variantId"          TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "saleUnit"           TEXT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "saleQty"            FLOAT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "saleToStockFactor"  FLOAT DEFAULT 1.0;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "stockQtyDeducted"   FLOAT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "discountType"       TEXT NOT NULL DEFAULT 'NONE';
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "discountValue"      FLOAT NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "discountAmount"     FLOAT NOT NULL DEFAULT 0;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "costAtSale"         FLOAT;
ALTER TABLE "SaleItem" ADD COLUMN IF NOT EXISTS "profitAmount"       FLOAT;

UPDATE "SaleItem" si SET
  "variantId"         = (SELECT pv."id" FROM "ProductVariant" pv WHERE pv."productId" = si."productId" ORDER BY pv."createdAt" ASC LIMIT 1),
  "saleUnit"          = 'metres',
  "saleQty"           = si."quantity",
  "saleToStockFactor" = 1.0,
  "stockQtyDeducted"  = si."quantity"
WHERE "variantId" IS NULL;

DELETE FROM "SaleItem" WHERE "variantId" IS NULL;

ALTER TABLE "SaleItem" ALTER COLUMN "variantId"         SET NOT NULL;
ALTER TABLE "SaleItem" ALTER COLUMN "saleUnit"          SET NOT NULL;
ALTER TABLE "SaleItem" ALTER COLUMN "saleQty"           SET NOT NULL;
ALTER TABLE "SaleItem" ALTER COLUMN "saleToStockFactor" SET NOT NULL;
ALTER TABLE "SaleItem" ALTER COLUMN "stockQtyDeducted"  SET NOT NULL;

ALTER TABLE "SaleItem" DROP CONSTRAINT IF EXISTS "SaleItem_productId_fkey";
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SaleItem" DROP COLUMN IF EXISTS "productId";

-- -----------------------------------------------------------------------------
-- STEP 12: MIGRATE CartItem — productId → variantId
-- -----------------------------------------------------------------------------

ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "saleUnit"  TEXT DEFAULT 'metres';

UPDATE "CartItem" ci SET
  "variantId" = (SELECT pv."id" FROM "ProductVariant" pv WHERE pv."productId" = ci."productId" ORDER BY pv."createdAt" ASC LIMIT 1),
  "saleUnit"  = 'metres'
WHERE "variantId" IS NULL;

DELETE FROM "CartItem" WHERE "variantId" IS NULL;

ALTER TABLE "CartItem" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "CartItem" ALTER COLUMN "saleUnit"  SET NOT NULL;

ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_productId_fkey";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CartItem" DROP CONSTRAINT IF EXISTS "CartItem_cartId_productId_key";
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_variantId_key" UNIQUE ("cartId", "variantId");
ALTER TABLE "CartItem" DROP COLUMN IF EXISTS "productId";

-- -----------------------------------------------------------------------------
-- STEP 13: MIGRATE OrderItem — productId → variantId
-- -----------------------------------------------------------------------------

ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "variantId" TEXT;
ALTER TABLE "OrderItem" ADD COLUMN IF NOT EXISTS "saleUnit"  TEXT DEFAULT 'metres';

UPDATE "OrderItem" oi SET
  "variantId" = (SELECT pv."id" FROM "ProductVariant" pv WHERE pv."productId" = oi."productId" ORDER BY pv."createdAt" ASC LIMIT 1),
  "saleUnit"  = 'metres'
WHERE "variantId" IS NULL;

DELETE FROM "OrderItem" WHERE "variantId" IS NULL;

ALTER TABLE "OrderItem" ALTER COLUMN "variantId" SET NOT NULL;
ALTER TABLE "OrderItem" ALTER COLUMN "saleUnit"  SET NOT NULL;

ALTER TABLE "OrderItem" DROP CONSTRAINT IF EXISTS "OrderItem_productId_fkey";
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_variantId_fkey"
  FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" DROP COLUMN IF EXISTS "productId";

-- -----------------------------------------------------------------------------
-- STEP 14: UPDATE CustomerOrder
-- -----------------------------------------------------------------------------

ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "source"        "OrderSource" NOT NULL DEFAULT 'STOREFRONT';
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "waMessageId"   TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "waThreadId"    TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "customerPhone" TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "orderedBy"     TEXT;
ALTER TABLE "CustomerOrder" ADD COLUMN IF NOT EXISTS "taxRate"       FLOAT NOT NULL DEFAULT 0;
ALTER TABLE "CustomerOrder" DROP COLUMN IF EXISTS "billingAddress";
ALTER TABLE "CustomerOrder" DROP COLUMN IF EXISTS "saleId";

-- -----------------------------------------------------------------------------
-- STEP 15: UPDATE Customer + AuditLog + Return
-- -----------------------------------------------------------------------------

ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "whatsappPhone" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "notes"         TEXT;

ALTER TABLE "AuditLog" ADD COLUMN IF NOT EXISTS "saleId" TEXT;

ALTER TABLE "Return"     ADD COLUMN IF NOT EXISTS "refundMethod" TEXT;
ALTER TABLE "ReturnItem" DROP COLUMN IF EXISTS "reason";
ALTER TABLE "ReturnItem" ADD COLUMN IF NOT EXISTS "reason" "ReturnReason" NOT NULL DEFAULT 'OTHER';

-- -----------------------------------------------------------------------------
-- STEP 16: CREATE NEW TABLES
-- -----------------------------------------------------------------------------

-- Shift (POS Cash Register)
CREATE TABLE IF NOT EXISTS "Shift" (
  "id"          TEXT         NOT NULL,
  "locationId"  TEXT         NOT NULL,
  "openedBy"    TEXT         NOT NULL,
  "status"      "ShiftStatus" NOT NULL DEFAULT 'OPEN',
  "openingCash" FLOAT        NOT NULL DEFAULT 0,
  "closingCash" FLOAT,
  "cashSales"   FLOAT,
  "cardSales"   FLOAT,
  "chequeSales" FLOAT,
  "creditSales" FLOAT,
  "bankSales"   FLOAT,
  "note"        TEXT,
  "openedAt"    TIMESTAMP    NOT NULL DEFAULT NOW(),
  "closedAt"    TIMESTAMP,
  CONSTRAINT "Shift_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "Shift_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id"),
  CONSTRAINT "Shift_openedBy_fkey"   FOREIGN KEY ("openedBy")   REFERENCES "User"("id")
);

-- Stock Transfer (multi-item)
CREATE TABLE IF NOT EXISTS "StockTransfer" (
  "id"             TEXT             NOT NULL,
  "transferNo"     TEXT             NOT NULL,
  "fromLocationId" TEXT             NOT NULL,
  "toLocationId"   TEXT             NOT NULL,
  "status"         "TransferStatus" NOT NULL DEFAULT 'PENDING',
  "note"           TEXT,
  "requestedBy"    TEXT             NOT NULL,
  "approvedBy"     TEXT,
  "approvedAt"     TIMESTAMP,
  "dispatchedBy"   TEXT,
  "dispatchedAt"   TIMESTAMP,
  "receivedBy"     TEXT,
  "receivedAt"     TIMESTAMP,
  "createdAt"      TIMESTAMP        NOT NULL DEFAULT NOW(),
  "updatedAt"      TIMESTAMP        NOT NULL DEFAULT NOW(),
  CONSTRAINT "StockTransfer_pkey"           PRIMARY KEY ("id"),
  CONSTRAINT "StockTransfer_transferNo_key" UNIQUE ("transferNo"),
  CONSTRAINT "StockTransfer_from_fkey"      FOREIGN KEY ("fromLocationId") REFERENCES "Location"("id"),
  CONSTRAINT "StockTransfer_to_fkey"        FOREIGN KEY ("toLocationId")   REFERENCES "Location"("id"),
  CONSTRAINT "StockTransfer_req_fkey"       FOREIGN KEY ("requestedBy")    REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "StockTransferItem" (
  "id"              TEXT  NOT NULL,
  "transferId"      TEXT  NOT NULL,
  "variantId"       TEXT  NOT NULL,
  "requestedQty"    FLOAT NOT NULL,
  "approvedQty"     FLOAT,
  "dispatchedQty"   FLOAT,
  "receivedQty"     FLOAT,
  "discrepancyNote" TEXT,
  CONSTRAINT "StockTransferItem_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "StockTransferItem_tid_fkey"  FOREIGN KEY ("transferId") REFERENCES "StockTransfer"("id") ON DELETE CASCADE,
  CONSTRAINT "StockTransferItem_vid_fkey"  FOREIGN KEY ("variantId")  REFERENCES "ProductVariant"("id")
);

-- Purchase Order
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  "id"         TEXT                  NOT NULL,
  "poNumber"   TEXT                  NOT NULL,
  "supplierId" TEXT                  NOT NULL,
  "locationId" TEXT                  NOT NULL,
  "status"     "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "note"       TEXT,
  "orderedBy"  TEXT                  NOT NULL,
  "orderedAt"  TIMESTAMP             NOT NULL DEFAULT NOW(),
  "expectedAt" TIMESTAMP,
  "receivedAt" TIMESTAMP,
  "createdAt"  TIMESTAMP             NOT NULL DEFAULT NOW(),
  "updatedAt"  TIMESTAMP             NOT NULL DEFAULT NOW(),
  CONSTRAINT "PurchaseOrder_pkey"      PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrder_po_key"    UNIQUE ("poNumber"),
  CONSTRAINT "PurchaseOrder_sup_fkey"  FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id"),
  CONSTRAINT "PurchaseOrder_loc_fkey"  FOREIGN KEY ("locationId") REFERENCES "Location"("id"),
  CONSTRAINT "PurchaseOrder_usr_fkey"  FOREIGN KEY ("orderedBy")  REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  "id"          TEXT  NOT NULL,
  "poId"        TEXT  NOT NULL,
  "variantId"   TEXT  NOT NULL,
  "orderedUnit" TEXT  NOT NULL,
  "orderedQty"  FLOAT NOT NULL,
  "receivedQty" FLOAT NOT NULL DEFAULT 0,
  "unitCost"    FLOAT,
  "note"        TEXT,
  CONSTRAINT "PurchaseOrderItem_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "PurchaseOrderItem_po_fkey"  FOREIGN KEY ("poId")      REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE,
  CONSTRAINT "PurchaseOrderItem_var_fkey" FOREIGN KEY ("variantId") REFERENCES "ProductVariant"("id")
);

-- Cheque Payment
CREATE TABLE IF NOT EXISTS "ChequePayment" (
  "id"                  TEXT          NOT NULL,
  "saleId"              TEXT          NOT NULL,
  "bankName"            TEXT          NOT NULL,
  "chequeNo"            TEXT          NOT NULL,
  "chequeDate"          TIMESTAMP     NOT NULL,
  "amount"              FLOAT         NOT NULL,
  "status"              "ChequeStatus" NOT NULL DEFAULT 'PENDING',
  "expectedClearDate"   TIMESTAMP     NOT NULL,
  "clearedAt"           TIMESTAMP,
  "bouncedAt"           TIMESTAMP,
  "bounceReason"        TEXT,
  "reminder7DaySentAt"  TIMESTAMP,
  "reminder14DaySentAt" TIMESTAMP,
  "note"                TEXT,
  "createdAt"           TIMESTAMP     NOT NULL DEFAULT NOW(),
  "updatedAt"           TIMESTAMP     NOT NULL DEFAULT NOW(),
  CONSTRAINT "ChequePayment_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "ChequePayment_sale_key"   UNIQUE ("saleId"),
  CONSTRAINT "ChequePayment_sale_fkey"  FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
);

-- Credit Ledger
CREATE TABLE IF NOT EXISTS "CreditLedger" (
  "id"           TEXT      NOT NULL,
  "customerId"   TEXT      NOT NULL,
  "totalOwed"    FLOAT     NOT NULL DEFAULT 0,
  "lastActivity" TIMESTAMP NOT NULL DEFAULT NOW(),
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "CreditLedger_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "CreditLedger_cust_key" UNIQUE ("customerId"),
  CONSTRAINT "CreditLedger_cust_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
);

CREATE TABLE IF NOT EXISTS "CreditEntry" (
  "id"                  TEXT      NOT NULL,
  "ledgerId"            TEXT      NOT NULL,
  "saleId"              TEXT,
  "type"                TEXT      NOT NULL,
  "amount"              FLOAT     NOT NULL,
  "note"                TEXT,
  "reminder7DaySentAt"  TIMESTAMP,
  "reminder30DaySentAt" TIMESTAMP,
  "createdAt"           TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "CreditEntry_pkey"       PRIMARY KEY ("id"),
  CONSTRAINT "CreditEntry_sale_key"   UNIQUE ("saleId"),
  CONSTRAINT "CreditEntry_led_fkey"   FOREIGN KEY ("ledgerId") REFERENCES "CreditLedger"("id"),
  CONSTRAINT "CreditEntry_sale_fkey"  FOREIGN KEY ("saleId")   REFERENCES "Sale"("id")
);

CREATE TABLE IF NOT EXISTS "CreditPayment" (
  "id"          TEXT          NOT NULL,
  "ledgerId"    TEXT          NOT NULL,
  "customerId"  TEXT          NOT NULL,
  "amount"      FLOAT         NOT NULL,
  "paymentMode" "PaymentMode" NOT NULL,
  "reference"   TEXT,
  "recordedBy"  TEXT          NOT NULL,
  "note"        TEXT,
  "createdAt"   TIMESTAMP     NOT NULL DEFAULT NOW(),
  CONSTRAINT "CreditPayment_pkey"     PRIMARY KEY ("id"),
  CONSTRAINT "CreditPayment_usr_fkey" FOREIGN KEY ("recordedBy") REFERENCES "User"("id")
);

-- WhatsApp Catalogue Sync Log
CREATE TABLE IF NOT EXISTS "WACatalogueSyncLog" (
  "id"          TEXT      NOT NULL,
  "syncType"    TEXT      NOT NULL,
  "status"      TEXT      NOT NULL,
  "syncedCount" INT       NOT NULL DEFAULT 0,
  "errorCount"  INT       NOT NULL DEFAULT 0,
  "errors"      TEXT,
  "createdAt"   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "WACatalogueSyncLog_pkey" PRIMARY KEY ("id")
);

-- Backup Log
CREATE TABLE IF NOT EXISTS "BackupLog" (
  "id"           TEXT      NOT NULL,
  "triggeredBy"  TEXT      NOT NULL,
  "status"       TEXT      NOT NULL,
  "sizeBytes"    INT,
  "gzSizeBytes"  INT,
  "totalRows"    INT,
  "downloadUrl"  TEXT,
  "errorMessage" TEXT,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "BackupLog_pkey" PRIMARY KEY ("id")
);

-- -----------------------------------------------------------------------------
-- STEP 17: CREATE INDEXES
-- -----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "Product_name_idx"                    ON "Product"("name");
CREATE INDEX IF NOT EXISTS "Product_categoryId_idx"              ON "Product"("categoryId");
CREATE INDEX IF NOT EXISTS "ProductVariant_sku_idx"              ON "ProductVariant"("sku");
CREATE INDEX IF NOT EXISTS "ProductVariant_colorName_idx"        ON "ProductVariant"("colorName");
CREATE INDEX IF NOT EXISTS "Stock_variantId_idx"                 ON "Stock"("variantId");
CREATE INDEX IF NOT EXISTS "Stock_locationId_idx"                ON "Stock"("locationId");
CREATE INDEX IF NOT EXISTS "StockIn_variantId_idx"               ON "StockIn"("variantId");
CREATE INDEX IF NOT EXISTS "StockIn_locationId_idx"              ON "StockIn"("locationId");
CREATE INDEX IF NOT EXISTS "StockIn_createdAt_idx"               ON "StockIn"("createdAt");
CREATE INDEX IF NOT EXISTS "Sale_locationId_createdAt_idx"       ON "Sale"("locationId","createdAt");
CREATE INDEX IF NOT EXISTS "Sale_customerId_idx"                 ON "Sale"("customerId");
CREATE INDEX IF NOT EXISTS "StockTransfer_status_idx"            ON "StockTransfer"("status");
CREATE INDEX IF NOT EXISTS "StockTransfer_from_idx"              ON "StockTransfer"("fromLocationId");
CREATE INDEX IF NOT EXISTS "StockTransfer_to_idx"                ON "StockTransfer"("toLocationId");
CREATE INDEX IF NOT EXISTS "StockTransferItem_tid_idx"           ON "StockTransferItem"("transferId");
CREATE INDEX IF NOT EXISTS "StockTransferItem_vid_idx"           ON "StockTransferItem"("variantId");
CREATE INDEX IF NOT EXISTS "ChequePayment_status_idx"            ON "ChequePayment"("status");
CREATE INDEX IF NOT EXISTS "ChequePayment_clearDate_idx"         ON "ChequePayment"("expectedClearDate");
CREATE INDEX IF NOT EXISTS "Shift_loc_status_idx"                ON "Shift"("locationId","status");
CREATE INDEX IF NOT EXISTS "Notification_userId_isRead_idx"      ON "Notification"("userId","isRead");
CREATE INDEX IF NOT EXISTS "AuditLog_entity_idx"                 ON "AuditLog"("entity","entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_user_idx"                   ON "AuditLog"("userId","createdAt");
CREATE INDEX IF NOT EXISTS "Customer_phone_idx"                  ON "Customer"("phone");
CREATE INDEX IF NOT EXISTS "CreditEntry_ledgerId_idx"            ON "CreditEntry"("ledgerId");
CREATE INDEX IF NOT EXISTS "CreditPayment_ledgerId_idx"          ON "CreditPayment"("ledgerId");
CREATE INDEX IF NOT EXISTS "CustomerOrder_status_idx"            ON "CustomerOrder"("status");
CREATE INDEX IF NOT EXISTS "CustomerOrder_source_idx"            ON "CustomerOrder"("source");
CREATE INDEX IF NOT EXISTS "CustomerOrder_customerId_idx"        ON "CustomerOrder"("customerId");
CREATE INDEX IF NOT EXISTS "StockAdjustment_var_loc_idx"         ON "StockAdjustment"("variantId","locationId","createdAt");
