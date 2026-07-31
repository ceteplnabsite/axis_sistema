const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const prova = await prisma.prova.findFirst({ where: { titulo: { contains: 'DISCIPLINAS TÉCNICAS - 3TIM2' } }, include: { questoes: true } });
  if (!prova) return console.log('Prova not found');
  let gabarito = null;
  if (prova.questoesSnapshot) {
    let qs = typeof prova.questoesSnapshot === 'string' ? JSON.parse(prova.questoesSnapshot) : prova.questoesSnapshot;
    qs = Array.isArray(qs) ? qs : (qs.questoes || []);
    gabarito = qs.map((q, i) => ({ correta: q.correta }));
  } else if (prova.questoes) {
    gabarito = prova.questoes.map((q, i) => ({ correta: q.correta }));
  }
  console.log('GABARITO LENGTH:', gabarito ? gabarito.length : 'null');
}
main();
