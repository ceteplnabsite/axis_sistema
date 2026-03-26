
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matricula } = await params
  const session = await auth()
  const isAEE = (session?.user as any)?.isAEE

  if (!session?.user.isDirecao && !session?.user.isSuperuser && !isAEE) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 })
  }

  try {
    const data = await request.json()
    const { 
      cids, condicao, recomendacoes, notasDirecao, 
      contatoNome, contatoTelefone,
      precisaProvaAdaptada, precisaProvaSalaEspecial 
    } = data

    const profile = await prisma.aEEProfile.upsert({
      where: { estudanteId: matricula },
      update: {
        cids: cids || [],
        condicao,
        recomendacoes,
        notasDirecao,
        contatoNome,
        contatoTelefone,
        precisaProvaAdaptada: precisaProvaAdaptada ?? false,
        precisaProvaSalaEspecial: precisaProvaSalaEspecial ?? false,
        fotoUrl: data.fotoUrl
      },
      create: {
        estudanteId: matricula,
        cids: cids || [],
        condicao,
        recomendacoes,
        notasDirecao,
        contatoNome,
        contatoTelefone,
        precisaProvaAdaptada: precisaProvaAdaptada ?? false,
        precisaProvaSalaEspecial: precisaProvaSalaEspecial ?? false,
        fotoUrl: data.fotoUrl
      }
    })

    return NextResponse.json(profile)
  } catch (error: any) {
    console.error("Erro AEE Save:", error)
    return NextResponse.json({ message: "Erro ao salvar: " + error.message }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: matricula } = await params
  const session = await auth()
  const isAEE = (session?.user as any)?.isAEE

  if (!session?.user.isDirecao && !session?.user.isSuperuser && !isAEE) {
    return NextResponse.json({ message: "Não autorizado" }, { status: 403 })
  }

  try {
    // Primeiro deletar os acknowledgements (ciências) relacionados
    await prisma.aEEAcknowledgement.deleteMany({
      where: { profile: { estudanteId: matricula } }
    })

    // Depois deletar o perfil
    await prisma.aEEProfile.delete({
      where: { estudanteId: matricula }
    })

    return NextResponse.json({ message: "Ficha excluída com sucesso" })
  } catch (error: any) {
    console.error("Erro AEE Delete:", error)
    return NextResponse.json({ message: "Erro ao excluir: " + error.message }, { status: 500 })
  }
}
