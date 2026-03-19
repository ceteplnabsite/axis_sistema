
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const modalities = await prisma.sportModality.findMany({
    orderBy: { nome: 'asc' }
  })
  return NextResponse.json(modalities)
}

export async function POST(req: Request) {
  const session = await auth()
  if (!session?.user || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const newModality = await prisma.sportModality.create({
      data: {
        nome: data.nome,
        minPlayers: parseInt(data.minPlayers),
        maxPlayers: parseInt(data.maxPlayers),
        isActive: true
      }
    })
    return NextResponse.json(newModality)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao criar" }, { status: 500 })
  }
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const { id, ...updateData } = data
    
    const updated = await prisma.sportModality.update({
      where: { id },
      data: {
        nome: updateData.nome,
        minPlayers: updateData.minPlayers ? parseInt(updateData.minPlayers) : undefined,
        maxPlayers: updateData.maxPlayers ? parseInt(updateData.maxPlayers) : undefined,
        isActive: updateData.isActive
      }
    })
    return NextResponse.json(updated)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao atualizar" }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  const session = await auth()
  if (!session?.user || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: "ID ausente" }, { status: 400 })

    await prisma.sportModality.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: "Erro ao excluir (Pode haver times vinculados)" }, { status: 500 })
  }
}
