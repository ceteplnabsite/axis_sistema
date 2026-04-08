
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matrizes = await (prisma.matrizCurricular).findMany({
    orderBy: { nome: 'asc' }
  });
  
  // Agrupar por nome para ver duplicatas ou variações
  const map = new Map();
  matrizes.forEach(m => {
    const key = m.nome.trim().toLowerCase();
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  });

  console.log("\n--- Variantes de nomes na Matriz (Diferenças de Casing/Espaço) ---\n");
  let found = false;
  for (const [key, items] of map.entries()) {
    const uniqueNames = new Set(items.map(i => i.nome));
    if (uniqueNames.size > 1) {
      found = true;
      console.log(`- Nome Base: "${key}"`);
      uniqueNames.forEach(n => console.log(`  * "${n}"`));
    }
  }

  if (!found) {
    console.log("✅ Todos os nomes de disciplinas com a mesma grafia base são idênticos na Matriz.");
  }

}

main().catch(console.error).finally(() => prisma.$disconnect());
