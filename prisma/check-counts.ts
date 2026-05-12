import 'dotenv/config'
import { PrismaClient } from '@prisma/client'

const p = new PrismaClient()

async function main() {
  const cats = await p.category.count()
  const prods = await p.product.count()
  const stocks = await p.stock.count()
  const catList = await p.category.findMany({ select: { name: true, slug: true } })
  console.log(`Categories: ${cats} | Products: ${prods} | Stock records: ${stocks}`)
  console.log('Category list:', catList.map(c => c.name).join(', '))
  const sample = await p.product.findMany({ select: { sku: true, name: true }, orderBy: { createdAt: 'desc' }, take: 5 })
  console.log('Latest 5 products:', sample.map(p => p.sku + ':' + p.name).join(', '))
}

main().finally(() => p.$disconnect())
