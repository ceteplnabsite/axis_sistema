const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const res = await prisma.responsavelSimulado.updateMany({
    where: {
      unidade: null
    },
    data: {
      unidade: 1
    }
  })
  console.log(`Updated ${res.count} records to unidade = 1.`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
