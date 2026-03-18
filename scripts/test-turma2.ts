import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const turma = await prisma.turma.findFirst({
    where: { nome: "1TACM1" },
    include: { estudantes: true }
  })
  console.log("Turma:", turma?.nome)
  console.log("Estudantes count:", turma?.estudantes?.length)
}
main().catch(console.error).finally(()=>prisma.$disconnect())
