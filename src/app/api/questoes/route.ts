import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logAudit } from '@/lib/audit'

export const runtime = 'nodejs'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get('turmaId')
    const serie = searchParams.get('serie')
    const disciplinaId = searchParams.get('disciplinaId')
    const disciplinaNome = searchParams.get('disciplinaNome')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const professorNome = searchParams.get('professorNome')
    const professorId = searchParams.get('professorId')
    const unidade = searchParams.get('unidade')
    const includeProvas = searchParams.get('includeProvas') === 'true'
 
    // Filtros base
    const where: any = {}
 
    // Se não for admin e não estiver buscando do banco de questões aprovadas públicas, só vê as próprias
    if (!session.user.isSuperuser && !session.user.isDirecao) {
      if (status !== 'APROVADA') {
        where.professorId = session.user.id
      }
    }
 
    if (turmaId) {
      where.turmas = { some: { id: turmaId } }
    } else if (serie) {
      where.turmas = { some: { serie: serie } }
    }
 
    if (disciplinaId) {
      where.disciplinas = { some: { id: disciplinaId } }
    } else if (disciplinaNome) {
      where.disciplinas = { some: { nome: { contains: disciplinaNome, mode: 'insensitive' } } }
    }
    if (status) where.status = status
    if (unidade) where.unidade = unidade
    if (professorId) {
      where.professorId = professorId
    } else if (professorNome) {
      where.professor = {
        name: {
          equals: professorNome,
          mode: 'insensitive'
        }
      }
    }
    if (search) {
      where.enunciado = {
        contains: search,
        mode: 'insensitive'
      }
    }

    const includeObj: any = {
      professor: { select: { name: true } },
      disciplinas: { 
        select: { 
          id: true, 
          nome: true,
          turma: { select: { nome: true } }
        } 
      },
      turmas: { select: { id: true, nome: true } },
      adminFeedback: { select: { name: true } }
    }

    if (includeProvas) {
      includeObj.provas = { select: { id: true, turmaId: true, titulo: true } }
    }

    const limitParam = searchParams.get('limit')
    const limit = limitParam ? Math.min(parseInt(limitParam), 500) : 100

    const total = await prisma.questao.count({ where })
    const questoes = await prisma.questao.findMany({
      where,
      include: includeObj,
      orderBy: { createdAt: 'desc' },
      take: limit
    })

    const response = NextResponse.json(questoes)
    response.headers.set('X-Total-Count', total.toString())
    return response
  } catch (error) {
    console.error('Erro ao buscar questões:', error)
    return NextResponse.json({ message: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session) return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })

    // Verificar se a funcionalidade está ativa para professores
    if (!session.user.isSuperuser && !session.user.isDirecao) {
      const config = await prisma.globalConfig.findUnique({ where: { id: 'global' } })
      if (config && !config.isBancoQuestoesAtivo) {
        return NextResponse.json({ message: 'Funcionalidade temporariamente desativada' }, { status: 403 })
      }
    }

    const body = await request.json()
    const { 
      enunciado, 
      alternativaA, alternativaB, alternativaC, alternativaD, alternativaE, 
      correta, dificuldade, muleta, imagemUrl, unidade,
      disciplinasIds, turmasIds 
    } = body

    const questao = await prisma.questao.create({
      data: {
        enunciado,
        alternativaA, alternativaB, alternativaC, alternativaD, alternativaE,
        correta,
        dificuldade,
        muleta,
        imagemUrl,
        unidade,
        professorId: session.user.id,
        status: 'PENDENTE',
        disciplinas: { connect: disciplinasIds.map((id: string) => ({ id })) },
        turmas: { connect: turmasIds.map((id: string) => ({ id })) }
      }
    })

    await logAudit(
      session.user.id,
      'QUESTAO',
      questao.id,
      'INSERT',
      { enunciado: enunciado.substring(0, 50) + '...' }
    )

    return NextResponse.json(questao, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar questão:', error)
    return NextResponse.json({ message: 'Erro ao salvar questão' }, { status: 500 })
  }
}
