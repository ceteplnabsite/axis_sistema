const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const nomes = [
  "Ana Clara Silva", "Bruno Sousa", "Carlos Eduardo Lima", "Daniela Oliveira",
  "Eduardo Ferreira", "Fernanda Alves", "Gabriel Santos", "Helena Costa",
  "Igor Pereira", "Julia Carvalho", "Lucas Rodrigues", "Mariana Ribeiro",
  "Nicolas Gomes", "Olivia Mendes", "Pedro Henrique Martins"
];

const statuses = [
  'APROVADO', 'RECUPERACAO', 'DESISTENTE', 'APROVADO_RECUPERACAO',
  'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'
];

async function main() {
  const turma = await prisma.turma.findFirst({
    where: { nome: '1TTIM2' },
    include: { disciplinas: true, estudantes: true }
  });

  if (!turma) {
    console.log("Turma 1TTIM2 não encontrada.");
    return;
  }

  // Opcional: deletar os estudantes atuais para não duplicar, caso o usuário já tenha criado algum vazio
  if (turma.estudantes.length > 0) {
    console.log("Deletando estudantes existentes da 1TTIM2 para recriar populados...");
    await prisma.estudante.deleteMany({ where: { turmaId: turma.id }});
  }

  console.log("Criando 15 estudantes com notas para", turma.disciplinas.length, "disciplinas...");

  for (let i = 0; i < nomes.length; i++) {
    const matricula = `20261TTIM200${i + 1}`;
    
    // Create Student
    const estudante = await prisma.estudante.create({
      data: {
        matricula,
        nome: nomes[i],
        turmaId: turma.id
      }
    });

    // Create Note records for each discipline
    const notasCriar = [];
    
    for (const disc of turma.disciplinas) {
      // Randomly pick a performance profile for this discipline
      const isGood = Math.random() > 0.4; // 60% chance of being "good"
      const isTerrible = Math.random() > 0.8; // 20% chance of being terrible (desistente/reprovado)
      
      let n1, n2, n3, final, status;

      if (isTerrible) {
          n1 = parseFloat((Math.random() * 3).toFixed(1));
          n2 = parseFloat((Math.random() * 3).toFixed(1));
          n3 = null;
          final = n1 + n2;
          status = 'DESISTENTE';
      } else if (isGood) {
          n1 = parseFloat((6 + Math.random() * 4).toFixed(1));
          n2 = parseFloat((6 + Math.random() * 4).toFixed(1));
          n3 = parseFloat((6 + Math.random() * 4).toFixed(1));
          final = parseFloat(((n1 + n2 + n3) / 3).toFixed(1));
          status = 'APROVADO';
      } else {
          // Mid-range / Recovery logic
          n1 = parseFloat((3 + Math.random() * 4).toFixed(1));
          n2 = parseFloat((4 + Math.random() * 4).toFixed(1));
          n3 = parseFloat((3 + Math.random() * 4).toFixed(1));
          let avg = parseFloat(((n1 + n2 + n3) / 3).toFixed(1));
          
          if (avg >= 6) {
              final = avg;
              status = 'APROVADO';
          } else {
              // Went to recovery
              const rec = parseFloat((5 + Math.random() * 4).toFixed(1));
              if (rec >= 6) {
                  final = rec;
                  status = 'APROVADO_RECUPERACAO';
              } else {
                  // Conselho ou Dependencia
                  final = rec;
                  status = Math.random() > 0.5 ? 'APROVADO_CONSELHO' : 'RECUPERACAO';
              }
          }
      }

      notasCriar.push({
        estudanteId: estudante.matricula,
        disciplinaId: disc.id,
        nota1: n1,
        nota2: n2,
        nota3: n3,
        nota: final,
        status: status,
      });
    }

    await prisma.notaFinal.createMany({
      data: notasCriar
    });
  }

  console.log("Turma 1TTIM2 populada com maestria!");
}

main().catch(console.error).finally(() => prisma.$disconnect());
