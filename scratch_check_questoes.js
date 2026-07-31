const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const questoes = await prisma.questao.findMany({
    where: { unidade: "2" },
    include: { professor: true, disciplinas: true }
  })
  
  const grouped = {}
  questoes.forEach(q => {
    const prof = q.professor.name || q.professor.username
    const disc = q.disciplinas.map(d => d.nome).join(', ')
    const key = `${prof} - ${disc}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(q)
  })

  console.log(`Total questoes Unidade 2: ${questoes.length}`)
  for (const key in grouped) {
    const qs = grouped[key]
    const normalCount = qs.filter(q => q.tipo === 'NORMAL').length
    const scCount = qs.filter(q => q.tipo === 'SEGUNDA CHAMADA').length
    const nullCount = qs.filter(q => !q.tipo).length
    console.log(`${key}: ${qs.length} questões (Normal: ${normalCount}, 2ª Chamada: ${scCount}, Null/Outro: ${nullCount})`)
  }
}
main().catch(console.error).finally(() => prisma.$disconnect())
