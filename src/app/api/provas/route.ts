import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search')

    const isAdmin = session.user.isSuperuser || session.user.isDirecao
    const userId = session.user.id

    const where: any = isAdmin ? {} : { professorCriadorId: userId }

    if (search) {
      where.OR = [
        { titulo: { contains: search, mode: 'insensitive' } },
        { turma: { nome: { contains: search, mode: 'insensitive' } } }
      ]
    }

    const provas = await prisma.prova.findMany({
      where,
      include: {
        turma: { select: { nome: true } },
        professorCriador: { select: { name: true } },
        savedByUser: { select: { name: true } },
        questoes: {
          select: { id: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(provas)
  } catch (error: any) {
    console.error('Erro ao buscar provas:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    console.log('Post Prova body:', body)
    const { titulo, turmaId, questoesIds, questoesSnapshot } = body

    if (!titulo || !turmaId || !questoesIds || questoesIds.length === 0) {
      return NextResponse.json({ message: 'Dados incompletos' }, { status: 400 })
    }

    // Verifica se já existe uma prova com o mesmo título
    const existing = await prisma.prova.findFirst({
      where: { titulo: { equals: titulo, mode: 'insensitive' } }
    })

    if (existing) {
      return NextResponse.json({ message: 'Já existe uma prova salva com este título. Escolha um nome diferente.' }, { status: 400 })
    }

    const prova = await prisma.prova.create({
      data: {
        titulo,
        turmaId,
        professorCriadorId: session.user.id,
        savedByUserId: session.user.id,
        questoesSnapshot: questoesSnapshot || null,
        questoes: {
          connect: questoesIds.map((id: string) => ({ id }))
        }
      },
      include: {
        turma: { select: { nome: true } },
        savedByUser: { select: { name: true } },
        questoes: true
      }
    })

    return NextResponse.json(prova, { status: 201 })
  } catch (error: any) {
    console.error('Erro ao criar prova:', error)
    return NextResponse.json({ 
      message: 'Erro ao salvar prova', 
      details: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
