const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  console.log('Checking users in database...')
  
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      isActive: true,
      location: true,
      locationId: true,
    },
  })
  
  console.log(`Found ${users.length} users:`)
  console.log(JSON.stringify(users, null, 2))
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
