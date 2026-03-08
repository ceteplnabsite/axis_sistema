import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const areas = await prisma.areaConhecimento.findMany({
      orderBy: { nome: 'asc' }
    })
    return NextResponse.json(areas)
  } catch (error) {
    return NextResponse.json({ error: "Erro ao buscar áreas" }, { status: 500 })
  }
}
