import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

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
        area: { select: { id: true, nome: true } }
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

    const { userId, turmaId, areaId, anoLetivo = 2026 } = await request.json()

    if (!userId || !turmaId || !areaId) {
      return NextResponse.json({ message: "Preencha todos os campos" }, { status: 400 })
    }

    console.log("DEBUG: Chaves do Prisma:", Object.keys(prisma))
    
    // Fallback: tentar acessar por case-insensitive se falhar
    const modelName = Object.keys(prisma).find(k => k.toLowerCase() === "responsavelsimulado") || "responsavelSimulado"

    const responsavel = await (prisma as any)[modelName].upsert({
      where: {
        turmaId_areaId_anoLetivo: {
          turmaId,
          areaId,
          anoLetivo
        }
      },
      update: {
        userId
      },
      create: {
        userId,
        turmaId,
        areaId,
        anoLetivo
      }
    })

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
