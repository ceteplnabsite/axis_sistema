import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const areas = await prisma.areaConhecimento.findMany()
  console.log('Areas:', areas)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
