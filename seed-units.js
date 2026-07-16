const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding standard units...');

  const standardUnits = [
    { name: 'Meters', abbreviation: 'm' },
    { name: 'Centimeters', abbreviation: 'cm' },
    { name: 'Yards', abbreviation: 'yd' },
    { name: 'Inches', abbreviation: 'in' },
    { name: 'Pieces', abbreviation: 'pcs' },
    { name: 'Kilograms', abbreviation: 'kg' },
    { name: 'Grams', abbreviation: 'g' },
    { name: 'Rolls', abbreviation: 'roll' },
    { name: 'Bundles', abbreviation: 'bdl' },
    { name: 'Boxes', abbreviation: 'box' }
  ];

  for (const u of standardUnits) {
    await prisma.unit.upsert({
      where: { abbreviation: u.abbreviation },
      update: {},
      create: u
    });
  }

  // Define some common conversions
  // 1 yd = 0.9144 m
  const yd = await prisma.unit.findUnique({ where: { abbreviation: 'yd' }});
  const m = await prisma.unit.findUnique({ where: { abbreviation: 'm' }});
  const inUnit = await prisma.unit.findUnique({ where: { abbreviation: 'in' }});
  const kg = await prisma.unit.findUnique({ where: { abbreviation: 'kg' }});
  const g = await prisma.unit.findUnique({ where: { abbreviation: 'g' }});

  if (yd && m) {
    await prisma.unitConversion.upsert({
      where: { fromUnitId_toUnitId: { fromUnitId: yd.id, toUnitId: m.id } },
      update: {},
      create: { fromUnitId: yd.id, toUnitId: m.id, factor: 0.9144 }
    });
    await prisma.unitConversion.upsert({
      where: { fromUnitId_toUnitId: { fromUnitId: m.id, toUnitId: yd.id } },
      update: {},
      create: { fromUnitId: m.id, toUnitId: yd.id, factor: 1.09361 }
    });
  }

  if (kg && g) {
    await prisma.unitConversion.upsert({
      where: { fromUnitId_toUnitId: { fromUnitId: kg.id, toUnitId: g.id } },
      update: {},
      create: { fromUnitId: kg.id, toUnitId: g.id, factor: 1000 }
    });
    await prisma.unitConversion.upsert({
      where: { fromUnitId_toUnitId: { fromUnitId: g.id, toUnitId: kg.id } },
      update: {},
      create: { fromUnitId: g.id, toUnitId: kg.id, factor: 0.001 }
    });
  }

  console.log('Successfully seeded units and standard conversions.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
