
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    // Busca ou cria as configurações globais
    let settings = await prisma.sportsSettings.findUnique({
      where: { id: "global_config" }
    })

    if (!settings) {
      settings = await prisma.sportsSettings.create({
        data: {
          id: "global_config",
          termsContent: "Bem-vindo aos Jogos Escolares CETEP! Ao se inscrever, você atesta compromisso com o fair-play e rendimento acadêmico.",
          minGrade: 6.0,
          minAttendance: 75.0,
          maxInfrequentPercent: 20.0
        }
      })
    }

    // Busca as modalidades ativas
    const modalities = await prisma.sportModality.findMany({
      where: { isActive: true },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json({ settings, modalities })
  } catch (error) {
    console.error("Erro ao buscar configurações de jogos:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
