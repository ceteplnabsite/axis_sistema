
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matrizes = await prisma.matrizCurricular.findMany();
  
  const countByLower = new Map();
  matrizes.forEach(m => {
    const key = m.nome.trim().toLowerCase();
    if (!countByLower.has(key)) countByLower.set(key, {});
    const counts = countByLower.get(key);
    counts[m.nome] = (counts[m.nome] || 0) + 1;
  });

  console.log("\nTop Disciplinas e suas Variações de Nome:");
  const entries = Array.from(countByLower.entries()).slice(0, 20); // Just top 20 base names
  entries.forEach(([key, variations]) => {
    console.log(`- "${key}":`);
    Object.entries(variations).forEach(([name, count]) => {
      console.log(`  * "${name}" (${count} occurrences)`);
    });
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
