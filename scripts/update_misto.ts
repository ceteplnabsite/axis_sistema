import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.sportModality.updateMany({
    where: {
      OR: [
        { nome: { contains: 'misto', mode: 'insensitive' } },
        { nome: { contains: 'baleado', mode: 'insensitive' } }
      ]
    },
    data: { isMisto: true }
  })
  console.log('Update done.')
}

main().catch(console.error).finally(() => prisma.$disconnect())
