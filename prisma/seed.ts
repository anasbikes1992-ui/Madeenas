import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database...')

  // 1. Create Locations
  const warehouseA = await prisma.location.upsert({
    where: { code: 'WH-A' },
    update: {},
    create: {
      name: 'Warehouse A (Main)',
      code: 'WH-A',
      type: 'WAREHOUSE',
      address: 'Central Industrial Park, Block 1'
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

  // 2. Create Users
  const passwordHash = await bcrypt.hash('password123', 10)

  // Super Admin
  await prisma.user.upsert({
    where: { email: 'admin@textilestock.com' },
    update: {},
    create: {
      name: 'Super Admin',
      email: 'admin@textilestock.com',
      password: passwordHash,
      role: 'SUPER_ADMIN'
    }
  })

  // Finance Department
  await prisma.user.upsert({
    where: { email: 'finance@textilestock.com' },
    update: {},
    create: {
      name: 'Finance Dept',
      email: 'finance@textilestock.com',
      password: passwordHash,
      role: 'FINANCE'
    }
  })

  // Warehouse Manager
  await prisma.user.upsert({
    where: { email: 'manager.wh@textilestock.com' },
    update: {},
    create: {
      name: 'WH Manager John',
      email: 'manager.wh@textilestock.com',
      password: passwordHash,
      role: 'MANAGER',
      locationId: warehouseA.id
    }
  })

  // Store Keeper / Receiver
  await prisma.user.upsert({
    where: { email: 'storekeeper@textilestock.com' },
    update: {},
    create: {
      name: 'Store Keeper Mike',
      email: 'storekeeper@textilestock.com',
      password: passwordHash,
      role: 'STORE_KEEPER',
      locationId: warehouseA.id
    }
  })

  // Shop Staff
  await prisma.user.upsert({
    where: { email: 'shop.a@textilestock.com' },
    update: {},
    create: {
      name: 'Shop A Manager',
      email: 'shop.a@textilestock.com',
      password: passwordHash,
      role: 'SHOP_STAFF',
      locationId: shopA.id
    }
  })

  // 3. Create Categories
  const categories = [
    { name: 'Woven Fabrics', slug: 'woven-fabrics', color: '#3b82f6' },
    { name: 'Knit Fabrics', slug: 'knit-fabrics', color: '#10b981' },
    { name: 'Lace & Embroidery', slug: 'lace-embroidery', color: '#8b5cf6' },
    { name: 'Printed Cottons', slug: 'printed-cottons', color: '#f59e0b' }
  ]

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat
    })
  }

  console.log('Database seeded successfully.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
