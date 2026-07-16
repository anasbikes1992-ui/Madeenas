const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const units = await prisma.unit.findMany();
  console.log("Units in DB:", units);
}

main().finally(() => prisma.$disconnect());
