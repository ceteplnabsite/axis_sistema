import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auth } from '@/lib/auth'

export async function GET() {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const turmas = await prisma.turma.findMany({
    include: {
      _count: {
        select: {
          questoes: true,
          estudantes: true,
          disciplinas: true,
        }
      }
    },
    orderBy: { nome: 'asc' }
  })

  // Agrupa por nome para achar duplicatas facilmente
  const duplicates = turmas.filter(t => 
    turmas.filter(t2 => t2.nome === t.nome).length > 1
  )

  return NextResponse.json({
    total: turmas.length,
    duplicates: duplicates.map(t => ({
      id: t.id,
      nome: t.nome,
      ano: t.anoLetivo,
      counts: t._count
    }))
  })
}

// Rota para migrar questões de uma turma para outra
export async function POST(request: Request) {
  const session = await auth()
  if (!session || session.user.role !== 'ADMIN') {
    return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
  }

  const { fromId, toId } = await request.json()

  if (!fromId || !toId) {
    return NextResponse.json({ message: 'IDs de origem e destino são obrigatórios' }, { status: 400 })
  }

  try {
    // 1. Pega todas as questões da turma de origem
    const questionsFrom = await prisma.questao.findMany({
      where: { turmas: { some: { id: fromId } } },
      select: { id: true }
    })

    // 2. Associa cada questão à turma de destino
    for (const q of questionsFrom) {
      await prisma.questao.update({
        where: { id: q.id },
        data: {
          turmas: {
            connect: { id: toId },
            disconnect: { id: fromId }
          }
        }
      })
    }

    // 3. Opcional: Migrar estudantes também?
    const studentsFrom = await prisma.estudante.findMany({
      where: { turmas: { some: { id: fromId } } },
      select: { id: true }
    })

    for (const s of studentsFrom) {
      await prisma.estudante.update({
        where: { id: s.id },
        data: {
          turmas: {
            connect: { id: toId },
            disconnect: { id: fromId }
          }
        }
      })
    }

    return NextResponse.json({ 
      message: 'Migração concluída com sucesso',
      movedQuestions: questionsFrom.length,
      movedStudents: studentsFrom.length
    })
  } catch (error: any) {
    return NextResponse.json({ message: error.message }, { status: 500 })
  }
}
