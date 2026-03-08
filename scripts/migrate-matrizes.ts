import { PrismaClient } from '@prisma/client'
import { CURSOS } from '../src/config/constants'

const prisma = new PrismaClient()

async function main() {
  const matrizes = await prisma.matrizCurricular.findMany();
  const oldCursos = await prisma.curso.findMany();
  
  let updated = 0;
  for (const item of matrizes) {
      const oldCurso = oldCursos.find(c => c.id === item.cursoId);
      if (oldCurso) {
          // Find best match in CURSOS currently
          const bestMatch = CURSOS.find(c => oldCurso.nome.toLowerCase().includes(c.nome.toLowerCase().replace('técnico em ', '')));
          if (bestMatch) {
              await prisma.matrizCurricular.update({
                  where: { id: item.id },
                  data: { cursoId: bestMatch.id }
              });
              updated++;
          }
      }
  }
  console.log(`Updated ${updated} items in Matriz Curricular`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
