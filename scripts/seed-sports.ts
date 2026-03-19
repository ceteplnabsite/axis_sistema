
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const settings = await prisma.sportsSettings.upsert({
    where: { id: "global_config" },
    update: {},
    create: {
      id: "global_config",
      termsContent: "Para participar, os alunos devem manter média mínima de 6.0, frequência de 75% e comportamento exemplar. Aceito que minha data de nascimento e demais dados sejam utilizados para fins de organização esportiva.",
      minGrade: 6.0,
      minAttendance: 75.0,
      maxInfrequentPercent: 20.0,
      isOpen: true
    }
  })

  const modalities = [
    { nome: 'FUTSAL MASCULINO', minPlayers: 5, maxPlayers: 12 },
    { nome: 'FUTSAL FEMININO', minPlayers: 5, maxPlayers: 12 },
    { nome: 'VÔLEI MISTO', minPlayers: 6, maxPlayers: 10 },
    { nome: 'XADREZ INDIVIDUAL', minPlayers: 1, maxPlayers: 1 },
    { nome: 'TÊNIS DE MESA', minPlayers: 1, maxPlayers: 2 },
  ]

  for (const m of modalities) {
    await prisma.sportModality.upsert({
      where: { nome: m.nome },
      update: {},
      create: {
        nome: m.nome,
        minPlayers: m.minPlayers,
        maxPlayers: m.maxPlayers,
        isActive: true
      }
    })
  }
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
