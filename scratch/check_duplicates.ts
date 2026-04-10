
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const turmas = await prisma.turma.findMany({
    where: { nome: '3TIM1' },
    include: {
      _count: {
        select: {
          questoes: true,
          estudantes: true,
          disciplinas: true,
        }
      }
    }
  })

  console.log('--- TURMAS ENCONTRADAS (3TIM1) ---')
  turmas.forEach((t, i) => {
    console.log(`Turma ${i + 1}:`)
    console.log(`  ID: ${t.id}`)
    console.log(`  Disciplinas: ${t._count.disciplinas}`)
    console.log(`  Questões: ${t._count.questoes}`)
    console.log(`  Estudantes: ${t._count.estudantes}`)
    console.log(`  Série: ${t.serie}`)
    console.log('---------------------------')
  })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
