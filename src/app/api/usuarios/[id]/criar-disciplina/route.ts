import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  try {
    const session = await auth()
    if (!session?.user.isSuperuser) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 403 })
    }

    const { turmaId, nome } = await request.json() as { turmaId: string; nome: string }
    if (!turmaId || !nome?.trim()) {
      return NextResponse.json({ message: 'Turma e nome da disciplina são obrigatórios' }, { status: 400 })
    }

    const turma = await prisma.turma.findUnique({ where: { id: turmaId } })
    if (!turma) {
      return NextResponse.json({ message: 'Turma não encontrada' }, { status: 404 })
    }
    if (turma.status === 'ENCERRADA') {
      return NextResponse.json({ message: 'Turma encerrada — não é possível criar disciplina' }, { status: 400 })
    }

    const nomeLimpo = nome.trim()

    // Cria a disciplina na turma
    const disciplina = await prisma.disciplina.create({
      data: { nome: nomeLimpo, turmaId }
    })

    // Também registra na Matriz Curricular deste curso/série/ano, para que
    // as próximas turmas dessa combinação (ex: na próxima promoção) já
    // venham com essa disciplina automaticamente. Se a turma não tiver
    // curso/série definidos, só a disciplina é criada.
    let matrizCriada = false
    if (turma.cursoId && turma.serie) {
      const jaExiste = await prisma.matrizCurricular.findUnique({
        where: {
          nome_cursoId_serie_anoLetivo: {
            nome: nomeLimpo,
            cursoId: turma.cursoId,
            serie: turma.serie,
            anoLetivo: turma.anoLetivo ?? new Date().getFullYear()
          }
        }
      })
      if (!jaExiste) {
        await prisma.matrizCurricular.create({
          data: {
            nome: nomeLimpo,
            cursoId: turma.cursoId,
            serie: turma.serie,
            anoLetivo: turma.anoLetivo ?? new Date().getFullYear()
          }
        })
        matrizCriada = true
      }
    }

    // Regra de exclusividade: remove outro professor desta disciplina (nova,
    // então normalmente não deveria ter nenhum, mas mantém consistência)
    await prisma.$executeRawUnsafe(`
      DELETE FROM "_DisciplinaUsuarios" WHERE "A" = $1 AND "B" != $2
    `, disciplina.id, id)

    await prisma.user.update({
      where: { id },
      data: { disciplinasPermitidas: { connect: { id: disciplina.id } } }
    })

    return NextResponse.json({
      discId: disciplina.id,
      discNomeBanco: disciplina.nome,
      matrizCriada,
      message: matrizCriada
        ? `Disciplina criada na turma e na Matriz Curricular, e vinculada.`
        : `Disciplina criada na turma e vinculada.`
    })

  } catch (error: any) {
    console.error('Erro criar-disciplina:', error)
    return NextResponse.json({ message: 'Erro interno: ' + error.message }, { status: 500 })
  }
}
