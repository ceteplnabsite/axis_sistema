
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Atualizando áreas de conhecimento para o novo padrão...')
  
  const novasAreas = [
    "Ciências da Natureza e suas Tecnologias",
    "Ciências Humanas e Articuladoras",
    "Formação Técnica e Profissional",
    "Linguagens, Códigos e suas Tecnologias",
    "Matemática e suas Tecnologias"
  ]

  // 1. Criar/Atualizar as novas áreas
  for (const nome of novasAreas) {
    await prisma.areaConhecimento.upsert({
      where: { nome },
      update: {},
      create: { nome }
    })
  }

  // 2. Opcional: Remover áreas antigas que não estão na lista (se não houver vínculos críticos)
  // Como é uma fase de configuração, vamos listar o que não bate
  const todasAreas = await prisma.areaConhecimento.findMany()
  const areasParaRemover = todasAreas.filter(a => !novasAreas.includes(a.nome))

  for (const area of areasParaRemover) {
    try {
      // Tentar remover apenas se não houver disciplinas vinculadas
      const vinculos = await prisma.disciplina.count({ where: { areaId: area.id } })
      if (vinculos === 0) {
        await prisma.areaConhecimento.delete({ where: { id: area.id } })
        console.log(`🗑️ Área antiga removida: ${area.nome}`)
      } else {
        console.log(`⚠️ Área "${area.nome}" mantida pois possui ${vinculos} disciplinas vinculadas.`)
      }
    } catch (e) {
      console.log(`❌ Erro ao tentar remover área ${area.nome}`)
    }
  }

  console.log('✅ Áreas de conhecimento atualizadas com sucesso!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
