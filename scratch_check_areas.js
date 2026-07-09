const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const areas = await prisma.areaConhecimento.findMany();
  console.log(areas);
}
check().finally(() => prisma.$disconnect());
