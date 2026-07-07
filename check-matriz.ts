import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const m = await prisma.matrizCurricular.findMany({
    where: { nome: { contains: 'Científica' } },
    select: { nome: true, id: true, cursoId: true }
  });
  console.log("Matrizes:", m);
}
main().catch(console.error).finally(() => prisma.$disconnect());
