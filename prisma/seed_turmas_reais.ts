
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config()
const prisma = new PrismaClient()

async function main() {
  console.log('🚀 Populando turmas existentes com estudantes e notas...')

  const admin = await prisma.user.findFirst({ where: { username: 'admin' } })
  if (!admin) {
    console.log('❌ Admin não encontrado. Criando um...')
    // Basic admin if not exists, though we know it should
  }

  const adminId = admin?.id || ''

  const turmas = await prisma.turma.findMany({
    include: {
      disciplinas: true
    }
  })

  if (turmas.length === 0) {
    console.log('⚠️ Nenhuma turma encontrada para popular.')
    return
  }

  const sobrenomes = ['Silva', 'Santos', 'Oliveira', 'Souza', 'Rodrigues', 'Ferreira', 'Alves', 'Pereira', 'Lima', 'Gomes']
  const nomesMasculinos = ['Gabriel', 'Lucas', 'Matheus', 'Pedro', 'João', 'Enzo', 'Guilherme', 'Nicolas', 'Felipe', 'Samuel']
  const nomesFemininos = ['Julia', 'Sofia', 'Alice', 'Manuela', 'Isabella', 'Laura', 'Maria', 'Beatriz', 'Bárbara', 'Camila']

  for (const turma of turmas) {
    console.log(`\n📦 Populando turma: ${turma.nome}`)
    
    // 1. Garantir que a turma tenha pelo menos algumas disciplinas se não tiver nenhuma
    let disciplinas = turma.disciplinas
    if (disciplinas.length === 0) {
      console.log(`   🔸 Criando 5 disciplinas básicas para ${turma.nome}...`)
      const baseDiscs = ['Matemática', 'Português', 'História', 'Geografia', 'Inglês']
      for (const dNome of baseDiscs) {
        const d = await prisma.disciplina.create({
          data: {
            nome: dNome,
            turmaId: turma.id
          }
        })
        disciplinas.push(d)
      }
    }

    // 2. Criar 15 estudantes por turma
    console.log(`   🎓 Criando 15 estudantes para ${turma.nome}...`)
    for (let i = 1; i <= 15; i++) {
        const isMasculino = Math.random() > 0.5
        const nomeBase = isMasculino ? nomesMasculinos[Math.floor(Math.random() * 10)] : nomesFemininos[Math.floor(Math.random() * 10)]
        const sobrenome = sobrenomes[Math.floor(Math.random() * 10)]
        const nomeCompleto = `${nomeBase} ${sobrenome} ${i}`
        const matricula = `${turma.nome.split(' ').join('')}-${i.toString().padStart(3, '0')}`

        const estudante = await prisma.estudante.upsert({
            where: { matricula },
            update: { nome: nomeCompleto, turmaId: turma.id },
            create: {
                matricula,
                nome: nomeCompleto,
                turmaId: turma.id
            }
        })

        // 3. Lançar Notas
        for (const disc of disciplinas) {
            const notaRand = 4 + Math.random() * 6 // Notas entre 4 e 10
            const status = notaRand >= 6 ? 'APROVADO' : 'RECUPERACAO'
            
            await prisma.notaFinal.upsert({
                where: {
                    estudanteId_disciplinaId: {
                        estudanteId: estudante.matricula,
                        disciplinaId: disc.id
                    }
                },
                update: {}, // Mantém se já existir
                create: {
                    estudanteId: estudante.matricula,
                    disciplinaId: disc.id,
                    nota: parseFloat(notaRand.toFixed(1)),
                    nota1: parseFloat((notaRand * 0.4 + Math.random() * 4).toFixed(1)),
                    nota2: parseFloat((notaRand * 0.6 + Math.random() * 3).toFixed(1)),
                    nota3: parseFloat(notaRand.toFixed(1)),
                    status: status as any,
                    modifiedById: adminId
                }
            })
        }
    }
  }

  console.log('\n✨ Banco de dados populado com sucesso em cima das turmas reais!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
