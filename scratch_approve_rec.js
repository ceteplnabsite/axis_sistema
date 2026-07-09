const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function approve() {
  const result = await prisma.questao.updateMany({
      where: {
          tipo: 'RECUPERACAO',
          status: 'PENDENTE'
      },
      data: {
          status: 'APROVADA'
      }
  });
  console.log(`Approved ${result.count} questions.`);
}
approve().finally(() => prisma.$disconnect());
