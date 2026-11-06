import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"
import { apenasLogado } from '@/lib/api-auth'

export async function GET() {
  const negado = await apenasLogado()
  if (negado) return negado

  try {
    const areas = await prisma.areaConhecimento.findMany({
      orderBy: { nome: 'asc' }
    })
    return NextResponse.json(areas)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar áreas" }, { status: 500 })
  }
}
