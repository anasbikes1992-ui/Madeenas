import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function finalVerification() {
  console.log('=== Final Migration Verification ===\n')

  // 1. SKU Uniqueness
  const duplicateSKUs = await prisma.productColor.groupBy({
    by: ['sku'],
    _count: { sku: true },
    having: { sku: { _count: { gt: 1 } } }
  })
  
  console.log('1. SKU Uniqueness Check:')
  console.log(`   ${duplicateSKUs.length === 0 ? '✅' : '❌'} ${duplicateSKUs.length} duplicate SKUs found`)
  
  if (duplicateSKUs.length > 0) {
    console.log('   Duplicates:', duplicateSKUs.map(d => d.sku).join(', '))
  }

  // 2. Sample SKUs
  const sampleSKUs = await prisma.productColor.findMany({
    take: 10,
    select: {
      sku: true,
      variant: {
        select: {
          product: {
            select: { name: true }
          }
        }
      }
    }
  })
  
  console.log('\n2. Sample SKUs (10):')
  sampleSKUs.forEach(pc => {
    console.log(`   ${pc.sku} - ${pc.variant.product.name}`)
  })

  // 3. Orphaned Records Check
  const allVariants = await prisma.productVariant.findMany({
    select: { id: true, productId: true }
  })
  const allProducts = await prisma.product.findMany({
    select: { id: true }
  })
  const productIds = new Set(allProducts.map(p => p.id))
  const orphanedVariants = allVariants.filter(v => !productIds.has(v.productId)).length
  
  const allColors = await prisma.productColor.findMany({
    select: { id: true, variantId: true }
  })
  const variantIds = new Set(allVariants.map(v => v.id))
  const orphanedColors = allColors.filter(c => !variantIds.has(c.variantId)).length
  
  const allStockVariants = await prisma.stockVariant.findMany({
    select: { id: true, productColorId: true }
  })
  const colorIds = new Set(allColors.map(c => c.id))
  const orphanedStockVariants = allStockVariants.filter(sv => !colorIds.has(sv.productColorId)).length
  
  console.log('\n3. Orphaned Records Check:')
  console.log(`   ${orphanedVariants === 0 ? '✅' : '❌'} ProductVariant orphans: ${orphanedVariants}`)
  console.log(`   ${orphanedColors === 0 ? '✅' : '❌'} ProductColor orphans: ${orphanedColors}`)
  console.log(`   ${orphanedStockVariants === 0 ? '✅' : '❌'} StockVariant orphans: ${orphanedStockVariants}`)

  // 4. Migration Completeness
  const totalProducts = await prisma.product.count()
  const migratedProducts = await prisma.product.count({ where: { hasVariants: true } })
  const unmigratedProducts = await prisma.product.count({ where: { hasVariants: false } })
  
  console.log('\n4. Migration Status:')
  console.log(`   Total products: ${totalProducts}`)
  console.log(`   Migrated: ${migratedProducts} (${Math.round(migratedProducts/totalProducts*100)}%)`)
  console.log(`   Unmigrated: ${unmigratedProducts}`)

  // 5. Stock Variant Distribution
  const stockByLocation = await prisma.stockVariant.groupBy({
    by: ['locationId'],
    _sum: { quantity: true },
    _count: true
  })
  
  console.log('\n5. Stock Variant Distribution by Location:')
  for (const loc of stockByLocation) {
    const location = await prisma.location.findUnique({
      where: { id: loc.locationId },
      select: { name: true }
    })
    console.log(`   ${location?.name}: ${loc._sum.quantity} units (${loc._count} variants)`)
  }

  console.log('\n=== ✅ Migration Verification Complete ===')
  
  await prisma.$disconnect()
}

finalVerification().catch(console.error)
