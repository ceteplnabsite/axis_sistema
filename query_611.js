const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const prova = await prisma.prova.findFirst({
    where: { codigo: 611 }
  })
  
  console.log("Prova 611:", prova.titulo, "CreatedAt:", prova.createdAt)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
