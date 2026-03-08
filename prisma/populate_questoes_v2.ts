
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Populando banco de questões (5 por disciplina nas turmas)...')

  const user = await prisma.user.findFirst({ where: { isSuperuser: true } })
  if (!user) {
    console.log('❌ Usuário admin não encontrado.')
    return
  }

  const turmas = await prisma.turma.findMany({
    include: {
      disciplinas: true
    }
  })

  console.log(`📦 Encontradas ${turmas.length} turmas.`)

  const enunciados = [
    'Qual a importância fundamental desta matéria para a formação técnica?',
    'Sobre os conceitos básicos discutidos em sala, qual alternativa está correta?',
    'Analise a situação problema abaixo e escolha a melhor solução técnica:',
    'Qual destas definições melhor descreve o objetivo principal desta disciplina?',
    'Considerando as normas técnicas vigentes, como devemos proceder em casos de erro?'
  ]

  let totalCriadas = 0

  for (const turma of turmas) {
    console.log(`\n🔹 Processando turma: ${turma.nome}`)
    for (const disc of turma.disciplinas) {
      console.log(`   📖 Criando 5 questões para: ${disc.nome}`)
      
      for (let i = 0; i < 5; i++) {
        await prisma.questao.create({
          data: {
            enunciado: `[${disc.nome}] ${enunciados[i]} (Ref: ${turma.nome} - Q${i+1})`,
            alternativaA: 'Opção correta baseada nos estudos.',
            alternativaB: 'Opção incorreta para fins de distração.',
            alternativaC: 'Opção parcialmente correta, mas incompleta.',
            alternativaD: 'Nenhuma das alternativas anteriores.',
            alternativaE: 'Todas as alternativas estão corretas.',
            correta: 'A',
            dificuldade: i % 3 === 0 ? 'FACIL' : (i % 3 === 1 ? 'MEDIO' : 'DIFICIL'),
            status: 'APROVADA',
            professorId: user.id,
            disciplinas: {
              connect: [{ id: disc.id }]
            },
            turmas: {
              connect: [{ id: turma.id }]
            }
          }
        })
        totalCriadas++
      }
    }
  }

  console.log(`\n✨ Sucesso! ${totalCriadas} questões foram criadas e vinculadas corretamente.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
