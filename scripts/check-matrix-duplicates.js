
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matrizes = await prisma.matrizCurricular.findMany({
    orderBy: { nome: 'asc' }
  });
  
  const map = new Map();
  matrizes.forEach(m => {
    const key = `${m.cursoId}-${m.serie}-${m.anoLetivo}-${m.nome.trim().toLowerCase()}`;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(m);
  });

  console.log("\n--- Duplicatas na Mesma Matriz (Casing diferente) ---\n");
  let found = false;
  for (const [key, items] of map.entries()) {
    if (items.length > 1) {
      found = true;
      console.log(`Chave: ${key}`);
      items.forEach(i => console.log(`  * ID: ${i.id}, Nome: "${i.nome}"`));
    }
  }

  if (!found) {
    console.log("✅ Nenhuma duplicata de casing na mesma matriz encontrada.");
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
