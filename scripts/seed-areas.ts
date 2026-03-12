import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const areas = [
  { id: 'formacao-tecnica', nome: 'Formação Técnica e Profissional' },
  { id: 'ciencias-natureza', nome: 'Ciências da Natureza e suas Tecnologias' },
  { id: 'ciencias-aplicadas', nome: 'Ciências da Natureza e Aplicadas' },
  { id: 'linguagens', nome: 'Linguagens, Códigos e suas Tecnologias' },
  { id: 'matematica', nome: 'Matemática e suas Tecnologias' },
]

async function main() {
  console.log('📚 Cadastrando Áreas de Conhecimento...\n')

  for (const area of areas) {
    const existing = await prisma.areaConhecimento.findFirst({
      where: { nome: area.nome }
    })

    if (existing) {
      console.log(`⏭️  Já existe: ${area.nome}`)
      continue
    }

    const criada = await prisma.areaConhecimento.create({
      data: { id: area.id, nome: area.nome }
    })
    console.log(`✅ Criada: ${criada.nome} (id: ${criada.id})`)
  }

  console.log('\n✨ Concluído!')
}

main()
  .catch((e) => {
    console.error('❌ Erro:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
