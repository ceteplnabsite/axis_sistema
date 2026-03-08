const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const questoes = await prisma.questao.findMany();
  let updatedCount = 0;
  
  for (const q of questoes) {
    const alts = [
      { id: 'A', text: q.alternativaA },
      { id: 'B', text: q.alternativaB },
      { id: 'C', text: q.alternativaC },
      { id: 'D', text: q.alternativaD },
      { id: 'E', text: q.alternativaE || '' } // Handle optional 'E'
    ];
    
    // Some questions might not have an E, let's only shuffle non-empty ones
    const validAlts = alts.filter(a => a.text && a.text.trim() !== '');
    
    const correctContent = alts.find(a => a.id === q.correta)?.text;
    if (!correctContent) continue;
    
    // Fisher-Yates
    for (let i = validAlts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [validAlts[i], validAlts[j]] = [validAlts[j], validAlts[i]];
    }
    
    const updateData = {};
    const letters = ['A', 'B', 'C', 'D', 'E'];
    
    for (let idx = 0; idx < letters.length; idx++) {
      const letter = letters[idx];
      const newAlt = validAlts[idx];
      
      if (newAlt) {
        updateData[`alternativa${letter}`] = newAlt.text;
        if (newAlt.text === correctContent) {
          updateData.correta = letter;
        }
      } else {
         updateData[`alternativa${letter}`] = null; // ensure empty if no valid answer
      }
    }
    
    await prisma.questao.update({
      where: { id: q.id },
      data: updateData
    });
    
    updatedCount++;
  }
  
  console.log('Successfully shuffled alternatives in DB for', updatedCount, 'questions.');
  
  const stats = await prisma.questao.groupBy({
    by: ['correta'],
    _count: { correta: true }
  });
  console.log(stats);
}

main().catch(console.error).finally(() => prisma.$disconnect());
