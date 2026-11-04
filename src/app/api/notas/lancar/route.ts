
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { logAudit } from '@/lib/audit'
import { canGradeDisciplina } from '@/lib/permissions'
import { isTurmaSemestral, mediaDasUnidades, statusPelasUnidades, statusProtegido } from '@/lib/conselho'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { notas, contexto } = await request.json()
    // contexto 'CONSELHO' = lançado pela Direção durante a reunião do Conselho (vai para a auditoria)
    const ctx = contexto === 'CONSELHO' ? { context: 'CONSELHO' } : {}

    if (!Array.isArray(notas) || notas.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    // Otimização: Obter informações da disciplina e turma uma única vez
    // Assumindo que todas as notas no lote são da mesma disciplina (conforme o frontend envia)
    const firstNota = notas[0]
    const disciplinaId = firstNota.disciplinaId

    const disciplina = await prisma.disciplina.findUnique({
      where: { id: disciplinaId },
      include: {
        turma: { select: { modalidade: true, status: true } }
      }
    })

    if (!disciplina) {
      return NextResponse.json({ message: 'Disciplina não encontrada' }, { status: 404 })
    }

    if (disciplina.turma?.status === 'ENCERRADA') {
      return NextResponse.json({ message: 'Turma encerrada — não é possível lançar notas' }, { status: 403 })
    }

    if (!(await canGradeDisciplina(session.user, disciplinaId))) {
      return NextResponse.json({ message: 'Você não tem permissão para lançar notas nesta disciplina' }, { status: 403 })
    }

    const isSemestral = isTurmaSemestral(disciplina.turma?.modalidade)
    const disciplineName = disciplina.nome || 'Disciplina desconhecida'

    // Só estudantes desta turma (o lote inteiro é recusado se vier alguém de fora)
    const matriculas = [...new Set(notas.map((n: { estudanteId: string }) => n.estudanteId))] as string[]
    const estudantes = await prisma.estudante.findMany({
      where: { matricula: { in: matriculas }, turmaId: disciplina.turmaId },
      select: { matricula: true, nome: true }
    })
    const studentNamesMap = new Map(estudantes.map(e => [e.matricula, e.nome]))
    const foraDaTurma = matriculas.filter(m => !studentNamesMap.has(m))
    if (foraDaTurma.length) {
      return NextResponse.json({ message: `Estudante(s) fora desta turma: ${foraDaTurma.join(', ')}. Nada foi salvo.` }, { status: 400 })
    }

    const parseNota = (val: unknown) => {
      if (val === undefined || val === null || val === '') return null
      const parsed = parseFloat(String(val).replace(',', '.'))
      return isNaN(parsed) ? null : parsed
    }

    // 1ª passada: valida TUDO antes de gravar (antes, um erro no meio deixava metade salva)
    type Linha = { estudanteId: string; n1: number | null; n2: number | null; n3: number | null; inf1: boolean; inf2: boolean; inf3: boolean }
    const linhas: Linha[] = []
    const results: Record<string, unknown>[] = []
    for (const notaData of notas) {
      const { estudanteId, nota1, nota2, nota3, isDesistente, isDesistenteUnid1, isDesistenteUnid2, isDesistenteUnid3 } = notaData
      const n1 = parseNota(nota1), n2 = parseNota(nota2), n3 = !isSemestral ? parseNota(nota3) : null
      if (n1 === null && n2 === null && n3 === null && !isDesistente && !isDesistenteUnid1 && !isDesistenteUnid2 && !isDesistenteUnid3) {
        results.push({ skipped: true, estudanteId })
        continue
      }
      for (const [u, v] of [[1, n1], [2, n2], [3, n3]] as const) {
        if (v !== null && (v < 0 || v > 10)) {
          return NextResponse.json({ message: `Nota ${u} inválida para ${studentNamesMap.get(estudanteId)}: deve estar entre 0 e 10. Nada foi salvo.` }, { status: 400 })
        }
      }
      linhas.push({ estudanteId, n1, n2, n3, inf1: !!isDesistenteUnid1, inf2: !!isDesistenteUnid2, inf3: !isSemestral && !!isDesistenteUnid3 })
    }

    // 2ª passada: grava
    for (const l of linhas) {
      const { estudanteId } = l
      const targetName = studentNamesMap.get(estudanteId) || 'Estudante desconhecido'

      const existing = await prisma.$queryRaw<{ id: string; nota1: unknown; nota2: unknown; nota3: unknown; status: string }[]>`
        SELECT id, nota_1 as "nota1", nota_2 as "nota2", nota_3 as "nota3", status
        FROM "notas_finais"
        WHERE "estudante_id" = ${estudanteId} AND "disciplina_id" = ${disciplinaId}
        LIMIT 1
      `

      if (existing.length > 0) {
        const notaId = existing[0].id
        const salvo = (v: unknown) => (v !== null && v !== undefined ? Number(v) : null)
        // Proteção contra exclusão acidental: nota que vem vazia mantém a já salva
        const finalN1 = l.n1 ?? salvo(existing[0].nota1)
        const finalN2 = l.n2 ?? salvo(existing[0].nota2)
        const finalN3 = isSemestral ? null : (l.n3 ?? salvo(existing[0].nota3))

        const unidades = { nota1: finalN1, nota2: finalN2, nota3: finalN3, isDesistenteUnid1: l.inf1, isDesistenteUnid2: l.inf2, isDesistenteUnid3: l.inf3 }
        const media = mediaDasUnidades(unidades, isSemestral)
        const calculado = statusPelasUnidades(unidades, isSemestral)
        const currentStatus = existing[0].status
        // Decisão do Conselho/recuperação continua valendo enquanto as unidades não aprovarem sozinhas
        const finalStatus = calculado === 'RECUPERACAO' && statusProtegido(currentStatus) ? currentStatus : calculado

        await prisma.$executeRaw`
          UPDATE "notas_finais"
          SET
            "nota_1" = ${finalN1},
            "nota_2" = ${finalN2},
            "nota_3" = ${finalN3},
            "nota" = ${media},
            "status" = ${finalStatus}::"status_nota",
            "is_desistente_unid1" = ${l.inf1},
            "is_desistente_unid2" = ${l.inf2},
            "is_desistente_unid3" = ${l.inf3},
            "modified_by_id" = ${session.user.id},
            "updated_at" = NOW(),
            "modified_at" = NOW()
          WHERE "id" = ${notaId}
        `

        await logAudit(session.user.id, 'NOTA', notaId, 'UPDATE', {
          alvo: targetName,
          disciplina: disciplineName,
          anterior: { n1: existing[0].nota1, n2: existing[0].nota2, n3: existing[0].nota3, st: currentStatus },
          atual: { n1: finalN1, n2: finalN2, n3: finalN3, st: finalStatus },
          ...ctx
        })

        results.push({ id: notaId, updated: true, estudanteId })
      } else {
        const unidades = { nota1: l.n1, nota2: l.n2, nota3: l.n3, isDesistenteUnid1: l.inf1, isDesistenteUnid2: l.inf2, isDesistenteUnid3: l.inf3 }
        const media = mediaDasUnidades(unidades, isSemestral)
        const status = statusPelasUnidades(unidades, isSemestral)
        const newId = uuidv4()
        await prisma.$executeRaw`
          INSERT INTO "notas_finais" (
            "id", "estudante_id", "disciplina_id", "nota_1", "nota_2", "nota_3", "nota", "status",
            "is_desistente_unid1", "is_desistente_unid2", "is_desistente_unid3",
            "modified_by_id", "created_at", "updated_at", "modified_at"
          )
          VALUES (
            ${newId}, ${estudanteId}, ${disciplinaId}, ${l.n1}, ${l.n2}, ${l.n3}, ${media}, ${status}::"status_nota",
            ${l.inf1}, ${l.inf2}, ${l.inf3},
            ${session.user.id}, NOW(), NOW(), NOW()
          )
        `

        await logAudit(session.user.id, 'NOTA', newId, 'INSERT', {
          alvo: targetName, disciplina: disciplineName, nota1: l.n1, nota2: l.n2, nota3: l.n3, status, ...ctx
        })

        results.push({ id: newId, created: true, estudanteId })
      }
    }

    return NextResponse.json({ message: 'Processamento concluído', count: results.length, results })
  } catch (error: any) {
    console.error('Erro crítico ao lançar notas:', error.message || error)
    
    if (error.message?.includes('deve estar entre 0 e 10')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ 
      message: 'Erro ao processar notas', 
      error: error.message 
    }, { status: 500 })
  }
}
