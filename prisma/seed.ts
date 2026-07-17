/**
 * Seed script.
 *
 * 1. Seeds AppSetting defaults (idempotent).
 * 2. If a JSON backup directory exists (BACKUP_DIR env or the default
 *    pre-remediation snapshot), restores master data from it: locations,
 *    users (with their original password hashes), units, categories,
 *    products, variants, stock, suppliers, customers.
 *
 * Transactional history (sales, transfers, stock-ins) is intentionally
 * NOT restored — the remediation reset starts financial history clean.
 */
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

const prisma = new PrismaClient()

const DEFAULT_SETTINGS: Record<string, string> = {
  // Retail price = costPrice * retail_markup for customer-facing surfaces.
  retail_markup: '1.20',
  // VAT percentage applied to sales.
  vat_rate: '18.00',
  currency: 'LKR',
  // Minimum supported mobile app version (semver). Older clients must update.
  mobile_min_version: '3.1.0',
}

function loadBackupTable<T = Record<string, unknown>>(dir: string, table: string): T[] {
  const file = path.join(dir, `${table}.json`)
  if (!fs.existsSync(file)) return []
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T[]
}

async function seedSettings() {
  for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
    await prisma.appSetting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    })
  }
  console.log('✅ Settings seeded')
}

async function restoreMasterData(dir: string) {
  console.log(`Restoring master data from ${dir}`)

  const locations = loadBackupTable(dir, 'Location')
  const users = loadBackupTable(dir, 'User')
  const units = loadBackupTable(dir, 'Unit')
  const unitConversions = loadBackupTable(dir, 'UnitConversion')
  const categories = loadBackupTable(dir, 'Category')
  const products = loadBackupTable(dir, 'Product')
  const variants = loadBackupTable(dir, 'ProductVariant')
  const stocks = loadBackupTable(dir, 'Stock')
  const suppliers = loadBackupTable(dir, 'Supplier')
  const customers = loadBackupTable(dir, 'Customer')

  // Insert in FK dependency order. skipDuplicates makes reruns safe.
  if (locations.length) {
    await prisma.location.createMany({ data: locations as never, skipDuplicates: true })
  }
  if (users.length) {
    await prisma.user.createMany({ data: users as never, skipDuplicates: true })
  }
  if (units.length) {
    await prisma.unit.createMany({ data: units as never, skipDuplicates: true })
  }
  if (unitConversions.length) {
    await prisma.unitConversion.createMany({ data: unitConversions as never, skipDuplicates: true })
  }
  if (categories.length) {
    await prisma.category.createMany({ data: categories as never, skipDuplicates: true })
  }
  if (products.length) {
    await prisma.product.createMany({ data: products as never, skipDuplicates: true })
  }
  if (variants.length) {
    await prisma.productVariant.createMany({ data: variants as never, skipDuplicates: true })
  }
  if (stocks.length) {
    await prisma.stock.createMany({ data: stocks as never, skipDuplicates: true })
  }
  if (suppliers.length) {
    // Supplier.name is now unique; de-duplicate by name keeping the first.
    const seen = new Set<string>()
    const unique = (suppliers as Array<{ name: string }>).filter((s) => {
      if (seen.has(s.name)) return false
      seen.add(s.name)
      return true
    })
    await prisma.supplier.createMany({ data: unique as never, skipDuplicates: true })
  }
  if (customers.length) {
    await prisma.customer.createMany({ data: customers as never, skipDuplicates: true })
  }

  console.log(
    `✅ Restored: ${locations.length} locations, ${users.length} users, ${products.length} products, ` +
      `${variants.length} variants, ${stocks.length} stock rows, ${suppliers.length} suppliers, ${customers.length} customers`
  )
}

async function main() {
  await seedSettings()

  const backupDir =
    process.env.BACKUP_DIR || path.join('D:', 'MADEENA', 'backups', '2026-07-16')
  if (fs.existsSync(backupDir)) {
    await restoreMasterData(backupDir)
  } else {
    console.log(`No backup directory at ${backupDir} — skipping master-data restore`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
