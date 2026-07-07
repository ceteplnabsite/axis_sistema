import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();
const jsonPath = path.join(process.cwd(), 'mapeamento_disciplinas.json');

function levenshtein(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  const matrix = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          Math.min(matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1) // deletion
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function normalizeStr(str: string): string {
  let s = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
  s = s.replace(/\bproj\b/g, "projeto");
  s = s.replace(/\badmin\b/g, "administracao");
  s = s.replace(/\badm\b/g, "administracao");
  s = s.replace(/\s+/g, ' ').trim();
  return s;
}

async function generateMapping() {
  console.log("Buscando disciplinas únicas no banco de dados...");
  const disciplinas = await prisma.disciplina.findMany({ select: { nome: true }, distinct: ['nome'] });
  const horarios = await prisma.horarioAula.findMany({ select: { disciplina: true }, distinct: ['disciplina'] });
  const planos = await prisma.planoEnsino.findMany({ select: { disciplinaNome: true }, distinct: ['disciplinaNome'] });
  const reservas = await prisma.reservaLaboratorio.findMany({ select: { disciplina: true }, distinct: ['disciplina'] });
  const matrizes = await prisma.matrizCurricular.findMany({ select: { nome: true }, distinct: ['nome'] });

  const allNamesSet = new Set<string>();
  disciplinas.forEach(d => allNamesSet.add(d.nome));
  horarios.forEach(h => allNamesSet.add(h.disciplina));
  planos.forEach(p => allNamesSet.add(p.disciplinaNome));
  reservas.forEach(r => { if (r.disciplina) allNamesSet.add(r.disciplina); });
  matrizes.forEach(m => allNamesSet.add(m.nome));

  const allNames = Array.from(allNamesSet).sort();
  
  const mapping: Record<string, string[]> = {};
  const processed = new Set<string>();

  for (let i = 0; i < allNames.length; i++) {
    const nomeA = allNames[i];
    if (processed.has(nomeA)) continue;

    const group = [nomeA];
    const normA = normalizeStr(nomeA);

    for (let j = i + 1; j < allNames.length; j++) {
      const nomeB = allNames[j];
      if (processed.has(nomeB)) continue;

      const normB = normalizeStr(nomeB);
      
      const isSub = (normA.includes(normB) || normB.includes(normA)) && Math.abs(normA.length - normB.length) < 15;
      const isUan = (normA.includes("uan") || normA.includes("alimentacao e nutricao")) && (normB.includes("uan") || normB.includes("alimentacao e nutricao")) && normA.includes("administracao") && normB.includes("administracao");
      const isSim = levenshtein(normA, normB) <= 3;
      
      if (isSub || isSim || isUan) {
        if (normA.length > 5 && normB.length > 5) {
           group.push(nomeB);
           processed.add(nomeB);
        }
      }
    }

    if (group.length > 1) {
      const canonical = group.reduce((a, b) => a.length > b.length ? a : b);
      const others = group.filter(n => n !== canonical);
      mapping[canonical] = others;
    }
  }

  // Pre-mapping from known visual issues in the user's screenshot
  if (!mapping["Administração das Unidades de Alimentação e Nutrição (UAN)"]) {
     mapping["Administração das Unidades de Alimentação e Nutrição (UAN)"] = [];
  }
  
  const ensureMapped = (canonical: string, others: string[]) => {
      if (!mapping[canonical]) mapping[canonical] = [];
      for (const other of others) {
          if (!mapping[canonical].includes(other)) {
              mapping[canonical].push(other);
          }
      }
  };

  ensureMapped("Administração das Unidades de Alimentação e Nutrição (UAN)", [
      "Administração UAN",
      "Administração de Unidades de Alimentação e Nutrição"
  ]);

  ensureMapped("Análise e Projeto de Sistemas", [
      "Análise e Proj de Sistema"
  ]);

  ensureMapped("Algoritmos e Linguagem de Programação", [
      // Just in case there are variations
  ]);

  ensureMapped("Anatomia e Fisiologia em Nutrição", [
      "Anatomofisiologia" // From screenshot they are sometimes grouped or similar
  ]);

  ensureMapped("Arte", [
      "Artes"
  ]);

  // Clean empty variations
  for (const k of Object.keys(mapping)) {
      if (mapping[k].length === 0) delete mapping[k];
  }

  fs.writeFileSync(jsonPath, JSON.stringify(mapping, null, 2));
  console.log(`\nMapeamento gerado em ${jsonPath}`);
  console.log("Por favor, revise o arquivo JSON. Deixe a chave como o 'Nome Correto' e os valores do array como as 'Variações Erradas' a serem substituídas.");
}

async function applyMapping() {
  if (!fs.existsSync(jsonPath)) {
    console.error("Arquivo de mapeamento não encontrado. Rode sem --apply primeiro.");
    return;
  }

  const mappingRaw = fs.readFileSync(jsonPath, 'utf-8');
  const mapping: Record<string, string[]> = JSON.parse(mappingRaw);

  console.log("Iniciando atualização no banco de dados...");
  
  let totalDisc = 0;
  let totalHor = 0;
  let totalPlan = 0;
  let totalRes = 0;
  let totalMatriz = 0;

  for (const [canonical, variations] of Object.entries(mapping)) {
    if (variations.length === 0) continue;

    console.log(`Atualizando para -> ${canonical}`);
    
    totalDisc += (await prisma.disciplina.updateMany({
      where: { nome: { in: variations } },
      data: { nome: canonical }
    })).count;

    totalHor += (await prisma.horarioAula.updateMany({
      where: { disciplina: { in: variations } },
      data: { disciplina: canonical }
    })).count;

    totalPlan += (await prisma.planoEnsino.updateMany({
      where: { disciplinaNome: { in: variations } },
      data: { disciplinaNome: canonical }
    })).count;

    totalRes += (await prisma.reservaLaboratorio.updateMany({
      where: { disciplina: { in: variations } },
      data: { disciplina: canonical }
    })).count;

    try {
      totalMatriz += (await prisma.matrizCurricular.updateMany({
        where: { nome: { in: variations } },
        data: { nome: canonical }
      })).count;
    } catch (e: any) {
      if (e.code === 'P2002') {
        const records = await prisma.matrizCurricular.findMany({ where: { nome: { in: variations } } });
        for (const record of records) {
          try {
            await prisma.matrizCurricular.update({
              where: { id: record.id },
              data: { nome: canonical }
            });
            totalMatriz++;
          } catch (err: any) {
            if (err.code === 'P2002') {
              await prisma.matrizCurricular.delete({ where: { id: record.id } });
            }
          }
        }
      } else {
        throw e;
      }
    }
  }

  console.log("\nAtualização concluída!");
  console.log(`Disciplinas alteradas: ${totalDisc}`);
  console.log(`Horários alterados: ${totalHor}`);
  console.log(`Planos de Ensino alterados: ${totalPlan}`);
  console.log(`Reservas de Lab alteradas: ${totalRes}`);
  console.log(`Matrizes Curriculares alteradas: ${totalMatriz}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--apply')) {
    await applyMapping();
  } else {
    await generateMapping();
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
