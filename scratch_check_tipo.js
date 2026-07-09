const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const t3tim3 = await prisma.turma.findFirst({ where: { nome: { contains: '3TIM3' } } });
  if (t3tim3) {
      const qs = await prisma.questao.findMany({
          where: {
              OR: [
                  { turmas: { some: { id: t3tim3.id } } },
                  { disciplinas: { some: { turmaId: t3tim3.id } } }
              ],
              tipo: 'RECUPERACAO'
          },
          include: {
              disciplinas: true
          }
      });
      console.log(`3TIM3 RECUPERACAO TOTAL: ${qs.length}`);
      qs.forEach(q => {
          console.log(`- Q: ${q.id}, Status: ${q.status}, Disciplinas: ${q.disciplinas.map(d => d.nome).join(', ')}`);
      });
  }
}
check().finally(() => prisma.$disconnect());
