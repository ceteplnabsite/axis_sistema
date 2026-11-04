import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { StatusNota } from '@prisma/client'
import { logAudit } from '@/lib/audit'
import { canGradeDisciplina } from '@/lib/permissions'
import { aprovadoNaRecuperacao, isTurmaSemestral, statusProtegido, unidadesFaltando } from '@/lib/conselho'

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

    // Verificar se o usuário da sessão ainda existe no banco (pode ter mudado o ID após um reset)
    let userId = session.user.id
    const dbUser = await prisma.user.findFirst({
        where: {
            OR: [
                { id: userId },
                { email: session.user.email || "" },
                { username: session.user.name || "" } // Caso use username no name
            ].filter(v => Object.values(v)[0] !== "")
        },
        select: { id: true }
    })
    
    if (dbUser) {
        userId = dbUser.id
    } else {
        // Se não encontrar o usuário no banco, não podemos criar auditoria com FK
        // Mas podemos permitir o salvamento sem o modificador se necessário, 
        // ou pedir para logar novamente.
        return NextResponse.json({ message: 'Sessão expirada ou usuário não encontrado. Por favor, saia e entre novamente no sistema.' }, { status: 401 })
    }

    // 1ª passada: valida TUDO (antes, um erro no meio deixava parte salva)
    type Item = { notaId: string; notaRecuperacao: number | null }
    const itens: Item[] = notas.map((n: { notaId: string; notaRecuperacao: unknown }) => ({
      notaId: n.notaId,
      notaRecuperacao: n.notaRecuperacao === null || n.notaRecuperacao === undefined || n.notaRecuperacao === '' ? null : Number(n.notaRecuperacao)
    }))
    const planos: { id: string; rec: number | null; novoStatus: StatusNota; anterior: { st: StatusNota; rec: number | null; nota: number }; aluno: string; disciplina: string }[] = []

    for (const { notaId, notaRecuperacao } of itens) {
      if (notaRecuperacao !== null && (!Number.isFinite(notaRecuperacao) || (notaRecuperacao !== -1 && (notaRecuperacao < 0 || notaRecuperacao > 10)))) {
        throw new Error(`Nota de recuperação inválida: deve estar entre 0 e 10`)
      }
      const notaOriginal = await prisma.notaFinal.findUnique({ where: { id: notaId } })
      if (!notaOriginal) throw new Error(`Nota ${notaId} não encontrada`)
      if (!(await canGradeDisciplina(session.user, notaOriginal.disciplinaId))) {
        throw new Error('Sem permissão para lançar recuperação nesta disciplina')
      }
      const [student, discipline] = await Promise.all([
        prisma.estudante.findUnique({ where: { matricula: notaOriginal.estudanteId }, select: { nome: true } }),
        prisma.disciplina.findUnique({ where: { id: notaOriginal.disciplinaId }, select: { nome: true, turma: { select: { status: true, modalidade: true } } } })
      ])
      if (discipline?.turma?.status === 'ENCERRADA') throw new Error('Turma encerrada — não é possível lançar recuperação')

      const faltando = unidadesFaltando(notaOriginal, isTurmaSemestral(discipline?.turma?.modalidade))
      if (faltando.length) {
        throw new Error(`Notas pendentes: falta lançar a ${faltando.map(u => `${u}ª`).join(' e ')} unidade de ${student?.nome} em ${discipline?.nome} antes da recuperação`)
      }
      if (notaOriginal.status === 'APROVADO') {
        throw new Error(`Notas pendentes: ${student?.nome} já está aprovado(a) pelas unidades em ${discipline?.nome} e não faz recuperação`)
      }

      // rec ≥ 5 aprova; abaixo disso, uma decisão do Conselho já tomada continua valendo
      const atual = notaOriginal.status
      const novoStatus: StatusNota = aprovadoNaRecuperacao(notaRecuperacao)
        ? 'APROVADO_RECUPERACAO'
        : (statusProtegido(atual) && atual !== 'APROVADO_RECUPERACAO' ? atual : 'RECUPERACAO')

      planos.push({
        id: notaId, rec: notaRecuperacao, novoStatus,
        anterior: { st: atual, rec: notaOriginal.notaRecuperacao, nota: notaOriginal.nota },
        aluno: student?.nome || 'Estudante desconhecido', disciplina: discipline?.nome || 'Disciplina desconhecida'
      })
    }

    // 2ª passada: grava tudo junto
    await prisma.$transaction(async tx => {
      for (const p of planos) {
        await tx.notaFinalAudit.create({
          data: { notaFinalId: p.id, notaAnterior: p.anterior.nota, notaAtual: p.anterior.nota, status: p.novoStatus, modifiedById: userId }
        })
        await tx.notaFinal.update({
          where: { id: p.id },
          data: { notaRecuperacao: p.rec, status: p.novoStatus, modifiedById: userId, modifiedAt: new Date() }
        })
      }
    })
    for (const p of planos) {
      await logAudit(userId, 'NOTA', p.id, 'UPDATE', {
        alvo: p.aluno, disciplina: p.disciplina,
        anterior: { st: p.anterior.st, rec: p.anterior.rec },
        atual: { st: p.novoStatus, rec: p.rec },
        context: 'RECUPERACAO'
      })
    }
    const results = planos

    return NextResponse.json({
      message: 'Notas de recuperação lançadas com sucesso',
      count: results.length
    })
  } catch (error: any) {
    console.error('Erro ao lançar recuperação:', error)
    
    // Mensagens mais específicas para erros de validação
    if (error.message.includes('deve estar entre 0 e 10')) {
      return NextResponse.json({ message: error.message }, { status: 400 })
    }
    if (error.message.includes('não encontrada')) {
      return NextResponse.json({ message: error.message }, { status: 404 })
    }
    if (error.message.includes('Notas pendentes')) {
      return NextResponse.json({ message: error.message }, { status: 409 })
    }
    if (error.message.includes('Sem permissão') || error.message.includes('Turma encerrada')) {
      return NextResponse.json({ message: error.message }, { status: 403 })
    }

    return NextResponse.json(
      { message: 'Erro ao lançar recuperação' },
      { status: 500 }
    )
  }
}
