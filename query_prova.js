const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const provas = await prisma.prova.findMany({
    where: { codigo: 660 },
    include: { questoes: true }
  })
  
  console.log("Found provas:", provas.length)
  for(let p of provas) {
     console.log(`Prova ${p.titulo} (ID: ${p.id}) tem ${p.questoes.length} questoes, questoesSnapshot type: ${typeof p.questoesSnapshot}, value: ${p.questoesSnapshot}`)
  }
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
