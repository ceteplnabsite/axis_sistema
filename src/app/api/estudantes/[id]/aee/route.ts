
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matricula } = await params
  const session = await auth()

  if (!session?.user.isDirecao && !session?.user.isSuperuser) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const { cids, condicao, recomendacoes, notasDirecao, contatoEmergencia } = data

    const profile = await prisma.aEEProfile.upsert({
      where: { estudanteId: matricula },
      update: {
        cids,
        condicao,
        recomendacoes,
        notasDirecao,
        contatoEmergencia
      },
      create: {
        estudanteId: matricula,
        cids,
        condicao,
        recomendacoes,
        notasDirecao,
        contatoEmergencia
      }
    })

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error("Erro AEE Save:", error)
    return NextResponse.json({ message: "Erro ao salvar: " + error.message }, { status: 500 })
  }
}
