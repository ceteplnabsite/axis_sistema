import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const studentName = "A" // Let's guess some substring
  const ocorrencias = await prisma.ocorrencia.findMany({
    where: {
      estudantes: {
        some: {
          nome: {
            contains: studentName,
            mode: 'insensitive'
          }
        }
      }
    },
    include: { estudantes: { select: { nome: true } } }
  })
  console.log("Filtered:", ocorrencias.length)
  
  const allOcorrencias = await prisma.ocorrencia.findMany({
    include: { estudantes: { select: { nome: true } } }
  })
  console.log("All:", allOcorrencias.length)
  if (allOcorrencias.length > 0) {
    console.log("Sample students:", allOcorrencias[0].estudantes)
  }
}
main().catch(console.error).finally(()=>prisma.$disconnect())
