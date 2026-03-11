import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

// PUT update estudante
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { nome, turmaId, matricula } = await request.json()

    if (!nome || nome.trim() === '') {
      return NextResponse.json(
        { message: 'Nome do estudante é obrigatório' },
        { status: 400 }
      )
    }

    if (!turmaId) {
      return NextResponse.json(
        { message: 'Turma é obrigatória' },
        { status: 400 }
      )
    }

    const { id } = await context.params

    const estudante = await prisma.estudante.update({
      where: { matricula: id },
      data: {
        nome: nome.trim(),
        turmaId,
        matricula: matricula || id
      }
    })

    await logAudit(
      session.user.id,
      'ESTUDANTE', 
      estudante.matricula,
      'UPDATE',
      { nome: estudante.nome, context: 'ESTUDANTE' }
    )

    return NextResponse.json(estudante)
  } catch (error) {
    console.error('Erro ao atualizar estudante:', error)
    return NextResponse.json(
      { message: 'Erro ao atualizar estudante' },
      { status: 500 }
    )
  }
}

// DELETE estudante
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    // Verificar se há notas vinculadas
    const estudante = await prisma.estudante.findUnique({
      where: { matricula: id },
      include: {
        _count: {
          select: {
            notas: true
          }
        }
      }
    })

    if (!estudante) {
      return NextResponse.json({ message: 'Estudante não encontrado' }, { status: 404 })
    }

    // Usar transação para garantir limpeza de referências e exclusão segura
    await prisma.$transaction(async (tx) => {
      // 1. Limpar referências na tabela de usuários (acesso ao portal)
      await tx.user.updateMany({
        where: { estudanteId: id },
        data: { estudanteId: null }
      })

      // 2. Excluir o estudante (as notas possuem onDelete: Cascade no schema)
      await tx.estudante.delete({
        where: { matricula: id }
      })
    })

    await logAudit(
      session.user.id,
      'ESTUDANTE', 
      id,
      'DELETE',
      { nome: estudante.nome, context: 'ESTUDANTE_DELETE' }
    )

    return NextResponse.json({ message: 'Estudante excluído com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir estudante:', error)
    return NextResponse.json(
      { message: 'Erro ao excluir estudante' },
      { status: 500 }
    )
  }
}
