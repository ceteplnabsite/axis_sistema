const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const questoes = await prisma.questao.findMany({
    where: { unidade: "2" },
    include: { disciplinas: true }
  })
  
  const grouped = {}
  
  questoes.forEach(q => {
    const discKeys = q.disciplinas.map(d => d.id).sort().join(',')
    const key = `${q.professorId}_${discKeys}`
    
    if (!grouped[key]) {
      grouped[key] = []
    }
    grouped[key].push(q)
  })
  
  let updatedCount = 0;

  for (const key in grouped) {
    const qs = grouped[key]
    
    const hasSegundaChamada = qs.some(q => q.tipo === 'SEGUNDA CHAMADA')
    
    if (hasSegundaChamada) {
       console.log(`Skipping group ${key} because it already has SEGUNDA CHAMADA questions.`)
       continue;
    }
    
    qs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    
    const total = qs.length
    if (total <= 1) {
       continue;
    }
    
    const half = Math.floor(total / 2)
    const toChange = qs.slice(qs.length - half)
    
    for (const q of toChange) {
       await prisma.questao.update({
         where: { id: q.id },
         data: { tipo: 'SEGUNDA CHAMADA' }
       })
       updatedCount++;
    }
    console.log(`Group ${key}: total ${total}. Changed ${toChange.length} to SEGUNDA CHAMADA.`)
  }
  
  console.log(`Successfully updated ${updatedCount} questions to SEGUNDA CHAMADA.`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
