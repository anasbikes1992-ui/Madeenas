import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkStockDiscrepancy() {
  // Total stock in old system
  const oldStock = await prisma.stock.aggregate({
    _sum: { quantity: true }
  })

  // Stock only for migrated products
  const oldStockForMigrated = await prisma.stock.aggregate({
    where: {
      product: { hasVariants: true }
    },
    _sum: { quantity: true }
  })

  // Total stock in new system
  const newStock = await prisma.stockVariant.aggregate({
    _sum: { quantity: true }
  })

  // Count of migrated vs unmigrated
  const migratedCount = await prisma.product.count({
    where: { hasVariants: true }
  })
  
  const unmigratedCount = await prisma.product.count({
    where: { hasVariants: false }
  })

  console.log('=== Stock Analysis ===')
  console.log(`\nOld Stock (all products): ${oldStock._sum.quantity?.toLocaleString()}`)
  console.log(`Old Stock (migrated products only): ${oldStockForMigrated._sum.quantity?.toLocaleString()}`)
  console.log(`New Stock (variant system): ${newStock._sum.quantity?.toLocaleString()}`)
  
  console.log(`\n=== Product Counts ===`)
  console.log(`Migrated products: ${migratedCount}`)
  console.log(`Unmigrated products: ${unmigratedCount}`)
  
  const difference = (oldStockForMigrated._sum.quantity || 0) - (newStock._sum.quantity || 0)
  console.log(`\n=== Discrepancy ===`)
  console.log(`Difference: ${difference.toLocaleString()}`)
  
  if (difference === 0) {
    console.log('✅ Stock quantities match perfectly!')
  } else {
    console.log(`⚠️  Stock mismatch of ${difference} units`)
  }

  await prisma.$disconnect()
}

checkStockDiscrepancy()
