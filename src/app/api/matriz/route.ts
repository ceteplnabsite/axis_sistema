import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {

    const { searchParams } = new URL(request.url)
    const cursoId = searchParams.get("cursoId")
    const serie = searchParams.get("serie")
    const anoLetivo = searchParams.get("anoLetivo")
    const q = searchParams.get("q")

    const where: any = {}
    if (cursoId) where.cursoId = cursoId
    if (serie) where.serie = serie
    if (anoLetivo) where.anoLetivo = parseInt(anoLetivo)
    
    if (q) {
      where.nome = { contains: q, mode: 'insensitive' }
    }

    if (!(prisma as any).matrizCurricular) {
      console.error("DEBUG: matrizCurricular está ausente no objeto prisma!")
      console.error("DEBUG: Chaves disponíveis:", Object.keys(prisma))
    }

    const matriz = await (prisma as any).matrizCurricular.findMany({
      where,
      include: {
        area: { select: { nome: true } },
        // @ts-ignore
        curso: { select: { nome: true, modalidade: true } }
      },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json(matriz)
  } catch (error) {
    console.error("ERRO GET /api/matriz:", error)
    return NextResponse.json({ message: "Erro ao buscar matriz", error: String(error) }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const { nome, cursoId, serie, areaId, anoLetivo } = await request.json()

    const config = await prisma.globalConfig.findUnique({ where: { id: 'global' } })
    const currentYear = anoLetivo ? parseInt(anoLetivo) : (config?.anoLetivoAtual || new Date().getFullYear())

    // 1. Salva / atualiza o item na Matriz Curricular (padrão)
    const item = await (prisma as any).matrizCurricular.upsert({
      where: {
        nome_cursoId_serie_anoLetivo: { 
          nome, 
          cursoId, 
          serie, 
          anoLetivo: currentYear 
        }
      },
      update: { areaId: areaId || null },
      create: { 
        nome, 
        cursoId, 
        serie, 
        areaId: areaId || null,
        anoLetivo: currentYear
      }
    })

    // 2. Propaga para todas as turmas que correspondem a esse curso/série/ano
    //    (skipDuplicates ignora turmas que já têm a disciplina com o mesmo nome)
    const turmasAfetadas = await prisma.turma.findMany({
      where: {
        cursoId,
        serie,
        anoLetivo: currentYear
      },
      select: { id: true }
    })

    let propagadas = 0
    if (turmasAfetadas.length > 0) {
      const result = await prisma.disciplina.createMany({
        data: turmasAfetadas.map(t => ({
          nome,
          turmaId: t.id,
          areaId: areaId || null
        })),
        skipDuplicates: true
      })
      propagadas = result.count
      console.log(`📚 Disciplina "${nome}" propagada para ${propagadas} turma(s)`)
    }

    return NextResponse.json({ 
      ...item, 
      propagadas,
      message: propagadas > 0 
        ? `Adicionada à matriz e propagada para ${propagadas} turma(s)` 
        : 'Adicionada à matriz'
    })
  } catch (error) {
    console.error("ERRO POST /api/matriz:", error)
    return NextResponse.json({ message: "Erro ao criar item na matriz", error: String(error) }, { status: 500 })
  }
}


export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const { id, nome, areaId } = await request.json()
    if (!id) return NextResponse.json({ message: "ID obrigatório" }, { status: 400 })

    // 1. Busca dado atual para saber o que propagar
    const oldItem = await (prisma as any).matrizCurricular.findUnique({
      where: { id }
    })

    if (!oldItem) return NextResponse.json({ message: "Item não encontrado" }, { status: 404 })

    // 2. Atualiza na matriz
    const updated = await (prisma as any).matrizCurricular.update({
      where: { id },
      data: { 
        nome: nome || oldItem.nome,
        areaId: areaId !== undefined ? (areaId || null) : oldItem.areaId
      }
    })

    // 3. Se o nome mudou, propaga para turmas
    let propagadas = 0
    if (nome && nome !== oldItem.nome) {
      const turmas = await prisma.turma.findMany({
        where: {
          cursoId: oldItem.cursoId,
          serie: oldItem.serie,
          anoLetivo: oldItem.anoLetivo
        },
        select: { id: true }
      })

      if (turmas.length > 0) {
        const result = await prisma.disciplina.updateMany({
          where: {
            turmaId: { in: turmas.map(t => t.id) },
            nome: oldItem.nome
          },
          data: { nome: nome }
        })
        propagadas = result.count
      }
    }


    return NextResponse.json({ 
      ...updated, 
      propagadas,
      message: `Item atualizado. ${propagadas} turmas sincronizadas.` 
    })
  } catch (error) {
    console.error("ERRO PATCH /api/matriz:", error)
    return NextResponse.json({ message: "Erro ao atualizar", error: String(error) }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
    try {
      const session = await auth()
      if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
  
      const { searchParams } = new URL(request.url)
      const id = searchParams.get("id")
      
      if (!id) return NextResponse.json({ message: "ID obrigatório" }, { status: 400 })
  
      await prisma.matrizCurricular.delete({ where: { id } })
  
      return NextResponse.json({ message: "Removido da matriz" })
    } catch (error) {
      return NextResponse.json({ message: "Erro ao remover" }, { status: 500 })
    }
}
