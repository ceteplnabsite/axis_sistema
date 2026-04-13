import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const turmasWithEmptyCurso = await prisma.turma.findMany({
    where: { 
      OR: [
        { curso: null },
        { curso: '' }
      ]
    },
    take: 5,
    select: { nome: true, curso: true, cursoId: true }
  })
  
  console.log('Turmas com curso vazio:', JSON.stringify(turmasWithEmptyCurso, null, 2))
  
  const allCursos = await prisma.curso.findMany({ select: { id: true, nome: true } })
  console.log('Cursos disponíveis:', JSON.stringify(allCursos, null, 2))
}

main().finally(() => prisma.$disconnect())
