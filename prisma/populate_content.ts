
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Iniciando associação de professores e criação de conteúdo...')

  // 1. Obter professores reais
  const professores = await prisma.user.findMany({
    where: {
      OR: [
        { username: { contains: '.prof' } },
        { email: { contains: 'andressamirella' } }
      ]
    }
  })

  if (professores.length === 0) {
    console.log('❌ Nenhum professor encontrado. Crie professores primeiro.')
    return
  }

  // 2. Obter todas as disciplinas das turmas reais
  const turmas = await prisma.turma.findMany({
    include: {
      disciplinas: true
    }
  })

  console.log(`👨‍🏫 Associando ${professores.length} professores a disciplinas em ${turmas.length} turmas...`)

  for (const turma of turmas) {
    for (const disc of turma.disciplinas) {
      // Pick a random professor for this discipline
      const prof = professores[Math.floor(Math.random() * professores.length)]
      
      await prisma.disciplina.update({
        where: { id: disc.id },
        data: {
          usuariosPermitidos: {
            connect: [{ id: prof.id }]
          }
        }
      })

      // 3. Criar Planos de Ensino
      console.log(`   📝 Criando planos para: ${disc.nome} (${turma.nome})`)
      
      const planosData = [
        {
          inicio: new Date('2026-03-01'),
          fim: new Date('2026-03-15'),
          indicadores: 'Interpretar textos e identificar ideias centrais.',
          conteudos: 'Análise sintática e interpretação de texto contemporâneo.',
          metodologias: 'Debates em sala e atividades práticas de escrita.',
          recursos: 'Livros didáticos, tablet e sala de vídeo.',
          avaliacao: 'Produção textual individual.'
        },
        {
          inicio: new Date('2026-03-16'),
          fim: new Date('2026-03-31'),
          indicadores: 'Resolver problemas complexos utilizando lógica dedutiva.',
          conteudos: 'Lógica matemática e estruturas de controle.',
          metodologias: 'Resolução de desafios em laboratório.',
          recursos: 'Laboratório de informática e software educativo.',
          avaliacao: 'Projeto prático em grupo.'
        }
      ]

      for (const plano of planosData) {
        await prisma.planoEnsino.create({
          data: {
            disciplinaNome: disc.nome,
            professorId: prof.id,
            periodoInicio: plano.inicio,
            periodoFim: plano.fim,
            indicadores: plano.indicadores,
            conteudos: plano.conteudos,
            metodologias: plano.metodologias,
            recursos: plano.recursos,
            avaliacao: plano.avaliacao,
            turmas: {
              connect: [{ id: turma.id }]
            }
          }
        })
      }
    }
  }

  // 4. Popular Banco de Questões
  console.log('❓ Populando banco de questões...')
  const questoesExemplo = [
    {
      enunciado: 'Qual é a principal função de um Plano de Ensino Quinzenal no Áxis?',
      alternativaA: 'Controlar a frequência dos alunos.',
      alternativaB: 'Organizar as atividades pedagógicas de forma estruturada para o período.',
      alternativaC: 'Gerar apenas boletos de pagamento.',
      alternativaD: 'Substituir o professor em sala.',
      alternativaE: 'Nenhuma das alternativas.',
      correta: 'B',
      dificuldade: 'FACIL'
    },
    {
      enunciado: 'Sobre a avaliação escolar, selecione a alternativa que descreve uma prática formativa:',
      alternativaA: 'Apenas uma prova final no ano.',
      alternativaB: 'Punição por comportamento.',
      alternativaC: 'Acompanhamento contínuo do progresso do aluno com feedbacks constantes.',
      alternativaD: 'Exclusão de alunos com notas baixas.',
      alternativaE: 'Uso de notas para rankear os melhores.',
      correta: 'C',
      dificuldade: 'MEDIO'
    },
    {
      enunciado: 'O que caracteriza a metodologia ativa de ensino?',
      alternativaA: 'O aluno é apenas um ouvinte passivo.',
      alternativaB: 'O professor fala e o aluno copia.',
      alternativaC: 'O aluno é o protagonista do seu processo de aprendizagem.',
      alternativaD: 'Uso de giz e quadro sem interação.',
      alternativaE: 'Decoreba de fórmulas.',
      correta: 'C',
      dificuldade: 'DIFICIL'
    }
  ]

  for (const q of questoesExemplo) {
    const prof = professores[Math.floor(Math.random() * professores.length)]
    
    // Pegar uma disciplina e turma aleatória para vincular a questão
    const turmaRand = turmas[Math.floor(Math.random() * turmas.length)]
    const discRand = turmaRand.disciplinas[Math.floor(Math.random() * turmaRand.disciplinas.length)]

    await prisma.questao.create({
      data: {
        enunciado: q.enunciado,
        alternativaA: q.alternativaA,
        alternativaB: q.alternativaB,
        alternativaC: q.alternativaC,
        alternativaD: q.alternativaD,
        alternativaE: q.alternativaE,
        correta: q.correta,
        dificuldade: q.dificuldade as any,
        status: 'APROVADA',
        professorId: prof.id,
        disciplinas: {
          connect: [{ id: discRand.id }]
        },
        turmas: {
          connect: [{ id: turmaRand.id }]
        }
      }
    })
  }

  console.log('✨ Tudo pronto! Professores associados, planos criados e banco de questões populado.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
