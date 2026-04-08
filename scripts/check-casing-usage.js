
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const matrizes = await prisma.matrizCurricular.findMany();
  
  let upperCount = 0;
  let titleCount = 0;
  let lowerCount = 0;

  matrizes.forEach(m => {
    if (m.nome === m.nome.toUpperCase() && m.nome !== m.nome.toLowerCase()) {
      upperCount++;
    } else if (m.nome[0] === m.nome[0].toUpperCase() && m.nome.slice(1) === m.nome.slice(1).toLowerCase()) {
      titleCount++;
    } else if (m.nome === m.nome.toLowerCase()) {
      lowerCount++;
    }
  });

  console.log(`\nFrequência de Estilos de Nomes na Matriz:`);
  console.log(`- UPPERCASE: ${upperCount}`);
  console.log(`- Title Case/Mixed: ${titleCount}`);
  console.log(`- lowercase: ${lowerCount}`);
  console.log(`- Total: ${matrizes.length}\n`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
