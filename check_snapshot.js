const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const prova = await prisma.prova.findUnique({
    where: { id: 'cms7s5k660001l204f3stotz5' }
  })
  
  console.log("Is array?", Array.isArray(prova.questoesSnapshot))
  console.log("Keys:", Object.keys(prova.questoesSnapshot || {}))
  if(!Array.isArray(prova.questoesSnapshot)) {
     console.log("Snapshot value:", JSON.stringify(prova.questoesSnapshot, null, 2))
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
