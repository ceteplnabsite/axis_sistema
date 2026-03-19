
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"

export async function GET() {
  const session = await auth()
  if (!session?.user || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  const settings = await prisma.sportsSettings.findUnique({
    where: { id: "global_config" }
  })

  return NextResponse.json(settings)
}

export async function PATCH(req: Request) {
  const session = await auth()
  if (!session?.user || (!session.user.isSuperuser && !session.user.isDirecao)) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 })
  }

  try {
    const data = await req.json()
    const updated = await prisma.sportsSettings.upsert({
      where: { id: "global_config" },
      update: {
        termsContent: data.termsContent,
        minGrade: parseFloat(data.minGrade),
        minAttendance: parseFloat(data.minAttendance),
        maxInfrequentPercent: parseFloat(data.maxInfrequentPercent),
        isOpen: data.isOpen
      },
      create: {
        id: "global_config",
        termsContent: data.termsContent,
        minGrade: parseFloat(data.minGrade),
        minAttendance: parseFloat(data.minAttendance),
        maxInfrequentPercent: parseFloat(data.maxInfrequentPercent),
        isOpen: data.isOpen
      }
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error("Erro ao salvar configurações de jogos:", error)
    return NextResponse.json({ error: "Erro ao salvar" }, { status: 500 })
  }
}
