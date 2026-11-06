import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canGradeDisciplina } from '@/lib/permissions'

export const runtime = 'nodejs'

/** Notas de uma disciplina (estudantes que estão na turma). Só quem lança notas nela, Direção ou TI. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ turmaId: string; disciplinaId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { turmaId, disciplinaId } = await params
    if (!(await canGradeDisciplina(session.user, disciplinaId))) {
      return NextResponse.json({ message: 'Você não lança notas nesta disciplina' }, { status: 403 })
    }

    const notas = await prisma.notaFinal.findMany({
      where: { disciplinaId, estudante: { turmaId } },
      select: {
        id: true, estudanteId: true, disciplinaId: true,
        nota1: true, nota2: true, nota3: true, nota: true, status: true,
        isDesistenteUnid1: true, isDesistenteUnid2: true, isDesistenteUnid3: true
      }
    })

    return NextResponse.json(notas)
  } catch (error) {
    console.error('Erro ao buscar notas:', error)
    return NextResponse.json({ message: 'Erro ao buscar notas' }, { status: 500 })
  }
}
