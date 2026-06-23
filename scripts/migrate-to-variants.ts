import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Generate SKU in format: CAT-PROD-VARIANT-COLOR
 */
function generateSKU(
  categoryCode: string,
  productCode: string,
  variantCode: string,
  colorCode: string
): string {
  return `${categoryCode}-${productCode}-${variantCode}-${colorCode}`;
}

/**
 * Migrate a single product to the variant system
 */
async function migrateProductToVariants(productId: string) {
  console.log(`\nMigrating product ${productId}...`);
  
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      category: true,
      stocks: true,
    },
  });

  if (!product) {
    console.log(`Product ${productId} not found`);
    return;
  }

  if (product.hasVariants) {
    console.log(`Product ${product.name} already migrated`);
    return;
  }

  console.log(`Processing: ${product.name} (${product.design}) - ${product.color}`);

  // 1. Create/find color in master table
  const color = await prisma.colorMaster.upsert({
    where: { code: product.color || 'DEFAULT' },
    create: {
      code: product.color || 'DEFAULT',
      name: product.color,
      hexValue: product.colorHex,
    },
    update: {
      name: product.color,
      hexValue: product.colorHex,
    },
  });
  console.log(`  ✓ Color: ${color.code}`);

  // 2. Create default variant (use existing design as code)
  const variantCode = product.design || 'DEFAULT';
  const variant = await prisma.productVariant.create({
    data: {
      productId: product.id,
      code: variantCode,
      design: product.design,
      costPrice: product.costPrice,
      unit: product.unit,
      alternateUnit: product.alternateUnit,
      conversionFactor: product.conversionFactor,
    },
  });
  console.log(`  ✓ Variant: ${variant.code}`);

  // 3. Create product color
  const categoryCode = product.category.name.substring(0, 10).toUpperCase().replace(/\s+/g, '');
  const productCode = product.name.substring(0, 10).toUpperCase().replace(/\s+/g, '');
  const sku = generateSKU(categoryCode, productCode, variantCode, color.code);

  const productColor = await prisma.productColor.create({
    data: {
      variantId: variant.id,
      colorId: color.id,
      sku,
      costPrice: product.costPrice,
    },
  });
  console.log(`  ✓ ProductColor: ${sku}`);

  // 4. Migrate stock records
  for (const stock of product.stocks) {
    await prisma.stockVariant.create({
      data: {
        productColorId: productColor.id,
        locationId: stock.locationId,
        quantity: stock.quantity,
      },
    });
    console.log(`    ✓ Stock: Location ${stock.locationId} = ${stock.quantity}`);
  }

  // 5. Mark product as migrated
  await prisma.product.update({
    where: { id: productId },
    data: { hasVariants: true },
  });
  console.log(`  ✓ Product marked as migrated`);
}

/**
 * Migrate all products
 */
async function migrateAllProducts() {
  console.log('Starting product migration to variant system...\n');

  const products = await prisma.product.findMany({
    where: {
      hasVariants: false,
      isActive: true,
    },
    select: { id: true },
  });

  console.log(`Found ${products.length} products to migrate\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const product of products) {
    try {
      await migrateProductToVariants(product.id);
      successCount++;
    } catch (error) {
      console.error(`  ✗ Error migrating product ${product.id}:`, error);
      errorCount++;
    }
  }

  console.log(`\n========================================`);
  console.log(`Migration complete!`);
  console.log(`  Success: ${successCount}`);
  console.log(`  Errors: ${errorCount}`);
  console.log(`========================================\n`);
}

/**
 * Verify migration results
 */
async function verifyMigration() {
  console.log('\nVerifying migration...\n');

  const products = await prisma.product.count({
    where: { hasVariants: true },
  });
  console.log(`Products migrated: ${products}`);

  const colors = await prisma.colorMaster.count();
  console.log(`Colors in master: ${colors}`);

  const variants = await prisma.productVariant.count();
  console.log(`Product variants: ${variants}`);

  const productColors = await prisma.productColor.count();
  console.log(`Product colors: ${productColors}`);

  const stockVariants = await prisma.stockVariant.count();
  console.log(`Stock variants: ${stockVariants}`);

  // Check SKU uniqueness
  const duplicateSkus = await prisma.productColor.groupBy({
    by: ['sku'],
    having: {
      sku: {
        _count: {
          gt: 1,
        },
      },
    },
  });

  if (duplicateSkus.length > 0) {
    console.log(`\n⚠ Warning: Found ${duplicateSkus.length} duplicate SKUs`);
  } else {
    console.log(`\n✓ All SKUs are unique`);
  }

  // Check stock consistency
  const oldStockTotal = await prisma.stock.aggregate({
    _sum: { quantity: true },
  });

  const newStockTotal = await prisma.stockVariant.aggregate({
    _sum: { quantity: true },
  });

  console.log(`\nStock totals:`);
  console.log(`  Old system: ${oldStockTotal._sum.quantity || 0}`);
  console.log(`  New system: ${newStockTotal._sum.quantity || 0}`);

  if (oldStockTotal._sum.quantity === newStockTotal._sum.quantity) {
    console.log(`  ✓ Stock quantities match`);
  } else {
    console.log(`  ⚠ Stock quantities don't match - investigation needed`);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    const args = process.argv.slice(2);
    const command = args[0];

    if (command === 'verify') {
      await verifyMigration();
    } else if (command === 'product' && args[1]) {
      await migrateProductToVariants(args[1]);
    } else {
      await migrateAllProducts();
      await verifyMigration();
    }
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
