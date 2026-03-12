import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

// GET ocorrencias com filtros
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const studentName = searchParams.get('studentName')
    const type = searchParams.get('type')

    const where: any = {}

    if (startDate || endDate) {
      where.data = {}
      if (startDate) where.data.gte = new Date(startDate)
      if (endDate) where.data.lte = new Date(endDate)
    }

    if (type) {
      where.tipo = type
    }

    if (studentName) {
      where.estudantes = {
        some: {
          nome: {
            contains: studentName,
            mode: 'insensitive'
          }
        }
      }
    }

    const ocorrencias = await prisma.ocorrencia.findMany({
      where,
      include: {
        estudantes: {
          include: {
            turma: {
              select: { nome: true }
            }
          }
        },
        autor: {
          select: { name: true }
        }
      },
      orderBy: { data: 'desc' }
    })

    return NextResponse.json(ocorrencias)
  } catch (error) {
    console.error('Erro ao buscar ocorrências:', error)
    return NextResponse.json({ message: 'Erro ao buscar ocorrências' }, { status: 500 })
  }
}

// POST criar ocorrência
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session || (!session.user.isSuperuser && !session.user.isDirecao)) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }

    const { titulo, descricao, tipo, data, estudantesIds } = await request.json()

    if (!titulo || !descricao || !tipo || !estudantesIds || estudantesIds.length === 0) {
      return NextResponse.json({ message: 'Dados incompletos' }, { status: 400 })
    }

    const ocorrencia = await prisma.ocorrencia.create({
      data: {
        titulo,
        descricao,
        tipo,
        data: data ? new Date(data) : new Date(),
        registradoPorId: session.user.id,
        estudantes: {
          connect: estudantesIds.map((id: string) => ({ matricula: id }))
        }
      },
      include: {
        estudantes: {
          select: { nome: true }
        }
      }
    })

    await logAudit(
      session.user.id,
      'OCORRENCIA',
      ocorrencia.id,
      'CREATE',
      { 
        titulo: ocorrencia.titulo, 
        estudantes: ocorrencia.estudantes.map(e => e.nome).join(', ') 
      }
    )

    return NextResponse.json(ocorrencia)
  } catch (error) {
    console.error('Erro ao criar ocorrência:', error)
    return NextResponse.json({ message: 'Erro ao criar ocorrência' }, { status: 500 })
  }
}
