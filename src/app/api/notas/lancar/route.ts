
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { v4 as uuidv4 } from 'uuid'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { notas } = await request.json()

    if (!Array.isArray(notas) || notas.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    // Processar cada nota
    const results = await Promise.all(
      notas.map(async ({ estudanteId, disciplinaId, nota1, nota2, nota3, isDesistente, isDesistenteUnid1, isDesistenteUnid2, isDesistenteUnid3 }) => {
        // Obter modalidade da turma através da disciplina
        const disciplina = await prisma.disciplina.findUnique({
          where: { id: disciplinaId },
          include: { turma: { select: { modalidade: true } } }
        })

        const modalidade = disciplina?.turma?.modalidade
        const isSemestral = modalidade === 'PROEJA' || modalidade === 'SUBSEQUENTE'

        // Se todos os campos estiverem vazios e não for desistente, ignorar
        const isAllEmpty = (nota1 === '' || nota1 === null) && 
                          (nota2 === '' || nota2 === null) && 
                          (nota3 === '' || nota3 === null || isSemestral) && // Ignora nota3 se semestral
                          !isDesistente && !isDesistenteUnid1 && !isDesistenteUnid2 && !isDesistenteUnid3;

        if (isAllEmpty) {
          return { skipped: true, estudanteId };
        }

        const n1 = (nota1 !== undefined && nota1 !== null && nota1 !== '') ? parseFloat(String(nota1).replace(',', '.')) : null
        const n2 = (nota2 !== undefined && nota2 !== null && nota2 !== '') ? parseFloat(String(nota2).replace(',', '.')) : null
        const n3 = (!isSemestral && nota3 !== undefined && nota3 !== null && nota3 !== '') ? parseFloat(String(nota3).replace(',', '.')) : null

        // Validação de range (0-10)
        if (n1 !== null && (n1 < 0 || n1 > 10)) {
          throw new Error(`Nota 1 inválida para estudante ${estudanteId}: deve estar entre 0 e 10`)
        }
        if (n2 !== null && (n2 < 0 || n2 > 10)) {
          throw new Error(`Nota 2 inválida para estudante ${estudanteId}: deve estar entre 0 e 10`)
        }
        if (n3 !== null && (n3 < 0 || n3 > 10)) {
          throw new Error(`Nota 3 inválida para estudante ${estudanteId}: deve estar entre 0 e 10`)
        }

        const val1 = n1 !== null ? n1 : 0
        const val2 = n2 !== null ? n2 : 0
        const val3 = n3 !== null ? n3 : 0

        let notaCalculada = 0
        if (isSemestral) {
            // Se for semestral, só divide por 2 se as duas notas existirem ou se for pra cálculo parcial
            notaCalculada = (val1 + val2) / 2
        } else {
            notaCalculada = (val1 + val2 + val3) / 3
        }
        
        notaCalculada = Math.round(notaCalculada * 10) / 10

        let status = 'RECUPERACAO'
        // Só aprova automaticamente se tiver todas as notas necessárias lançadas
        const allNotesLaunched = isSemestral ? (n1 !== null && n2 !== null) : (n1 !== null && n2 !== null && n3 !== null)
        
        if (notaCalculada >= 5 && allNotesLaunched) {
          status = 'APROVADO'
        } else if (notaCalculada < 5 && allNotesLaunched) {
          status = 'RECUPERACAO'
        } else {
          status = 'RECUPERACAO' // Pendente/Em andamento
        }

        const statusEnum = status as any
        
        const student = await prisma.estudante.findUnique({ where: { matricula: estudanteId }, select: { nome: true } })

        const targetName = student?.nome || 'Estudante desconhecido'
        const disciplineName = disciplina?.nome || 'Disciplina desconhecida'

        const existing = await prisma.$queryRaw<any[]>`
          SELECT id, nota_1 as "nota1", nota_2 as "nota2", nota_3 as "nota3", status 
          FROM "notas_finais" 
          WHERE "estudante_id" = ${estudanteId} AND "disciplina_id" = ${disciplinaId}
          LIMIT 1
        `

        if (existing.length > 0) {
          const notaId = existing[0].id
          await prisma.$executeRaw`
            UPDATE "notas_finais"
            SET 
              "nota_1" = ${n1},
              "nota_2" = ${n2},
              "nota_3" = ${n3},
              "nota" = ${notaCalculada},
              "status" = ${statusEnum}::"status_nota",
              "is_desistente_unid1" = ${!!isDesistenteUnid1},
              "is_desistente_unid2" = ${!!isDesistenteUnid2},
              "is_desistente_unid3" = ${!!isDesistenteUnid3},
              "modified_by_id" = ${session.user.id},
              "updated_at" = NOW(),
              "modified_at" = NOW()
            WHERE "id" = ${notaId}
          `
          
          await logAudit(
            session.user.id,
            'NOTA',
            notaId,
            'UPDATE',
            { 
              alvo: targetName, 
              disciplina: disciplineName,
              anterior: { n1: existing[0].nota1, n2: existing[0].nota2, n3: existing[0].nota3, st: existing[0].status },
              atual: { n1: n1, n2: n2, n3: n3, st: statusEnum }
            }
          )
          
          return { id: notaId, updated: true }
        } else {
          const newId = uuidv4()
          await prisma.$executeRaw`
            INSERT INTO "notas_finais" (
              "id", "estudante_id", "disciplina_id", "nota_1", "nota_2", "nota_3", "nota", "status", 
              "is_desistente_unid1", "is_desistente_unid2", "is_desistente_unid3",
              "modified_by_id", "created_at", "updated_at", "modified_at"
            )
            VALUES (
              ${newId}, ${estudanteId}, ${disciplinaId}, ${n1}, ${n2}, ${n3}, ${notaCalculada}, ${statusEnum}::"status_nota", 
              ${!!isDesistenteUnid1}, ${!!isDesistenteUnid2}, ${!!isDesistenteUnid3},
              ${session.user.id}, NOW(), NOW(), NOW()
            )
          `
          
          await logAudit(
            session.user.id,
            'NOTA',
            newId,
            'INSERT',
            { 
              alvo: targetName, 
              disciplina: disciplineName,
              nota1: n1, 
              nota2: n2, 
              nota3: n3, 
              status: statusEnum 
            }
          )
          
          return { id: newId, created: true }
        }
      })
    )

    return NextResponse.json({ message: 'Processamento concluído', count: results.length })
  } catch (error: any) {
    console.error('Erro crítico ao lançar notas:', error.message)
    
    // Mensagens mais específicas para erros de validação
    if (error.message.includes('deve estar entre 0 e 10')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    
    return NextResponse.json({ message: 'Erro ao processar notas' }, { status: 500 })
  }
}
