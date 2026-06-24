export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import bcrypt from 'bcryptjs'
import { env } from '@/lib/env'
import { fail, ok } from '@/lib/api-response'

const SEED_SECRET = env.SEED_SECRET

async function runSeed(req: Request) {
  if (env.NODE_ENV === 'production') {
    return fail('Not found', 404, 'NOT_FOUND')
  }

  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token') || req.headers.get('x-seed-token')
  if (!SEED_SECRET || token !== SEED_SECRET) {
    return fail('Unauthorized', 401, 'UNAUTHORIZED')
  }

  try {
    console.log('🌱 Running database seed...')

    // ── Locations ──────────────────────────────────────────────────────────
    const warehouseA = await prisma.location.upsert({
      where: { code: 'WH-A' },
      update: {},
      create: { name: 'Warehouse A (Main)', code: 'WH-A', type: 'WAREHOUSE', address: 'Central Industrial Park, Block 1' }
    })
    const warehouseB = await prisma.location.upsert({
      where: { code: 'WH-B' },
      update: {},
      create: { name: 'Warehouse B (Secondary)', code: 'WH-B', type: 'WAREHOUSE', address: 'Industrial Zone, Block 2' }
    })
    const shopA = await prisma.location.upsert({
      where: { code: 'SH-A' },
      update: {},
      create: { name: 'Shop A (Downtown)', code: 'SH-A', type: 'SHOP', address: 'Downtown Main Street, 123' }
    })
    await prisma.location.upsert({
      where: { code: 'SH-B' },
      update: {},
      create: { name: 'Shop B (Uptown)', code: 'SH-B', type: 'SHOP', address: 'Uptown Market, 456' }
    })

    // ── Users ──────────────────────────────────────────────────────────────
    const pass123456 = await bcrypt.hash('123456', 10)
    const pass123    = await bcrypt.hash('password123', 10)

    const admin = await prisma.user.upsert({
      where: { email: 'anasbikes1992@gmail.com' },
      update: { role: 'SUPER_ADMIN', isActive: true },
      create: { name: 'Anas (Super Admin)', email: 'anasbikes1992@gmail.com', password: pass123456, role: 'SUPER_ADMIN' }
    })
    await prisma.user.upsert({
      where: { email: 'nexus.local@gmail.com' },
      update: { role: 'SUPER_ADMIN', isActive: true },
      create: { name: 'Nexus Admin', email: 'nexus.local@gmail.com', password: pass123456, role: 'SUPER_ADMIN' }
    })
    await prisma.user.upsert({
      where: { email: 'finance@nexus.local' },
      update: {},
      create: { name: 'Finance Dept', email: 'finance@nexus.local', password: pass123, role: 'FINANCE' }
    })
    await prisma.user.upsert({
      where: { email: 'manager.wh@nexus.local' },
      update: {},
      create: { name: 'WH Manager', email: 'manager.wh@nexus.local', password: pass123, role: 'MANAGER', locationId: warehouseA.id }
    })
    await prisma.user.upsert({
      where: { email: 'storekeeper@nexus.local' },
      update: {},
      create: { name: 'Store Keeper', email: 'storekeeper@nexus.local', password: pass123, role: 'STORE_KEEPER', locationId: warehouseA.id }
    })
    await prisma.user.upsert({
      where: { email: 'shop.a@nexus.local' },
      update: {},
      create: { name: 'Shop A Staff', email: 'shop.a@nexus.local', password: pass123, role: 'SHOP_STAFF', locationId: shopA.id }
    })

    // ── Categories ─────────────────────────────────────────────────────────
    const cats = [
      { name: 'Woven Fabrics',     slug: 'woven-fabrics',    color: '#3b82f6' },
      { name: 'Knit Fabrics',      slug: 'knit-fabrics',     color: '#10b981' },
      { name: 'Lace & Embroidery', slug: 'lace-embroidery',  color: '#8b5cf6' },
      { name: 'Printed Cottons',   slug: 'printed-cottons',  color: '#f59e0b' },
      { name: 'Silk & Satin',      slug: 'silk-satin',       color: '#ec4899' },
      { name: 'Denim',             slug: 'denim',            color: '#1e40af' },
      { name: 'Synthetic',         slug: 'synthetic',        color: '#64748b' },
    ]
    for (const cat of cats) {
      await prisma.category.upsert({ where: { slug: cat.slug }, update: {}, create: cat })
    }

    // ── Suppliers ──────────────────────────────────────────────────────────
    const supplierData = [
      { name: 'Global Textile Co.', contact: 'Ali Hassan', email: 'ali@gtco.com', phone: '+94771234567' },
      { name: 'Silk Road Imports',  contact: 'Sara Ahmed', email: 'sara@silk.com', phone: '+94772345678' },
      { name: 'Fabric World Ltd.',  contact: 'Rauf Nizam', email: 'rauf@fw.com',   phone: '+94773456789' },
    ]
    for (const sup of supplierData) {
      const exists = await prisma.supplier.findFirst({ where: { name: sup.name } })
      if (!exists) await prisma.supplier.create({ data: sup })
    }

    // ── Products ───────────────────────────────────────────────────────────
    const wovenCat = await prisma.category.findUnique({ where: { slug: 'woven-fabrics' } })
    const knitCat  = await prisma.category.findUnique({ where: { slug: 'knit-fabrics' } })
    const silkCat  = await prisma.category.findUnique({ where: { slug: 'silk-satin' } })

    const products = [
      { sku: 'WF-001', name: 'Premium Cotton Voile',   design: 'Solid',  color: 'White', colorHex: '#FFFFFF', categoryId: wovenCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 450 },
      { sku: 'WF-002', name: 'Cotton Poplin Stripe',   design: 'Stripe', color: 'Blue',  colorHex: '#3b82f6', categoryId: wovenCat!.id, unit: 'meters', lowStockAt: 50, costPrice: 380 },
      { sku: 'WF-003', name: 'Dobby Weave Fabric',     design: 'Dobby',  color: 'Cream', colorHex: '#FFF8DC', categoryId: wovenCat!.id, unit: 'meters', lowStockAt: 30, costPrice: 620 },
      { sku: 'KF-001', name: 'Jersey Knit Single',     design: 'Solid',  color: 'Black', colorHex: '#000000', categoryId: knitCat!.id,  unit: 'kg',     lowStockAt: 20, costPrice: 850 },
      { sku: 'KF-002', name: 'Interlock Cotton Knit',  design: 'Solid',  color: 'Navy',  colorHex: '#1e3a5f', categoryId: knitCat!.id,  unit: 'kg',     lowStockAt: 20, costPrice: 920 },
      { sku: 'SS-001', name: 'Pure Silk Charmeuse',    design: 'Solid',  color: 'Gold',  colorHex: '#FFD700', categoryId: silkCat!.id,  unit: 'meters', lowStockAt: 15, costPrice: 2800 },
    ]
    for (const prod of products) {
      await prisma.product.upsert({
        where: { sku: prod.sku },
        update: {},
        create: { ...prod, description: `${prod.name} - Premium quality`, images: '[]' }
      })
    }

    // ── Initial Stock ──────────────────────────────────────────────────────
    const allProducts = await prisma.product.findMany()
    const stockLocations = [
      { loc: warehouseA, qty: 200 },
      { loc: warehouseB, qty: 150 },
      { loc: shopA,      qty: 50  },
    ]

    for (const product of allProducts) {
      for (const { loc, qty } of stockLocations) {
        await prisma.stock.upsert({
          where: { productId_locationId: { productId: product.id, locationId: loc.id } },
          update: {},
          create: { productId: product.id, locationId: loc.id, quantity: qty }
        })
        const exists = await prisma.stockIn.findFirst({
          where: { productId: product.id, locationId: loc.id, note: 'Initial stock (seeded)' }
        })
        if (!exists) {
          await prisma.stockIn.create({
            data: {
              productId: product.id,
              locationId: loc.id,
              quantity: qty,
              batchNumber: `SEED-${product.sku}`,
              costPrice: product.costPrice ?? 0,
              receivedBy: admin.id,
              note: 'Initial stock (seeded)'
            }
          })
        }
      }
    }

    const userCount     = await prisma.user.count()
    const productCount  = await prisma.product.count()
    const locationCount = await prisma.location.count()
    const stockCount    = await prisma.stock.count()

    return ok({
      message: 'Database seeded successfully.',
      summary: { users: userCount, products: productCount, locations: locationCount, stockEntries: stockCount },
    })
  } catch (error: unknown) {
    console.error('Seed failed:', error)
    const message = error instanceof Error ? error.message : 'Seed failed'
    return fail(message, 500, 'SEED_FAILED')
  }
}

export async function POST(req: Request) {
  return runSeed(req)
}

export async function GET(req: Request) {
  return fail('Method not allowed. Use POST with x-seed-token header.', 405, 'METHOD_NOT_ALLOWED')
}
