import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const d = await prisma.disciplina.findMany({
    where: { nome: { contains: 'Científica' } },
    select: { nome: true, id: true, turma: { select: { nome: true } } }
  });
  console.log("Disciplinas:", d);
}
main().catch(console.error).finally(() => prisma.$disconnect());
