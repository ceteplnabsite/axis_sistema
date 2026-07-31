const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const prova = await prisma.prova.findFirst({
    where: { tipo: 'SIMULADO' },
    include: { questoes: true }
  })
  console.log("Total questoes:", prova.questoes.length)
  console.log("Exemplo de questao:", prova.questoes[0])
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
