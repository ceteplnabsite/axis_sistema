require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Pegar todos os usuários que têm alguma questão no banco de dados (indicando que são professores)
  const users = await prisma.user.findMany({
    where: {
      questoes: {
        some: {} 
      }
    },
    include: {
      questoes: {
        select: {
          id: true,
          unidade: true
        }
      }
    }
  });

  const semQuestoesU2 = users.filter(u => {
    return !u.questoes.some(q => q.unidade === 'II' || q.unidade === '2' || q.unidade?.toLowerCase() === 'ii');
  });
  
  console.log(`Total de professores identificados: ${users.length}`);
  console.log(`Professores SEM questões na 2ª unidade: ${semQuestoesU2.length}`);
  console.log('--- Lista de Professores ---');
  semQuestoesU2.forEach(p => console.log(p.name || p.username || p.email));
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
