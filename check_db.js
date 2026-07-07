const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const q = await prisma.questao.findFirst({
    include: {
      disciplina: true,
      turmas: true
    }
  });
  console.log(JSON.stringify(q, null, 2));
}
check();
