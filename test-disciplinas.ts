import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const disciplinas = await prisma.disciplina.findMany({
    select: { nome: true },
    distinct: ['nome']
  });
  
  const nomes = disciplinas.map(d => d.nome).sort();
  console.log(nomes.slice(0, 50));
}

main().catch(console.error).finally(() => prisma.$disconnect());
