import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function main() {
  console.log('Buscando turmas e disciplinas...')
  const turmas = await prisma.turma.findMany({
    include: {
      disciplinas: {
        include: {
          usuariosPermitidos: {
            select: { name: true }
          }
        }
      }
    },
    orderBy: { nome: 'asc' }
  })

  const linhas = []
  linhas.push('Turma;Curso;Disciplina;Professor(es);Questoes Lancadas')

  let countTotal = 0;

  for (const turma of turmas) {
    for (const disciplina of turma.disciplinas) {
      const qCount = await prisma.questao.count({
        where: {
          turmas: { some: { id: turma.id } },
          disciplinas: { some: { id: disciplina.id } }
        }
      })
      
      const professores = disciplina.usuariosPermitidos.map(u => u.name).join(', ') || 'Nenhum professor vinculado'
      const curso = turma.curso || 'Sem curso associado'
      
      linhas.push(`"${turma.nome}";"${curso}";"${disciplina.nome}";"${professores}";${qCount}`)
      countTotal++;
      
      // Pequeno log para mostrar o progresso e não parecer travado
      if (countTotal % 50 === 0) {
        console.log(`Processado ${countTotal} combinações...`)
      }
    }
  }

  const csvData = linhas.join('\n')
  const filename = 'relatorio_questoes_por_disciplina.csv'
  fs.writeFileSync(filename, "\uFEFF" + csvData) // \uFEFF é o BOM para o Excel ler acentos certinho
  console.log(`\nRelatório gerado com sucesso! Arquivo salvo como: ${filename}`)
  console.log(`Total de registros avaliados: ${countTotal}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => {
    await prisma.$disconnect()
  })
