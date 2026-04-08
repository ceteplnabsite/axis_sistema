
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const turmas = await prisma.turma.findMany({
      include: {
        disciplinas: true
      }
    });

    const matrizes = await prisma.matrizCurricular.findMany();

    console.log(`\n--- RELATÓRIO DE INCONSISTÊNCIAS ---`);
    console.log(`Turmas totais: ${turmas.length}`);
    console.log(`Matrizes totais: ${matrizes.length}\n`);

    let totalMatches = 0;
    
    for (const turma of turmas) {
      const matrizItens = matrizes.filter(m => 
        m.cursoId === (turma.cursoId || null) && 
        m.serie === (turma.serie || null) && 
        m.anoLetivo === (turma.anoLetivo || null)
      );

      if (matrizItens.length === 0) continue;

      let foundInconsistencyInTurma = false;

      for (const disc of turma.disciplinas) {
        // Encontra um item na matriz que tenha o mesmo nome (ignorando maiúsculas/minúsculas) mas escrita diferente
        const match = matrizItens.find(m => 
          m.nome.trim().toLowerCase() === disc.nome.trim().toLowerCase() && 
          m.nome.trim() !== disc.nome.trim()
        );

        if (match) {
          if (!foundInconsistencyInTurma) {
            console.log(`Turma: ${turma.nome} (${turma.curso || 'N/A'} ${turma.serie || 'N/A'})`);
            foundInconsistencyInTurma = true;
          }
          console.log(`  - "${disc.nome}" (ID: ${disc.id}) -> Sugestão: "${match.nome}"`);
          totalMatches++;
        }
      }
    }

    if (totalMatches === 0) {
      console.log("✅ Nenhuma inconsistência de escrita encontrada entre Turmas e Matrizes.");
    } else {
      console.log(`\n🛑 Total de inconsistências: ${totalMatches}`);
    }

  } catch (err) {
    console.error("ERRO:", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
