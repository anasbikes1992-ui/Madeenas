const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const locations = await prisma.location.findMany()
  console.log(JSON.stringify(locations, null, 2))
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
