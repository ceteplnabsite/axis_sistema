
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
    const debugLogs: string[] = []

    debugLogs.push(`=== DIAGNÓSTICO DE RESTAURAÇÃO ===`)
    debugLogs.push(`Turma: ${targetTurmaNome}, Disciplina: ${targetDisciplinaNome}`)

    // 1. Buscar a turma
    const turma = await prisma.turma.findFirst({
      where: { nome: targetTurmaNome },
      include: { estudantes: true }
    })

    if (!turma) {
      return NextResponse.json({ message: `Turma "${targetTurmaNome}" não encontrada.` }, { status: 404 })
    }

    debugLogs.push(`Turma encontrada: ${turma.nome} (${turma.id}) com ${turma.estudantes.length} estudantes.`)

    // 2. Buscar a disciplina nessa turma
    const disciplina = await prisma.disciplina.findFirst({
      where: {
        nome: { contains: targetDisciplinaNome, mode: 'insensitive' },
        turmaId: { equals: turma.id }
      }
    })

    if (!disciplina) {
      return NextResponse.json({ message: `Disciplina "${targetDisciplinaNome}" não encontrada para a turma.` }, { status: 404 })
    }

    debugLogs.push(`Disciplina encontrada: ${disciplina.nome} (${disciplina.id})`)
    const isSemestral = turma.modalidade === 'PROEJA' || turma.modalidade === 'SUBSEQUENTE'

    // 3. Verificar notas atuais
    const notasExistentes = await prisma.notaFinal.findMany({
      where: {
        disciplinaId: disciplina.id,
        estudanteId: { in: turma.estudantes.map(e => e.matricula) }
      }
    })

    debugLogs.push(`Notas Finais existentes cadastradas no banco para esta turma/disciplina: ${notasExistentes.length}`)

    // 4. Diagnosticar a tabela de logs de auditoria
    const totalLogs = await prisma.auditLog.count()
    debugLogs.push(`Total de registros na tabela audit_logs: ${totalLogs}`)

    const logsNotaType = await prisma.auditLog.count({
      where: { entityType: { contains: 'NOTA', mode: 'insensitive' } }
    })
    debugLogs.push(`Registros de auditoria com entityType contendo 'NOTA': ${logsNotaType}`)

    // Obter as entityTypes mais comuns
    const sampleLogs = await prisma.auditLog.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' }
    })
    
    debugLogs.push(`--- Últimos 5 logs gerais do sistema ---`)
    sampleLogs.forEach(l => {
      debugLogs.push(`[${l.createdAt.toISOString()}] Entity: ${l.entityType} | Action: ${l.action} | EntityId: ${l.entityId} | Details: ${l.details?.substring(0, 150)}...`)
    })

    // 5. Tentar buscar logs que contenham o ID da disciplina de Geografia nos detalhes
    debugLogs.push(`--- Buscando logs específicos de Geografia nos detalhes ---`)
    const geoLogs = await prisma.auditLog.findMany({
      where: {
        details: {
          contains: disciplina.nome
        }
      },
      take: 5,
      orderBy: { createdAt: 'desc' }
    })

    debugLogs.push(`Logs contendo o nome da disciplina "${disciplina.nome}" nos detalhes: ${geoLogs.length}`)
    geoLogs.forEach(l => {
      debugLogs.push(`[${l.createdAt.toISOString()}] ID: ${l.id} | Entity: ${l.entityType} | Action: ${l.action} | Details: ${l.details?.substring(0, 150)}...`)
    })

    // 6. Processar a restauração e coletar logs detalhados de cada estudante
    let totalRestored = 0

    for (const estudante of turma.estudantes) {
      const notaAtual = notasExistentes.find(n => n.estudanteId === estudante.matricula)
      
      if (!notaAtual) {
        // Se não existir NotaFinal, vamos tentar criá-la a partir de logs se houver histórico
        continue
      }

      // Buscar logs por entityId (que deve ser o ID da nota final) ou cujo detalhes mencionem a matrícula do aluno
      const logsEstudante = await prisma.auditLog.findMany({
        where: {
          OR: [
            { entityId: notaAtual.id },
            { 
              AND: [
                { entityType: 'NOTA' },
                { details: { contains: estudante.matricula } }
              ] 
            }
          ]
        },
        orderBy: { createdAt: 'desc' }
      })

      if (logsEstudante.length > 0) {
        debugLogs.push(`Estudante ${estudante.nome} (${estudante.matricula}) tem ${logsEstudante.length} logs associados.`)
        
        let restoredN1: number | null = null
        let restoredN2: number | null = null
        let restoredN3: number | null = null
        let latestSpecialStatus: string | null = null

        for (const log of logsEstudante) {
          try {
            if (!log.details) continue
            const parsed = JSON.parse(log.details)
            
            // Aceitar formatos onde o log tem 'nota1'/'nota2'/'nota3' ou 'n1'/'n2'/'n3' ou no formato do audit anterior
            const dataAtual = parsed.atual || parsed.data || parsed
            const dataAnterior = parsed.anterior

            // Extrair notas válidas não nulas
            if (restoredN1 === null) {
              const val = dataAtual?.n1 ?? dataAtual?.nota1 ?? dataAnterior?.n1 ?? dataAnterior?.nota1
              if (val !== null && val !== undefined && val !== '') restoredN1 = Number(val)
            }

            if (restoredN2 === null) {
              const val = dataAtual?.n2 ?? dataAtual?.nota2 ?? dataAnterior?.n2 ?? dataAnterior?.nota2
              if (val !== null && val !== undefined && val !== '') restoredN2 = Number(val)
            }

            if (restoredN3 === null) {
              const val = dataAtual?.n3 ?? dataAtual?.nota3 ?? dataAnterior?.n3 ?? dataAnterior?.nota3
              if (val !== null && val !== undefined && val !== '') restoredN3 = Number(val)
            }

            // Buscar status especial
            if (!latestSpecialStatus) {
              const st = dataAtual?.st ?? dataAtual?.status ?? dataAnterior?.st ?? dataAnterior?.status
              if (['APROVADO_RECUPERACAO', 'APROVADO_CONSELHO', 'DEPENDENCIA', 'CONSERVADO'].includes(st)) {
                latestSpecialStatus = st
              }
            }
          } catch (e: any) {
            debugLogs.push(`  - Erro parseando log ID ${log.id}: ${e.message}`)
          }
        }

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

          debugLogs.push(`  -> [RESTAURANDO] N1: ${finalN1} | N2: ${finalN2} | N3: ${finalN3} | Média: ${novaNotaCalculada} | Status: ${statusFinal}`)

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
        } else {
          debugLogs.push(`  - Notas atuais já equivalem às restauradas ou não necessitam alteração.`)
        }
      }
    }

    debugLogs.push(`Restauração concluída! Total de estudantes restaurados: ${totalRestored}`)

    return NextResponse.json({
      success: true,
      message: `${totalRestored} notas restauradas.`,
      logs: debugLogs
    })

  } catch (error: any) {
    console.error('Erro na rota de diagnóstico:', error)
    return NextResponse.json({
      success: false,
      message: 'Erro interno',
      error: error.message
    }, { status: 500 })
  }
}
