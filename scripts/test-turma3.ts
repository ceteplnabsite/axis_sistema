import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  const turmas = await prisma.turma.findMany({
    where: { nome: "1TACM1" },
    include: { _count: { select: { estudantes: true } } }
  })
  console.log("Turmas found:", JSON.stringify(turmas, null, 2))
}
main().catch(console.error).finally(()=>prisma.$disconnect())
