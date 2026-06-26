const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function cleanData() {
  console.log('Cleaning old data...')
  
  await prisma.cartItem.deleteMany().catch(e => console.error('cartItem:', e.message))
  await prisma.cart.deleteMany().catch(e => console.error('cart:', e.message))
  
  await prisma.returnItem.deleteMany().catch(e => console.error('returnItem:', e.message))
  await prisma.return.deleteMany().catch(e => console.error('return:', e.message))
  
  await prisma.orderItem.deleteMany().catch(e => console.error('orderItem:', e.message))
  await prisma.customerOrder.deleteMany().catch(e => console.error('customerOrder:', e.message))

  await prisma.saleItem.deleteMany().catch(e => console.error('saleItem:', e.message))
  await prisma.sale.deleteMany().catch(e => console.error('sale:', e.message))
  
  await prisma.stockTransferItem.deleteMany().catch(e => console.error('stockTransferItem:', e.message))
  await prisma.stockTransfer.deleteMany().catch(e => console.error('stockTransfer:', e.message))
  
  await prisma.stockAdjustment.deleteMany().catch(e => console.error('stockAdjustment:', e.message))
  await prisma.stockIn.deleteMany().catch(e => console.error('stockIn:', e.message))
  
  await prisma.stock.deleteMany().catch(e => console.error('stock:', e.message))
  
  await prisma.productVariant.deleteMany().catch(e => console.error('productVariant:', e.message))
  await prisma.product.deleteMany().catch(e => console.error('product:', e.message))
  
  await prisma.category.deleteMany().catch(e => console.error('category:', e.message))
  await prisma.location.deleteMany().catch(e => console.error('location:', e.message))
  
  console.log('Old data cleaned!')
}

cleanData()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
