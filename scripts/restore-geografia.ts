
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'
import * as path from 'path'

// Carregar .env manualmente
const envPath = path.join(__dirname, '..', '.env')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const match = line.match(/^\s*([\w.\-]+)\s*=\s*(.*)?\s*$/)
    if (match) {
      const key = match[1]
      let value = match[2] || ''
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.substring(1, value.length - 1)
      }
      process.env[key] = value
    }
  })
}

// Usar DIRECT_URL se disponível para evitar problemas de firewall/pgbouncer local
if (process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL
}

const prisma = new PrismaClient()

async function main() {
  const targetTurmaNome = '1TACM1'
  const targetDisciplinaNome = 'Geografia'

  console.log(`=== INICIANDO RESTAURAÇÃO DE NOTAS ===`)
  console.log(`Turma alvo: ${targetTurmaNome}`)
  console.log(`Disciplina alvo: ${targetDisciplinaNome}`)

  // 1. Buscar a turma
  const turma = await prisma.turma.findFirst({
    where: { nome: targetTurmaNome },
    include: { estudantes: true }
  })

  if (!turma) {
    console.error(`Erro: Turma "${targetTurmaNome}" não encontrada no banco!`)
    return
  }

  console.log(`Turma encontrada: ${turma.nome} (${turma.id})`)
  console.log(`Estudantes na turma: ${turma.estudantes.length}`)

  // 2. Buscar a disciplina nessa turma
  const disciplina = await prisma.disciplina.findFirst({
    where: {
      nome: { contains: targetDisciplinaNome, mode: 'insensitive' },
      turmaId: turma.id
    }
  })

  if (!disciplina) {
    console.error(`Erro: Disciplina "${targetDisciplinaNome}" não encontrada para a turma "${targetTurmaNome}"!`)
    return
  }

  console.log(`Disciplina encontrada: ${disciplina.nome} (${disciplina.id})`)
  const isSemestral = turma.modalidade === 'PROEJA' || turma.modalidade === 'SUBSEQUENTE'
  console.log(`Modalidade Semestral: ${isSemestral ? 'Sim' : 'Não'}`)

  let totalRestored = 0

  // 3. Processar cada estudante
  for (const estudante of turma.estudantes) {
    console.log(`\nProcessando estudante: ${estudante.nome} (${estudante.matricula})...`)

    // Buscar a nota final atual no banco
    const notaAtual = await prisma.notaFinal.findUnique({
      where: {
        estudanteId_disciplinaId: {
          estudanteId: estudante.matricula,
          disciplinaId: disciplina.id
        }
      }
    })

    if (!notaAtual) {
      console.log(`  - Nenhuma nota cadastrada atualmente para este estudante nesta disciplina.`)
      continue
    }

    console.log(`  - Nota atual no banco: N1: ${notaAtual.nota1} | N2: ${notaAtual.nota2} | N3: ${notaAtual.nota3} | Média: ${notaAtual.nota} | Status: ${notaAtual.status}`)

    // 4. Buscar os logs de auditoria associados a essa nota final
    const logs = await prisma.auditLog.findMany({
      where: {
        entityType: 'NOTA',
        entityId: notaAtual.id,
        action: 'UPDATE'
      },
      orderBy: { createdAt: 'desc' }
    })

    console.log(`  - Encontrados ${logs.length} logs de auditoria de modificação.`)

    if (logs.length === 0) {
      console.log(`  - Nenhum log de auditoria para restaurar.`)
      continue
    }

    let restoredN1: number | null = null
    let restoredN2: number | null = null
    let restoredN3: number | null = null
    let latestSpecialStatus: string | null = null

    // 5. Analisar o histórico de logs do mais recente para o mais antigo para recuperar os dados válidos
    for (const log of logs) {
      try {
        if (!log.details) continue
        const parsed = JSON.parse(log.details)
        
        // Extrair notas válidas não nulas do campo 'atual' ou 'anterior'
        if (restoredN1 === null) {
          if (parsed.atual?.n1 !== null && parsed.atual?.n1 !== undefined && parsed.atual?.n1 !== '') {
            restoredN1 = Number(parsed.atual.n1)
          } else if (parsed.anterior?.n1 !== null && parsed.anterior?.n1 !== undefined && parsed.anterior?.n1 !== '') {
            restoredN1 = Number(parsed.anterior.n1)
          }
        }

        if (restoredN2 === null) {
          if (parsed.atual?.n2 !== null && parsed.atual?.n2 !== undefined && parsed.atual?.n2 !== '') {
            restoredN2 = Number(parsed.atual.n2)
          } else if (parsed.anterior?.n2 !== null && parsed.anterior?.n2 !== undefined && parsed.anterior?.n2 !== '') {
            restoredN2 = Number(parsed.anterior.n2)
          }
        }

        if (restoredN3 === null) {
          if (parsed.atual?.n3 !== null && parsed.atual?.n3 !== undefined && parsed.atual?.n3 !== '') {
            restoredN3 = Number(parsed.atual.n3)
          } else if (parsed.anterior?.n3 !== null && parsed.anterior?.n3 !== undefined && parsed.anterior?.n3 !== '') {
            restoredN3 = Number(parsed.anterior.n3)
          }
        }

        // Buscar se houve status especial
        if (!latestSpecialStatus) {
          const stAtual = parsed.atual?.st
          const stAnt = parsed.anterior?.st
          if (['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(stAtual)) {
            latestSpecialStatus = stAtual
          } else if (['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(stAnt)) {
            latestSpecialStatus = stAnt
          }
        }

      } catch (e: any) {
        console.error(`  - Erro ao analisar detalhes do log:`, e.message)
      }
    }

    console.log(`  - Notas recuperadas dos logs: N1: ${restoredN1} | N2: ${restoredN2} | N3: ${restoredN3}`)

    // 6. Verificar se as notas recuperadas diferem das atuais (indicando que houve exclusão)
    const n1Mudou = restoredN1 !== null && restoredN1 !== notaAtual.nota1
    const n2Mudou = restoredN2 !== null && restoredN2 !== notaAtual.nota2
    const n3Mudou = restoredN3 !== null && restoredN3 !== notaAtual.nota3

    if (n1Mudou || n2Mudou || n3Mudou) {
      // Usar a nota atual se a recuperada for nula, garantindo que não vamos sobrescrever com nulo
      const finalN1 = restoredN1 !== null ? restoredN1 : notaAtual.nota1
      const finalN2 = restoredN2 !== null ? restoredN2 : notaAtual.nota2
      const finalN3 = restoredN3 !== null ? restoredN3 : notaAtual.nota3

      // Recalcular a média
      const val1 = finalN1 ?? 0
      const val2 = finalN2 ?? 0
      const val3 = finalN3 ?? 0

      let novaNotaCalculada = 0
      if (isSemestral) {
        novaNotaCalculada = (val1 + val2) / 2
      } else {
        novaNotaCalculada = (val1 + val2 + val3) / 3
      }
      novaNotaCalculada = Math.round(novaNotaCalculada * 10) / 10

      // Recalcular status regular
      let novoStatus = 'RECUPERACAO'
      const allNotesLaunched = isSemestral ? (finalN1 !== null && finalN2 !== null) : (finalN1 !== null && finalN2 !== null && finalN3 !== null)
      if (novaNotaCalculada >= 5 && allNotesLaunched) {
        novoStatus = 'APROVADO'
      }

      // Preservar status especial de conselho/recuperação se a média for < 5
      let statusFinal = novoStatus
      if (latestSpecialStatus && novoStatus === 'RECUPERACAO') {
        statusFinal = latestSpecialStatus
      } else if (['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(notaAtual.status) && novoStatus === 'RECUPERACAO') {
        statusFinal = notaAtual.status
      }

      console.log(`  -> RESTAURANDO NOTA: N1: ${finalN1} | N2: ${finalN2} | N3: ${finalN3} | Média: ${novaNotaCalculada} | Status: ${statusFinal}`)

      // Atualizar o banco de dados
      await prisma.notaFinal.update({
        where: { id: notaAtual.id },
        data: {
          nota1: finalN1,
          nota2: finalN2,
          nota3: finalN3,
          nota: novaNotaCalculada,
          status: statusFinal as any,
          modifiedAt: new Date()
        }
      })

      // Criar auditoria de restauração
      await prisma.notaFinalAudit.create({
        data: {
          notaFinalId: notaAtual.id,
          notaAnterior: notaAtual.nota,
          notaAtual: novaNotaCalculada,
          status: statusFinal as any,
          modifiedById: notaAtual.modifiedById
        }
      })

      totalRestored++
    } else {
      console.log(`  - As notas atuais já estão corretas ou não há dados válidos anteriores para restaurar.`)
    }
  }

  console.log(`\n=== PROCESSO CONCLUÍDO ===`)
  console.log(`Estudantes que tiveram as notas restauradas com sucesso: ${totalRestored}`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
