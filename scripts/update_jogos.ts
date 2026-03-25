import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Atualizando configurações dos Jogos...')

  // 1. Atualizar Configurações Gerais
  await prisma.sportsSettings.upsert({
    where: { id: "global_config" },
    update: {
      minGrade: 6.0,
      minAttendance: 75.0, // Giovana prof mentioned 75% of subjects, but usually we have a general attendance too.
      termsContent: "Para participar, os alunos devem manter média mínima de 6.0 em pelo menos 75% das disciplinas. Inscrições Mistas permitem até 2 membros do sexo oposto. Baleado é uma modalidade Feminino Misto. Aceito que meus dados sejam utilizados para fins de organização esportiva."
    },
    create: {
      id: "global_config",
      minGrade: 6.0,
      minAttendance: 75.0,
      isOpen: true,
      termsContent: "Para participar, os alunos devem manter média mínima de 6.0 em pelo menos 75% das disciplinas. Inscrições Mistas permitem até 2 membros do sexo oposto. Baleado é uma modalidade Feminino Misto. Aceito que meus dados sejam utilizados para fins de organização esportiva."
    }
  })

  // 2. Atualizar/Criar Modalidades
  const modalities = [
    { nome: 'Futsal', minPlayers: 5, maxPlayers: 10 },
    { nome: 'Basquete', minPlayers: 5, maxPlayers: 10 },
    { nome: 'Baleado', minPlayers: 8, maxPlayers: 10 },
    { nome: 'Vôlei', minPlayers: 6, maxPlayers: 12 }
  ]

  for (const m of modalities) {
    // Vamos procurar por nome similar para atualizar se já existirem versões (Ex: Futsal Masc, Futsal Fem)
    const existing = await prisma.sportModality.findMany({
      where: { nome: { contains: m.nome, mode: 'insensitive' } }
    })

    if (existing.length > 0) {
      for (const ex of existing) {
        await prisma.sportModality.update({
          where: { id: ex.id },
          data: { minPlayers: m.minPlayers, maxPlayers: m.maxPlayers }
        })
        console.log(`✅ Atualizada modalidade: ${ex.nome} (${m.minPlayers}-${m.maxPlayers})`)
      }
    } else {
      await prisma.sportModality.create({
        data: { ...m, isActive: true }
      })
      console.log(`✅ Criada modalidade: ${m.nome} (${m.minPlayers}-${m.maxPlayers})`)
    }
  }

  console.log('✨ Ajustes concluídos!')
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect())
