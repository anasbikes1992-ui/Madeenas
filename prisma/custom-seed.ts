import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding database with admin user and basic locations...')

  // Create Locations
  const warehouse = await prisma.location.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: { name: 'Main Factory Warehouse', code: 'WH-MAIN', type: 'WAREHOUSE' },
  })

  const shop = await prisma.location.upsert({
    where: { code: 'SH-01' },
    update: {},
    create: { name: 'City Center Shop', code: 'SH-01', type: 'SHOP' },
  })

  // Create Categories
  const category1 = await prisma.category.upsert({
    where: { slug: 'cotton' },
    update: {},
    create: { name: 'Premium Cotton', slug: 'cotton', color: '#3b82f6' },
  })
  
  const category2 = await prisma.category.upsert({
    where: { slug: 'silk' },
    update: {},
    create: { name: 'Pure Silk', slug: 'silk', color: '#ec4899' },
  })

  // Create Admin User
  const passwordHash = await bcrypt.hash('123456', 10)
  const admin = await prisma.user.upsert({
    where: { email: 'madeenas.lk@gmail.com' },
    update: { password: passwordHash, role: 'SUPER_ADMIN' },
    create: {
      email: 'madeenas.lk@gmail.com',
      password: passwordHash,
      name: 'Madeenas Admin',
      role: 'SUPER_ADMIN',
    },
  })

  console.log('Seed completed successfully.')
  console.log('Admin: madeenas.lk@gmail.com / 123456')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
