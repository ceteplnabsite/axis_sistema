const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const provas = await prisma.prova.findMany({
    where: { tipo: 'SIMULADO' },
    select: { id: true, codigo: true, titulo: true, unidade: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
    take: 10
  })
  
  console.table(provas)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
