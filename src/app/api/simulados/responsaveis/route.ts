import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isSuperuser && ! (session as any)?.user?.isDirecao) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const turmaId = searchParams.get("turmaId") || undefined
    const anoLetivo = searchParams.get("anoLetivo") ? parseInt(searchParams.get("anoLetivo")!) : 2026

    const responsaveis = await (prisma as any).responsavelSimulado.findMany({
      where: {
        turmaId,
        anoLetivo
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        turma: { select: { id: true, nome: true } },
        area: { select: { id: true, nome: true } },
        prova: { select: { id: true, titulo: true, codigo: true } }
      }
    })

    return NextResponse.json(responsaveis)
  } catch (error) {
    console.error("Erro ao buscar responsáveis de simulado:", error)
    return NextResponse.json({ message: "Erro interno" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.isSuperuser && ! (session as any)?.user?.isDirecao) {
      return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    }

    const { userId, turmaId, areaId, provaId, unidade, anoLetivo = 2026 } = await request.json()

    if (!userId || !turmaId || (!areaId && !provaId)) {
      return NextResponse.json({ message: "Preencha os campos obrigatórios (Usuário, Turma, Prova/Área)" }, { status: 400 })
    }

    const modelName = Object.keys(prisma).find(k => k.toLowerCase() === "responsavelsimulado") || "responsavelSimulado"

    // Busca se já existe um responsável para esta turma + prova + unidade (ou área)
    let whereClause: any = { turmaId, anoLetivo }
    if (provaId) {
      whereClause.provaId = provaId
      if (unidade) whereClause.unidade = parseInt(unidade.toString())
    } else {
      whereClause.areaId = areaId
    }

    let responsavel = await (prisma as any)[modelName].findFirst({
      where: whereClause
    })

    if (responsavel) {
      responsavel = await (prisma as any)[modelName].update({
        where: { id: responsavel.id },
        data: { userId }
      })
    } else {
      responsavel = await (prisma as any)[modelName].create({
        data: {
          userId,
          turmaId,
          areaId: areaId || null,
          provaId: provaId || null,
          unidade: unidade ? parseInt(unidade.toString()) : null,
          anoLetivo
        }
      })
    }

    return NextResponse.json(responsavel)
  } catch (error) {
    console.error("Erro ao designar responsável:", error)
    return NextResponse.json({ message: "Erro ao salvar" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
    try {
      const session = await auth()
      if (!session?.user?.isSuperuser && ! (session as any)?.user?.isDirecao) {
        return NextResponse.json({ message: "Não autorizado" }, { status: 401 })
      }
  
      const { searchParams } = new URL(request.url)
      const id = searchParams.get("id")
      
      if (!id) return NextResponse.json({ message: "ID obrigatório" }, { status: 400 })
  
      await (prisma as any).responsavelSimulado.delete({ where: { id } })
  
      return NextResponse.json({ message: "Responsável removido" })
    } catch (error) {
      return NextResponse.json({ message: "Erro ao remover" }, { status: 500 })
    }
}
