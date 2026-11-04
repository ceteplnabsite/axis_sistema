import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusNota } from '@prisma/client'
import { canGradeDisciplina } from '@/lib/permissions'
import { STATUS_DECISAO_CONSELHO, aprovadoNaRecuperacao, isTurmaSemestral, unidadesFaltando } from '@/lib/conselho'

export const runtime = 'nodejs'

class ErroValidacao extends Error {
  constructor(public status: number, message: string) { super(message) }
}

const buscarNota = (id: string) => prisma.notaFinal.findUnique({
  where: { id },
  include: {
    estudante: { select: { nome: true } },
    disciplina: { select: { nome: true, turma: { select: { status: true, modalidade: true } } } }
  }
})

type Decisao = { notaId: string; novoStatus: string; novaNotaRec?: number | null }

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { decisoes } = await request.json() as { decisoes: Decisao[] }

    if (!Array.isArray(decisoes) || decisoes.length === 0) {
      return NextResponse.json({ message: 'Dados inválidos' }, { status: 400 })
    }

    // Verificar se o usuário da sessão ainda existe no banco
    const dbUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: session.user.id },
          { email: session.user.email || "" },
          { username: session.user.name || "" }
        ].filter(v => Object.values(v)[0] !== "")
      },
      select: { id: true }
    })
    if (!dbUser) {
      return NextResponse.json({ message: 'Sessão expirada ou usuário não encontrado. Por favor, saia e entre novamente no sistema.' }, { status: 401 })
    }
    const userId = dbUser.id

    // ── 1. Valida TODAS as decisões antes de gravar qualquer coisa ──
    type NotaComTurma = NonNullable<Awaited<ReturnType<typeof buscarNota>>>
    const validadas: { notaOriginal: NotaComTurma; status: StatusNota; rec: number | null; alvo: string }[] = []
    for (const d of decisoes) {
      const notaOriginal = await buscarNota(d.notaId)
      if (!notaOriginal) throw new ErroValidacao(404, `Nota ${d.notaId} não encontrada`)

      const alvo = `${notaOriginal.estudante.nome} / ${notaOriginal.disciplina.nome}`

      if (!(await canGradeDisciplina(session.user, notaOriginal.disciplinaId))) {
        throw new ErroValidacao(403, `Sem permissão para registrar decisão de conselho em ${notaOriginal.disciplina.nome}`)
      }
      if (notaOriginal.disciplina.turma.status === 'ENCERRADA') {
        throw new ErroValidacao(403, 'Turma encerrada — não é possível registrar decisões de conselho')
      }

      const faltando = unidadesFaltando(notaOriginal, isTurmaSemestral(notaOriginal.disciplina.turma.modalidade))
      if (faltando.length) {
        throw new ErroValidacao(409, `${alvo}: falta lançar a nota da ${faltando.map(u => `${u}ª`).join(' e ')} unidade — o Conselho só decide com todas as notas lançadas`)
      }

      if (!(STATUS_DECISAO_CONSELHO as readonly string[]).includes(d.novoStatus)) {
        throw new ErroValidacao(400, `Decisão inválida: ${d.novoStatus}`)
      }

      const rec = d.novaNotaRec !== undefined ? d.novaNotaRec : notaOriginal.notaRecuperacao
      if (rec !== null && rec !== undefined && rec !== -1 && (rec < 0 || rec > 10)) {
        throw new ErroValidacao(400, 'Nota de recuperação inválida: deve estar entre 0 e 10')
      }

      // Regra da escola: recuperação ≥ 5 aprova; abaixo disso não existe "aprovado na recuperação"
      let status = d.novoStatus as StatusNota
      if (aprovadoNaRecuperacao(rec)) status = 'APROVADO_RECUPERACAO'
      else if (status === 'APROVADO_RECUPERACAO') {
        throw new ErroValidacao(400, `${alvo}: "Aprovado na Recuperação" exige nota de recuperação a partir de 5`)
      }

      validadas.push({ notaOriginal, status, rec: rec ?? null, alvo })
    }

    // ── 2. Grava tudo numa transação: ou entra tudo, ou nada ──
    const now = new Date()
    const brTime = new Date(now.getTime() + (-3 * 60 + now.getTimezoneOffset()) * 60000) // mesmo horário do logAudit
    await prisma.$transaction(async tx => {
      for (const v of validadas) {
        await tx.notaFinalAudit.create({
          data: {
            notaFinalId: v.notaOriginal.id,
            notaAnterior: v.notaOriginal.nota,
            notaAtual: v.notaOriginal.nota, // nota original não muda
            status: v.status,
            modifiedById: userId
          }
        })
        await tx.notaFinal.update({
          where: { id: v.notaOriginal.id },
          data: { status: v.status, notaRecuperacao: v.rec, modifiedById: userId, modifiedAt: now }
        })
        await tx.auditLog.create({
          data: {
            userId,
            entityType: 'NOTA',
            entityId: v.notaOriginal.id,
            action: 'UPDATE',
            createdAt: brTime,
            details: JSON.stringify({
              alvo: v.notaOriginal.estudante.nome,
              disciplina: v.notaOriginal.disciplina.nome,
              anterior: { st: v.notaOriginal.status, rec: v.notaOriginal.notaRecuperacao },
              atual: { st: v.status, rec: v.rec },
              context: 'CONSELHO'
            })
          }
        })
      }
    })

    return NextResponse.json({ message: 'Decisões do conselho salvas com sucesso', count: validadas.length })
  } catch (error: unknown) {
    if (error instanceof ErroValidacao) {
      return NextResponse.json({ message: error.message }, { status: error.status })
    }
    console.error('Erro ao salvar conselho:', error)
    return NextResponse.json({ message: 'Erro ao salvar decisões do conselho' }, { status: 500 })
  }
}
