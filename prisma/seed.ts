import { PrismaClient, UserRole, LocationType } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
  // Hash password
  const password = await bcrypt.hash('password123', 10)
  
  // Create locations
  const warehouse = await prisma.location.upsert({ where: { code: 'WH-MAIN' }, update: {}, create: { name: 'Main Warehouse', code: 'WH-MAIN', type: LocationType.WAREHOUSE } })
  const shop = await prisma.location.upsert({ where: { code: 'SH-01' }, update: {}, create: { name: 'Shop 01', code: 'SH-01', type: LocationType.SHOP } })
  
  // Create admin user
  await prisma.user.upsert({ where: { email: 'admin@madeenas.lk' }, update: {}, create: { name: 'Admin', email: 'admin@madeenas.lk', password, role: UserRole.ADMIN, locationId: warehouse.id } })
  
  // Create category
  const cat = await prisma.category.upsert({ where: { slug: 'cotton' }, update: {}, create: { name: 'Cotton', slug: 'cotton', color: '#6366f1' } })
  
  // Create sample product with 2 variants
  const product = await prisma.product.create({ data: { name: 'Sample Fabric', categoryId: cat.id } })
  const v1 = await prisma.productVariant.create({ data: { productId: product.id, sku: 'SMP-001', colorName: 'Red', stockUnit: 'metres', stockUnitLabel: 'Metres', saleUnit: 'metres', saleUnitLabel: 'Metres', saleToStockFactor: 1.0, salePrice: 350, costPrice: 200 } })
  await prisma.stock.create({ data: { variantId: v1.id, locationId: warehouse.id, quantity: 500 } })
  
  console.log('✅ Seed complete')
}

main().catch(console.error).finally(() => prisma.$disconnect())
