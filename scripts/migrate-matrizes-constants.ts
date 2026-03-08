import { PrismaClient } from '@prisma/client'

const CURSOS = [
  { id: "informatica", nome: "Técnico em Informática", search: "informática" },
  { id: "enfermagem", nome: "Técnico em Enfermagem", search: "enfermagem" },
  { id: "administracao", nome: "Técnico em Administração", search: "administração" },
  { id: "agropecuaria", nome: "Técnico em Agropecuária", search: "agro" },
  { id: "meio_ambiente", nome: "Técnico em Meio Ambiente", search: "ambiente" },
  { id: "edificacoes", nome: "Técnico em Edificações", search: "edificações" },
  { id: "logistica", nome: "Técnico em Logística", search: "logística" },
  { id: "seguranca_trabalho", nome: "Técnico em Segurança do Trabalho", search: "segurança" },
  { id: "nutricao_dietetica", nome: "Técnico em Nutrição e Dietética", search: "nutrição" },
  { id: "quimica", nome: "Técnico em Química", search: "química" },
]

const prisma = new PrismaClient()

async function main() {
  const matrizes = await prisma.matrizCurricular.findMany();
  const oldCursos = await prisma.curso.findMany(); // Assuming curso table still exists in DB data
  
  let updated = 0;
  for (const item of matrizes) {
      const oldCurso = oldCursos.find(c => c.id === item.cursoId);
      if (oldCurso) {
          const matched = CURSOS.find(c => oldCurso.nome.toLowerCase().includes(c.search.toLowerCase()));
          if (matched) {
              await prisma.matrizCurricular.update({
                  where: { id: item.id },
                  data: { cursoId: matched.id }
              });
              updated++;
          }
      }
  }
  console.log(`Updated ${updated} items in Matriz Curricular`);
  
  const turmas = await prisma.turma.findMany();
  let updatedTurmas = 0;
  for (const item of turmas) {
      if (!item.cursoId || !item.curso) continue;
      const matched = CURSOS.find(c => item.curso?.toLowerCase().includes(c.search.toLowerCase()));
      if (matched && item.cursoId !== matched.id) {
          await prisma.turma.update({
              where: { id: item.id },
              data: { cursoId: matched.id }
          });
          updatedTurmas++;
      }
  }
  console.log(`Updated ${updatedTurmas} turmas`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
