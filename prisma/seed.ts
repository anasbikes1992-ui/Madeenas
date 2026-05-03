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
    { name: 'Woven Fabrics',    slug: 'woven-fabrics',    color: '#3b82f6' },
    { name: 'Knit Fabrics',     slug: 'knit-fabrics',     color: '#10b981' },
    { name: 'Lace & Embroidery',slug: 'lace-embroidery',  color: '#8b5cf6' },
    { name: 'Printed Cottons',  slug: 'printed-cottons',  color: '#f59e0b' },
    { name: 'Silk & Satin',     slug: 'silk-satin',       color: '#ec4899' },
    { name: 'Denim',            slug: 'denim',            color: '#1e40af' },
    { name: 'Synthetic',        slug: 'synthetic',        color: '#64748b' },
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
