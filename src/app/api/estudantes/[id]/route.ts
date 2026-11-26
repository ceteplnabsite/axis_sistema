import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'
import { apenasGestao } from '@/lib/api-auth'
import { normalizarNome } from '@/lib/sigeduc'

export const runtime = 'nodejs'

// PUT update estudante
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const negado = await apenasGestao()
  if (negado) return negado

  try {
    const session = await auth()
    
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { nome, turmaId, matricula, nomesAlternativos } = await request.json() as { nome?: string; turmaId?: string; matricula?: string; nomesAlternativos?: unknown }

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

    const atual = await prisma.estudante.findUnique({ where: { matricula: id }, select: { nome: true, nomesAlternativos: true } })
    if (!atual) return NextResponse.json({ message: 'Estudante não encontrado' }, { status: 404 })

    // Outros nomes (nome de registro, nome anterior): só para reconhecer na importação, nunca exibidos.
    // Ao trocar o nome (ex.: passa a usar o nome social), o nome anterior entra aqui automaticamente.
    const novoNome = nome.trim()
    const informados = Array.isArray(nomesAlternativos) ? nomesAlternativos : atual.nomesAlternativos
    const candidatos = [...informados.filter((x): x is string => typeof x === 'string'),
      ...(normalizarNome(atual.nome) !== normalizarNome(novoNome) ? [atual.nome] : [])]
    const vistos = new Set([normalizarNome(novoNome)])
    const outros: string[] = []
    for (const c of candidatos) {
      const limpo = c.replace(/\s+/g, ' ').trim().slice(0, 150)
      const k = normalizarNome(limpo)
      if (limpo.length < 3 || vistos.has(k)) continue
      vistos.add(k); outros.push(limpo)
    }

    const estudante = await prisma.estudante.update({
      where: { matricula: id },
      data: {
        nome: novoNome,
        turmaId,
        matricula: matricula || id,
        nomesAlternativos: outros.slice(0, 10)
      }
    })

    await logAudit(
      session.user.id,
      'ESTUDANTE', 
      estudante.matricula,
      'UPDATE',
      { nome: estudante.nome, outrosNomes: estudante.nomesAlternativos.length, context: 'ESTUDANTE' }
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
  const negado = await apenasGestao()
  if (negado) return negado

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

    if (estudante._count.notas > 0) {
      return NextResponse.json(
        { message: 'Não é possível excluir um estudante com notas lançadas' },
        { status: 400 }
      )
    }

    await prisma.estudante.delete({
      where: { matricula: id }
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
