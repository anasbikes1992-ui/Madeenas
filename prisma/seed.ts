import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding Madeena Tex database...')

  // ─── 1. Locations ─────────────────────────────────────────────────────────
  const warehouseA = await prisma.location.upsert({
    where: { code: 'WH-A' },
    update: { name: 'Warehouse A (Main)', type: 'WAREHOUSE' },
    create: {
      name: 'Warehouse A (Main)',
      code: 'WH-A',
      type: 'WAREHOUSE',
      address: 'Central Industrial Park, Block 1'
    }
  })

  const warehouseB = await prisma.location.upsert({
    where: { code: 'WH-B' },
    update: {},
    create: {
      name: 'Warehouse B (Secondary)',
      code: 'WH-B',
      type: 'WAREHOUSE',
      address: 'Industrial Zone, Block 2'
    }
  })

  const shopA = await prisma.location.upsert({
    where: { code: 'SH-A' },
    update: {},
    create: {
      name: 'Shop A (Downtown)',
      code: 'SH-A',
      type: 'SHOP',
      address: 'Downtown Main Street, 123'
    }
  })

  const shopB = await prisma.location.upsert({
    where: { code: 'SH-B' },
    update: {},
    create: {
      name: 'Shop B (Uptown)',
      code: 'SH-B',
      type: 'SHOP',
      address: 'Uptown Market, 456'
    }
  })

  console.log('✅ Locations created')

  // ─── 2. Users ──────────────────────────────────────────────────────────────
  const pass123456 = await bcrypt.hash('123456', 10)
  const pass123    = await bcrypt.hash('password123', 10)

  // Primary Super Admin — anasbikes1992@gmail.com
  await prisma.user.upsert({
    where: { email: 'anasbikes1992@gmail.com' },
    update: { role: 'SUPER_ADMIN', isActive: true },
    create: {
      name: 'Anas (Super Admin)',
      email: 'anasbikes1992@gmail.com',
      password: pass123456,
      role: 'SUPER_ADMIN'
    }
  })

  // Madeena Owner Admin
  await prisma.user.upsert({
    where: { email: 'madeenas.lk@gmail.com' },
    update: { role: 'SUPER_ADMIN', isActive: true },
    create: {
      name: 'Madeena Admin',
      email: 'madeenas.lk@gmail.com',
      password: pass123456,
      role: 'SUPER_ADMIN'
    }
  })

  // Finance
  await prisma.user.upsert({
    where: { email: 'finance@textilestock.com' },
    update: {},
    create: {
      name: 'Finance Dept',
      email: 'finance@textilestock.com',
      password: pass123,
      role: 'FINANCE'
    }
  })

  // Warehouse Manager
  await prisma.user.upsert({
    where: { email: 'manager.wh@textilestock.com' },
    update: {},
    create: {
      name: 'WH Manager',
      email: 'manager.wh@textilestock.com',
      password: pass123,
      role: 'MANAGER',
      locationId: warehouseA.id
    }
  })

  // Store Keeper
  await prisma.user.upsert({
    where: { email: 'storekeeper@textilestock.com' },
    update: {},
    create: {
      name: 'Store Keeper',
      email: 'storekeeper@textilestock.com',
      password: pass123,
      role: 'STORE_KEEPER',
      locationId: warehouseA.id
    }
  })

  // Shop Staff
  await prisma.user.upsert({
    where: { email: 'shop.a@textilestock.com' },
    update: {},
    create: {
      name: 'Shop A Staff',
      email: 'shop.a@textilestock.com',
      password: pass123,
      role: 'SHOP_STAFF',
      locationId: shopA.id
    }
  })

  console.log('✅ Users created')

  // ─── 3. Categories ─────────────────────────────────────────────────────────
  const cats = [
    // Generic base categories
    { name: 'Woven Fabrics',         slug: 'woven-fabrics',       color: '#3b82f6' },
    { name: 'Knit Fabrics',          slug: 'knit-fabrics',        color: '#10b981' },
    { name: 'Lace & Embroidery',     slug: 'lace-embroidery',     color: '#8b5cf6' },
    { name: 'Printed Cottons',       slug: 'printed-cottons',     color: '#f59e0b' },
    { name: 'Silk & Satin',          slug: 'silk-satin',          color: '#ec4899' },
    { name: 'Denim',                 slug: 'denim',               color: '#1e40af' },
    { name: 'Synthetic',             slug: 'synthetic',           color: '#64748b' },
    // Madeena Tex real product categories
    { name: 'Sarees',                slug: 'sarees',              color: '#ec4899' },
    { name: '3MTR / Nighty Fabrics', slug: 'nighty-3mtr',        color: '#8b5cf6' },
    { name: 'Bedding & Home',        slug: 'bedding',             color: '#0ea5e9' },
    { name: 'Shirtings & Suitings',  slug: 'shirtings-suitings',  color: '#22c55e' },
    { name: 'Laces & Trims',         slug: 'laces-trims',         color: '#f59e0b' },
    { name: 'Bulk / Lots',           slug: 'bulk-lots',           color: '#64748b' },
  ]

  for (const cat of cats) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    })
  }

  console.log('✅ Categories created')

  // ─── 4. Suppliers ──────────────────────────────────────────────────────────
  const suppliers = [
    { name: 'Global Textile Co.',   contact: 'Ali Hassan',  email: 'ali@gtco.com',    phone: '+94 77 123 4567' },
    { name: 'Silk Road Imports',    contact: 'Sara Ahmed',  email: 'sara@silk.com',   phone: '+94 77 234 5678' },
    { name: 'Fabric World Ltd.',    contact: 'Rauf Nizam',  email: 'rauf@fw.com',     phone: '+94 77 345 6789' },
  ]

  for (const sup of suppliers) {
    const existing = await prisma.supplier.findFirst({ where: { name: sup.name } })
    if (!existing) {
      await prisma.supplier.create({ data: sup })
    }
  }

  console.log('✅ Suppliers created')

  // ─── 5. Sample Products ────────────────────────────────────────────────────
  const wovenCat = await prisma.category.findUnique({ where: { slug: 'woven-fabrics' } })
  const knitCat  = await prisma.category.findUnique({ where: { slug: 'knit-fabrics' } })
  const silkCat  = await prisma.category.findUnique({ where: { slug: 'silk-satin' } })

  const sampleProducts = [
    { sku: 'WF-001', name: 'Premium Cotton Voile',      design: 'Solid',   color: 'White',  colorHex: '#FFFFFF', categoryId: wovenCat!.id, unit: 'meters', lowStockAt: 50,  costPrice: 450 },
    { sku: 'WF-002', name: 'Cotton Poplin Stripe',      design: 'Stripe',  color: 'Blue',   colorHex: '#3b82f6', categoryId: wovenCat!.id, unit: 'meters', lowStockAt: 50,  costPrice: 380 },
    { sku: 'WF-003', name: 'Dobby Weave Fabric',        design: 'Dobby',   color: 'Cream',  colorHex: '#FFF8DC', categoryId: wovenCat!.id, unit: 'meters', lowStockAt: 30,  costPrice: 620 },
    { sku: 'KF-001', name: 'Jersey Knit Single',        design: 'Solid',   color: 'Black',  colorHex: '#000000', categoryId: knitCat!.id,  unit: 'kg',     lowStockAt: 20,  costPrice: 850 },
    { sku: 'KF-002', name: 'Interlock Cotton Knit',     design: 'Solid',   color: 'Navy',   colorHex: '#1e3a5f', categoryId: knitCat!.id,  unit: 'kg',     lowStockAt: 20,  costPrice: 920 },
    { sku: 'SS-001', name: 'Pure Silk Charmeuse',       design: 'Solid',   color: 'Gold',   colorHex: '#FFD700', categoryId: silkCat!.id,  unit: 'meters', lowStockAt: 15,  costPrice: 2800 },
  ]

  for (const prod of sampleProducts) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: {},
      create: { ...prod, description: `${prod.name} - Premium quality`, images: '[]' }
    })
  }

  console.log('✅ Products created')

  // ─── 5b. Madeena Tex Real Products ────────────────────────────────────────
  const sareesCat          = await prisma.category.findUnique({ where: { slug: 'sarees' } })
  const nightyCat          = await prisma.category.findUnique({ where: { slug: 'nighty-3mtr' } })
  const beddingCat         = await prisma.category.findUnique({ where: { slug: 'bedding' } })
  const shirtingCat        = await prisma.category.findUnique({ where: { slug: 'shirtings-suitings' } })
  const lacesCat           = await prisma.category.findUnique({ where: { slug: 'laces-trims' } })
  const bulkCat            = await prisma.category.findUnique({ where: { slug: 'bulk-lots' } })

  const madeenaProducts = [
    // ── Sarees (PCS) ──────────────────────────────────────────────────────
    { sku: 'SAR-001', name: 'Aura Saree',              design: 'Aura',              color: 'Multi',   colorHex: '#ec4899', categoryId: sareesCat!.id,   unit: 'PCS',    lowStockAt: 5,  costPrice: 800  },
    { sku: 'SAR-002', name: 'Flora Saree',             design: 'Flora',             color: 'Green',   colorHex: '#22c55e', categoryId: sareesCat!.id,   unit: 'PCS',    lowStockAt: 5,  costPrice: 750  },
    { sku: 'SAR-003', name: 'Golden Rose Saree',       design: 'Golden Rose',       color: 'Gold',    colorHex: '#FFD700', categoryId: sareesCat!.id,   unit: 'PCS',    lowStockAt: 5,  costPrice: 1500 },
    { sku: 'SAR-004', name: 'Royal Queen Saree',       design: 'Royal Queen',       color: 'Maroon',  colorHex: '#800000', categoryId: sareesCat!.id,   unit: 'PCS',    lowStockAt: 5,  costPrice: 1200 },
    { sku: 'SAR-005', name: 'Butterfly Saree',         design: 'Butterfly',         color: 'Blue',    colorHex: '#3b82f6', categoryId: sareesCat!.id,   unit: 'PCS',    lowStockAt: 5,  costPrice: 900  },
    { sku: 'SAR-006', name: 'Ocean Pearl Saree',       design: 'Ocean Pearl',       color: 'Pearl',   colorHex: '#f0f9ff', categoryId: sareesCat!.id,   unit: 'PCS',    lowStockAt: 5,  costPrice: 1100 },
    { sku: 'SAR-007', name: 'Century Gold Saree',      design: 'Century Gold',      color: 'Gold',    colorHex: '#ca8a04', categoryId: sareesCat!.id,   unit: 'PCS',    lowStockAt: 5,  costPrice: 1300 },
    { sku: 'SAR-008', name: 'Moonlight Rajwadi Saree', design: 'Moonlight Rajwadi', color: 'Silver',  colorHex: '#94a3b8', categoryId: sareesCat!.id,   unit: 'PCS',    lowStockAt: 5,  costPrice: 950  },

    // ── 3MTR / Nighty Fabrics (PCS) ────────────────────────────────────────
    { sku: 'NF-001', name: '3MTR Kushboo Export',      design: 'Kushboo Export',    color: 'Assorted',colorHex: '#c084fc', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 600  },
    { sku: 'NF-002', name: '3MTR Ocean Pearl Dhaman',  design: 'Ocean Pearl',       color: 'Pearl',   colorHex: '#bae6fd', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 650  },
    { sku: 'NF-003', name: '3MTR Babagold',            design: 'Babagold',          color: 'Gold',    colorHex: '#fde68a', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 550  },
    { sku: 'NF-004', name: '3MTR Century Gold',        design: 'Century Gold',      color: 'Gold',    colorHex: '#ca8a04', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 700  },
    { sku: 'NF-005', name: '3MTR Moonlight Rajwadi',   design: 'Moonlight Rajwadi', color: 'Silver',  colorHex: '#94a3b8', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 600  },
    { sku: 'NF-006', name: '3MTR Vama Export',         design: 'Vama Export',       color: 'Assorted',colorHex: '#a78bfa', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 580  },
    { sku: 'NF-007', name: '3MTR Star Galaxy',         design: 'Star Galaxy',       color: 'Dark',    colorHex: '#1e1b4b', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 620  },
    { sku: 'NF-008', name: '3MTR Classic Designer',    design: 'Classic Designer',  color: 'Multi',   colorHex: '#7c3aed', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 640  },
    { sku: 'NF-009', name: '3MTR Fancy Nighty',        design: 'Fancy',             color: 'Assorted',colorHex: '#f9a8d4', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 500  },
    { sku: 'NF-010', name: '3MTR Premium Set',         design: 'Premium',           color: 'Assorted',colorHex: '#8b5cf6', categoryId: nightyCat!.id,   unit: 'PCS',    lowStockAt: 10, costPrice: 750  },

    // ── Bedding & Home ──────────────────────────────────────────────────────
    { sku: 'BED-001', name: 'Bed Sheet Single',        design: 'Plain',             color: 'Assorted',colorHex: '#0ea5e9', categoryId: beddingCat!.id,  unit: 'PCS',    lowStockAt: 10, costPrice: 350  },
    { sku: 'BED-002', name: 'Bed Sheet Double',        design: 'Plain',             color: 'Assorted',colorHex: '#0284c7', categoryId: beddingCat!.id,  unit: 'PCS',    lowStockAt: 10, costPrice: 550  },
    { sku: 'BED-003', name: 'Cotton Bed Sheet New',    design: 'Cotton New',        color: 'Assorted',colorHex: '#e0f2fe', categoryId: beddingCat!.id,  unit: 'KG',     lowStockAt: 20, costPrice: 220  },
    { sku: 'BED-004', name: 'Pillow Cover Set',        design: 'Plain',             color: 'White',   colorHex: '#f8fafc', categoryId: beddingCat!.id,  unit: 'PCS',    lowStockAt: 10, costPrice: 180  },
    { sku: 'BED-005', name: 'Bed Cover Plain',         design: 'Plain',             color: 'Assorted',colorHex: '#bae6fd', categoryId: beddingCat!.id,  unit: 'PCS',    lowStockAt: 5,  costPrice: 480  },

    // ── Shirtings & Suitings (meters) ──────────────────────────────────────
    { sku: 'SH-001', name: 'Poplin Plain',             design: 'Plain',             color: 'White',   colorHex: '#f8fafc', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 90   },
    { sku: 'SH-002', name: 'Poplin Printed',           design: 'Printed',           color: 'Multi',   colorHex: '#fb923c', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 110  },
    { sku: 'SH-003', name: 'Oxford Shirting',          design: 'Oxford',            color: 'Blue',    colorHex: '#3b82f6', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 130  },
    { sku: 'SH-004', name: 'TC Shirting 60"',          design: 'TC 60"',            color: 'Assorted',colorHex: '#64748b', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 120  },
    { sku: 'SH-005', name: 'Radio Shirting',           design: 'Radio',             color: 'Striped', colorHex: '#1e40af', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 100  },
    { sku: 'SH-006', name: 'Cotton Dobbi 60"',         design: 'Dobbi 60"',         color: 'Cream',   colorHex: '#fef3c7', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 30, costPrice: 140  },
    { sku: 'SH-007', name: 'Cotton Poplin Stripe',     design: 'Stripe',            color: 'Blue',    colorHex: '#60a5fa', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 105  },
    { sku: 'SH-008', name: 'TC Suiting',               design: 'TC Suiting',        color: 'Navy',    colorHex: '#1e3a5f', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 30, costPrice: 160  },
    { sku: 'SH-009', name: 'Poly Viscose Suiting',     design: 'Poly Viscose',      color: 'Grey',    colorHex: '#94a3b8', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 30, costPrice: 150  },
    { sku: 'SH-010', name: 'Check Shirting',           design: 'Check',             color: 'Multi',   colorHex: '#22d3ee', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 115  },
    { sku: 'SH-011', name: 'Plain Shirting 45"',       design: 'Plain 45"',         color: 'White',   colorHex: '#f8fafc', categoryId: shirtingCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 85   },

    // ── Laces & Trims (meters) ──────────────────────────────────────────────
    { sku: 'LT-001', name: 'Lace Cotton Plain',        design: 'Plain',             color: 'White',   colorHex: '#f8fafc', categoryId: lacesCat!.id,    unit: 'meters', lowStockAt: 50, costPrice: 50   },
    { sku: 'LT-002', name: 'Lace Cotton Printed',      design: 'Printed',           color: 'Multi',   colorHex: '#fcd34d', categoryId: lacesCat!.id,    unit: 'meters', lowStockAt: 50, costPrice: 65   },
    { sku: 'LT-003', name: 'Border Sarong',            design: 'Border',            color: 'Gold',    colorHex: '#ca8a04', categoryId: lacesCat!.id,    unit: 'meters', lowStockAt: 30, costPrice: 80   },
    { sku: 'LT-004', name: 'Lace Nylon',               design: 'Nylon',             color: 'White',   colorHex: '#f1f5f9', categoryId: lacesCat!.id,    unit: 'meters', lowStockAt: 50, costPrice: 45   },
    { sku: 'LT-005', name: 'Elastic Border',           design: 'Elastic',           color: 'White',   colorHex: '#f8fafc', categoryId: lacesCat!.id,    unit: 'meters', lowStockAt: 50, costPrice: 35   },
    { sku: 'LT-006', name: 'Ribbon Lace',              design: 'Ribbon',            color: 'Multi',   colorHex: '#f472b6', categoryId: lacesCat!.id,    unit: 'meters', lowStockAt: 50, costPrice: 40   },

    // ── Bulk / Lots (KG) ───────────────────────────────────────────────────
    { sku: 'BL-001', name: 'Maaza Printed Lot',        design: 'Printed Mix',       color: 'Multi',   colorHex: '#a3e635', categoryId: bulkCat!.id,     unit: 'KG',     lowStockAt: 20, costPrice: 120  },
    { sku: 'BL-002', name: 'Reyon Lot China',          design: 'Reyon China',       color: 'Assorted',colorHex: '#f43f5e', categoryId: bulkCat!.id,     unit: 'KG',     lowStockAt: 20, costPrice: 150  },
    { sku: 'BL-003', name: 'Viscose Cut Piece New',    design: 'Viscose New',       color: 'Multi',   colorHex: '#8b5cf6', categoryId: bulkCat!.id,     unit: 'KG',     lowStockAt: 20, costPrice: 130  },
    { sku: 'BL-004', name: 'Cotton Cut Piece',         design: 'Cotton Mix',        color: 'Assorted',colorHex: '#86efac', categoryId: bulkCat!.id,     unit: 'KG',     lowStockAt: 20, costPrice: 100  },
    { sku: 'BL-005', name: 'Printed Lot Mixed',        design: 'Printed Mix',       color: 'Multi',   colorHex: '#fda4af', categoryId: bulkCat!.id,     unit: 'KG',     lowStockAt: 20, costPrice: 110  },
    { sku: 'BL-006', name: 'Nylon Lot',                design: 'Nylon Mix',         color: 'Assorted',colorHex: '#67e8f9', categoryId: bulkCat!.id,     unit: 'KG',     lowStockAt: 20, costPrice: 140  },
    { sku: 'BL-007', name: 'Silk Cut Piece',           design: 'Silk Mix',          color: 'Multi',   colorHex: '#e879f9', categoryId: bulkCat!.id,     unit: 'KG',     lowStockAt: 15, costPrice: 200  },
  ]

  for (const prod of madeenaProducts) {
    await prisma.product.upsert({
      where: { sku: prod.sku },
      update: { costPrice: prod.costPrice },
      create: { ...prod, description: `${prod.name} - Madeena Tex`, images: '[]' }
    })
  }

  console.log('✅ Madeena Tex products created')

  // ─── 6. Initial Stock ─────────────────────────────────────────────────────
  const adminUser = await prisma.user.findUnique({ where: { email: 'anasbikes1992@gmail.com' } })

  const allProducts = await prisma.product.findMany()
  const locations = [warehouseA, warehouseB, shopA]

  for (const product of allProducts) {
    for (const location of locations) {
      const qty = location.type === 'WAREHOUSE' ? 200 : 50
      await prisma.stock.upsert({
        where: { productId_locationId: { productId: product.id, locationId: location.id } },
        update: {},
        create: { productId: product.id, locationId: location.id, quantity: qty }
      })

      // Record stock-in entry
      await prisma.stockIn.create({
        data: {
          productId: product.id,
          locationId: location.id,
          quantity: qty,
          batchNumber: `SEED-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          costPrice: product.costPrice ?? 0,
          receivedBy: adminUser!.id,
          note: 'Initial stock (seeded)'
        }
      })
    }
  }

  console.log('✅ Initial stock loaded')
  console.log('')
  console.log('🎉 Database seeded successfully!')
  console.log('')
  console.log('Login credentials:')
  console.log('  Super Admin : anasbikes1992@gmail.com   / 123456')
  console.log('  Madeena     : madeenas.lk@gmail.com     / 123456')
  console.log('  Finance     : finance@textilestock.com   / password123')
  console.log('  Manager     : manager.wh@textilestock.com/ password123')
  console.log('  Storekeeper : storekeeper@textilestock.com/ password123')
  console.log('  Shop Staff  : shop.a@textilestock.com   / password123')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
