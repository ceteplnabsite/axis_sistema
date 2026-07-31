const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const provas = await prisma.prova.findMany({
    where: { tipo: 'SIMULADO' },
    select: { id: true, titulo: true, createdAt: true },
    orderBy: { createdAt: 'desc' }
  })
  console.log(provas)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
