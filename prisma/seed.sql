-- SEED SCRIPT FOR MADEENA TEX
-- Paste this into the Supabase SQL Editor and click RUN

-- 1. Locations
INSERT INTO "Location" ("id", "name", "code", "type", "address", "createdAt", "updatedAt") VALUES
('loc_wh_a', 'Warehouse A (Main)', 'WH-A', 'WAREHOUSE', 'Central Industrial Park, Block 1', NOW(), NOW()),
('loc_wh_b', 'Warehouse B (Secondary)', 'WH-B', 'WAREHOUSE', 'Industrial Zone, Block 2', NOW(), NOW()),
('loc_sh_a', 'Shop A (Downtown)', 'SH-A', 'SHOP', 'Downtown Main Street, 123', NOW(), NOW()),
('loc_sh_b', 'Shop B (Uptown)', 'SH-B', 'SHOP', 'Uptown Market, 456', NOW(), NOW())
ON CONFLICT ("code") DO NOTHING;

-- 2. Users
-- Note: '123456' hashed with bcrypt (salt 10)
-- 'password123' hashed with bcrypt (salt 10)
INSERT INTO "User" ("id", "name", "email", "password", "role", "locationId", "isActive", "createdAt", "updatedAt") VALUES
('usr_super1', 'System Admin', 'admin@madeenas.lk', '$2a$10$1Y.O53d10kO1Bq1sVz/uMe55u.2F0x1eL8o0671r0A9wS1x3s5W.G', 'SUPER_ADMIN', NULL, true, NOW(), NOW()),
('usr_super2', 'Madeena Admin', 'madeenas.lk@gmail.com', '$2a$10$1Y.O53d10kO1Bq1sVz/uMe55u.2F0x1eL8o0671r0A9wS1x3s5W.G', 'SUPER_ADMIN', NULL, true, NOW(), NOW()),
('usr_fin1', 'Finance Dept', 'finance@textilestock.com', '$2a$10$1H40.2M/70q0x03O04w0xOM7Q4X7q72X7R3x4/3x27X44x04X4/3G', 'FINANCE', NULL, true, NOW(), NOW()),
('usr_mgr1', 'WH Manager', 'manager.wh@textilestock.com', '$2a$10$1H40.2M/70q0x03O04w0xOM7Q4X7q72X7R3x4/3x27X44x04X4/3G', 'MANAGER', 'loc_wh_a', true, NOW(), NOW()),
('usr_sk1', 'Store Keeper', 'storekeeper@textilestock.com', '$2a$10$1H40.2M/70q0x03O04w0xOM7Q4X7q72X7R3x4/3x27X44x04X4/3G', 'STORE_KEEPER', 'loc_wh_a', true, NOW(), NOW()),
('usr_shop1', 'Shop A Staff', 'shop.a@textilestock.com', '$2a$10$1H40.2M/70q0x03O04w0xOM7Q4X7q72X7R3x4/3x27X44x04X4/3G', 'SHOP_STAFF', 'loc_sh_a', true, NOW(), NOW())
ON CONFLICT ("email") DO NOTHING;

-- 3. Categories
INSERT INTO "Category" ("id", "name", "slug", "color", "createdAt") VALUES
('cat_1', 'Woven Fabrics', 'woven-fabrics', '#3b82f6', NOW()),
('cat_2', 'Knit Fabrics', 'knit-fabrics', '#10b981', NOW()),
('cat_3', 'Lace & Embroidery', 'lace-embroidery', '#8b5cf6', NOW()),
('cat_4', 'Printed Cottons', 'printed-cottons', '#f59e0b', NOW()),
('cat_5', 'Silk & Satin', 'silk-satin', '#ec4899', NOW()),
('cat_6', 'Denim', 'denim', '#1e40af', NOW()),
('cat_7', 'Synthetic', 'synthetic', '#64748b', NOW())
ON CONFLICT ("slug") DO NOTHING;

