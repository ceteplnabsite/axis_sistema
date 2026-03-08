
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const labs = [
    { nome: 'Laboratório de Informática 01', descricao: 'Equipado com 20 computadores e projetor.' },
    { nome: 'Laboratório de Informática 02', descricao: 'Equipado com 25 computadores.' },
    { nome: 'Laboratório de Ciências', descricao: 'Equipado com microscópios e bancadas.' },
    { nome: 'Laboratório de Enfermagem', descricao: 'Simuladores e equipamentos hospitalares.' },
  ]

  for (const lab of labs) {
    await prisma.laboratorio.upsert({
      where: { nome: lab.nome },
      update: {},
      create: lab
    })
  }

  console.log('Laboratórios semeados com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
