const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const teams = await prisma.sportsTeam.findMany({
    where: { status: 'APPROVED' },
    include: { modality: true }
  });
  console.log("Approved teams:", teams.map(t => ({ id: t.id, name: t.nome, modality: t.modality?.nome })));

  const matches = await prisma.gameMatch.findMany();
  console.log("Matches:", matches);
}
check().finally(() => prisma.$disconnect());
