import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const ocorrencia = await prisma.ocorrencia.delete({
      where: { id }
    })

    await logAudit(
      session.user.id,
      'OCORRENCIA',
      id,
      'DELETE',
      { titulo: ocorrencia.titulo }
    )

    return NextResponse.json({ message: 'Ocorrência excluída com sucesso' })
  } catch (error) {
    console.error('Erro ao excluir ocorrência:', error)
    return NextResponse.json({ message: 'Erro ao excluir ocorrência' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const { titulo, descricao, tipo, data, estudantesIds } = await request.json()

    const ocorrencia = await prisma.ocorrencia.update({
      where: { id },
      data: {
        titulo,
        descricao,
        tipo,
        data: data ? new Date(data) : undefined,
        estudantes: {
          set: estudantesIds?.map((id: string) => ({ matricula: id }))
        }
      }
    })

    await logAudit(
      session.user.id,
      'OCORRENCIA',
      id,
      'UPDATE',
      { titulo: ocorrencia.titulo }
    )

    return NextResponse.json(ocorrencia)
  } catch (error) {
    console.error('Erro ao atualizar ocorrência:', error)
    return NextResponse.json({ message: 'Erro ao atualizar ocorrência' }, { status: 500 })
  }
}
