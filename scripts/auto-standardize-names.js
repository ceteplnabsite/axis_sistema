
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("--- INICIANDO PADRONIZAÇÃO DE DISCIPLINAS ---\n");

  const matrizes = await prisma.matrizCurricular.findMany();
  
  // Agrupar por nome normalizado (lowercase)
  const map = new Map();
  matrizes.forEach(m => {
    const key = m.nome.trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  });

  let totalMatrixUpdated = 0;
  let totalDisciplinasUpdated = 0;

  for (const [key, items] of map.entries()) {
    const uniqueNames = new Set(items.map(i => i.nome));
    if (uniqueNames.size > 1) {
      // Decidir o nome padrão (o mais frequente)
      const frequencies = {};
      items.forEach(i => {
        frequencies[i.nome] = (frequencies[i.nome] || 0) + 1;
      });

      const standardName = Object.entries(frequencies).sort((a, b) => b[1] - a[1])[0][0];

      console.log(`Padronizando "${key}" para "${standardName}"...`);

      for (const item of items) {
        if (item.nome !== standardName) {
          // 1. Atualizar na Matriz
          await prisma.matrizCurricular.update({
            where: { id: item.id },
            data: { nome: standardName }
          });
          totalMatrixUpdated++;

          // 2. Propagar para turmas
          const turmas = await prisma.turma.findMany({
            where: {
              cursoId: item.cursoId,
              serie: item.serie,
              anoLetivo: item.anoLetivo
            },
            select: { id: true }
          });

          if (turmas.length > 0) {
            const result = await prisma.disciplina.updateMany({
              where: {
                turmaId: { in: turmas.map(t => t.id) },
                nome: item.nome
              },
              data: { nome: standardName }
            });
            totalDisciplinasUpdated += result.count;
          }
        }
      }
    }
  }

  console.log(`\n✅ Padronização concluída!`);
  console.log(`- Itens da Matriz corrigidos: ${totalMatrixUpdated}`);
  console.log(`- Disciplinas em Turmas corrigidas: ${totalDisciplinasUpdated}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
