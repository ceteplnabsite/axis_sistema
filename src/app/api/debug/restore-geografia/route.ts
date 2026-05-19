
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado. Faça login primeiro.' }, { status: 401 })
    }

    const targetTurmaNome = '1TACM1'
    const targetDisciplinaNome = 'Geografia'
    const logsRestauracao: string[] = []

    logsRestauracao.push(`Iniciando restauração de notas para Turma: ${targetTurmaNome}, Disciplina: ${targetDisciplinaNome}`)

    // 1. Buscar a turma
    const turma = await prisma.turma.findFirst({
      where: { nome: targetTurmaNome },
      include: { estudantes: true }
    })

    if (!turma) {
      return NextResponse.json({ message: `Turma "${targetTurmaNome}" não encontrada no banco!` }, { status: 404 })
    }

    logsRestauracao.push(`Turma encontrada: ${turma.nome} (${turma.id}) com ${turma.estudantes.length} estudantes.`)

    // 2. Buscar a disciplina nessa turma
    const disciplina = await prisma.disciplina.findFirst({
      where: {
        nome: { contains: targetDisciplinaNome, mode: 'insensitive' },
        turmaId: turma.id
      }
    })

    if (!disciplina) {
      return NextResponse.json({ message: `Disciplina "${targetDisciplinaNome}" não encontrada para a turma "${targetTurmaNome}"!` }, { status: 404 })
    }

    logsRestauracao.push(`Disciplina encontrada: ${disciplina.nome} (${disciplina.id})`)
    const isSemestral = turma.modalidade === 'PROEJA' || turma.modalidade === 'SUBSEQUENTE'

    let totalRestored = 0

    // 3. Processar cada estudante
    for (const estudante of turma.estudantes) {
      // Buscar a nota final atual no banco
      const notaAtual = await prisma.notaFinal.findUnique({
        where: {
          estudanteId_disciplinaId: {
            estudanteId: estudante.matricula,
            disciplinaId: disciplina.id
          }
        }
      })

      if (!notaAtual) continue

      // Buscar os logs de auditoria associados a essa nota final
      const logs = await prisma.auditLog.findMany({
        where: {
          entityType: 'NOTA',
          entityId: notaAtual.id,
          action: 'UPDATE'
        },
        orderBy: { createdAt: 'desc' }
      })

      if (logs.length === 0) continue

      let restoredN1: number | null = null
      let restoredN2: number | null = null
      let restoredN3: number | null = null
      let latestSpecialStatus: string | null = null

      // Analisar logs de auditoria
      for (const log of logs) {
        try {
          if (!log.details) continue
          const parsed = JSON.parse(log.details)
          
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

          if (!latestSpecialStatus) {
            const stAtual = parsed.atual?.st
            const stAnt = parsed.anterior?.st
            if (['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(stAtual)) {
              latestSpecialStatus = stAtual
            } else if (['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(stAnt)) {
              latestSpecialStatus = stAnt
            }
          }
        } catch {}
      }

      // Se houver notas válidas recuperadas que diferem das notas nulas/vazias atuais
      const n1Mudou = restoredN1 !== null && restoredN1 !== notaAtual.nota1
      const n2Mudou = restoredN2 !== null && restoredN2 !== notaAtual.nota2
      const n3Mudou = restoredN3 !== null && restoredN3 !== notaAtual.nota3

      if (n1Mudou || n2Mudou || n3Mudou) {
        const finalN1 = restoredN1 !== null ? restoredN1 : notaAtual.nota1
        const finalN2 = restoredN2 !== null ? restoredN2 : notaAtual.nota2
        const finalN3 = restoredN3 !== null ? restoredN3 : notaAtual.nota3

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

        let novoStatus = 'RECUPERACAO'
        const allNotesLaunched = isSemestral ? (finalN1 !== null && finalN2 !== null) : (finalN1 !== null && finalN2 !== null && finalN3 !== null)
        if (novaNotaCalculada >= 5 && allNotesLaunched) {
          novoStatus = 'APROVADO'
        }

        let statusFinal = novoStatus
        if (latestSpecialStatus && novoStatus === 'RECUPERACAO') {
          statusFinal = latestSpecialStatus
        } else if (['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(notaAtual.status) && novoStatus === 'RECUPERACAO') {
          statusFinal = notaAtual.status
        }

        logsRestauracao.push(`Restaurando Estudante: ${estudante.nome} (${estudante.matricula}) -> N1: ${finalN1} | N2: ${finalN2} | N3: ${finalN3} | Média: ${novaNotaCalculada} | Status: ${statusFinal}`)

        // Executar o update
        await prisma.notaFinal.update({
          where: { id: notaAtual.id },
          data: {
            nota1: finalN1,
            nota2: finalN2,
            nota3: finalN3,
            nota: novaNotaCalculada,
            status: statusFinal as any,
            modifiedAt: new Date(),
            modifiedById: session.user.id
          }
        })

        // Registrar auditoria
        await prisma.notaFinalAudit.create({
          data: {
            notaFinalId: notaAtual.id,
            notaAnterior: notaAtual.nota,
            notaAtual: novaNotaCalculada,
            status: statusFinal as any,
            modifiedById: session.user.id
          }
        })

        totalRestored++
      }
    }

    logsRestauracao.push(`Restauração concluída! Total de estudantes restaurados: ${totalRestored}`)

    return NextResponse.json({
      success: true,
      message: `${totalRestored} notas restauradas com sucesso.`,
      logs: logsRestauracao
    })

  } catch (error: any) {
    console.error('Erro na rota de restauração de debug:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno ao tentar restaurar notas',
      error: error.message
    }, { status: 500 })
  }
}