-- 4. Suppliers
INSERT INTO "Supplier" ("id", "name", "contact", "email", "phone", "isActive", "createdAt") VALUES
('sup_1', 'Global Textile Co.', 'Ali Hassan', 'ali@gtco.com', '+94 77 123 4567', true, NOW()),
('sup_2', 'Silk Road Imports', 'Sara Ahmed', 'sara@silk.com', '+94 77 234 5678', true, NOW()),
('sup_3', 'Fabric World Ltd.', 'Rauf Nizam', 'rauf@fw.com', '+94 77 345 6789', true, NOW())
ON CONFLICT DO NOTHING;

-- 5. Products
INSERT INTO "Product" ("id", "name", "design", "color", "colorHex", "sku", "categoryId", "description", "images", "unit", "lowStockAt", "costPrice", "createdAt", "updatedAt") VALUES
('prod_1', 'Premium Cotton Voile', 'Solid', 'White', '#FFFFFF', 'WF-001', 'cat_1', 'Premium Cotton Voile - Premium quality', '[]', 'meters', 50, 450, NOW(), NOW()),
('prod_2', 'Cotton Poplin Stripe', 'Stripe', 'Blue', '#3b82f6', 'WF-002', 'cat_1', 'Cotton Poplin Stripe - Premium quality', '[]', 'meters', 50, 380, NOW(), NOW()),
('prod_3', 'Dobby Weave Fabric', 'Dobby', 'Cream', '#FFF8DC', 'WF-003', 'cat_1', 'Dobby Weave Fabric - Premium quality', '[]', 'meters', 30, 620, NOW(), NOW()),
('prod_4', 'Jersey Knit Single', 'Solid', 'Black', '#000000', 'KF-001', 'cat_2', 'Jersey Knit Single - Premium quality', '[]', 'kg', 20, 850, NOW(), NOW()),
('prod_5', 'Interlock Cotton Knit', 'Solid', 'Navy', '#1e3a5f', 'KF-002', 'cat_2', 'Interlock Cotton Knit - Premium quality', '[]', 'kg', 20, 920, NOW(), NOW()),
('prod_6', 'Pure Silk Charmeuse', 'Solid', 'Gold', '#FFD700', 'SS-001', 'cat_5', 'Pure Silk Charmeuse - Premium quality', '[]', 'meters', 15, 2800, NOW(), NOW())
ON CONFLICT ("sku") DO NOTHING;

-- 6. Initial Stock
INSERT INTO "Stock" ("id", "productId", "locationId", "quantity", "createdAt", "updatedAt") VALUES
('stk_1', 'prod_1', 'loc_wh_a', 200, NOW(), NOW()),
('stk_2', 'prod_1', 'loc_wh_b', 150, NOW(), NOW()),
('stk_3', 'prod_1', 'loc_sh_a', 50, NOW(), NOW()),
('stk_4', 'prod_2', 'loc_wh_a', 200, NOW(), NOW()),
('stk_5', 'prod_2', 'loc_wh_b', 150, NOW(), NOW()),
('stk_6', 'prod_2', 'loc_sh_a', 50, NOW(), NOW()),
('stk_7', 'prod_3', 'loc_wh_a', 200, NOW(), NOW()),
('stk_8', 'prod_3', 'loc_wh_b', 150, NOW(), NOW()),
('stk_9', 'prod_3', 'loc_sh_a', 50, NOW(), NOW()),
('stk_10', 'prod_4', 'loc_wh_a', 200, NOW(), NOW()),
('stk_11', 'prod_4', 'loc_wh_b', 150, NOW(), NOW()),
('stk_12', 'prod_4', 'loc_sh_a', 50, NOW(), NOW()),
('stk_13', 'prod_5', 'loc_wh_a', 200, NOW(), NOW()),
('stk_14', 'prod_5', 'loc_wh_b', 150, NOW(), NOW()),
('stk_15', 'prod_5', 'loc_sh_a', 50, NOW(), NOW()),
('stk_16', 'prod_6', 'loc_wh_a', 200, NOW(), NOW()),
('stk_17', 'prod_6', 'loc_wh_b', 150, NOW(), NOW()),
('stk_18', 'prod_6', 'loc_sh_a', 50, NOW(), NOW())
ON CONFLICT ("productId", "locationId") DO NOTHING;
