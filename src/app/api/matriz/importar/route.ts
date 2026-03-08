import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) return NextResponse.json({ message: "Não autorizado" }, { status: 401 })

    const { turmaId, cursoId, serie } = await request.json()

    if (!turmaId || !cursoId || !serie) {
      return NextResponse.json({ message: "Turma, Curso e Série são obrigatórios" }, { status: 400 })
    }

    // 1. Buscar disciplinas da matriz para este curso/série
    const matrizItems = await prisma.matrizCurricular.findMany({
      where: { cursoId, serie }
    })

    if (matrizItems.length === 0) {
      return NextResponse.json({ message: "Nenhuma disciplina encontrada na matriz para este curso/série" }, { status: 404 })
    }

    // 2. Verificar quais já existem na turma para não duplicar
    const existing = await prisma.disciplina.findMany({
      where: { turmaId },
      select: { nome: true }
    })
    const existingNames = new Set(existing.map(e => e.nome))

    // 3. Filtrar apenas as que não existem
    const toCreate = matrizItems
      .filter(m => !existingNames.has(m.nome))
      .map(m => ({
        nome: m.nome,
        turmaId: turmaId,
        areaId: m.areaId
      }))

    if (toCreate.length > 0) {
      await prisma.disciplina.createMany({
        data: toCreate
      })
    }

    return NextResponse.json({ 
      message: "Disciplinas importadas com sucesso", 
      count: toCreate.length 
    })
  } catch (error) {
    console.error("Erro ao importar matriz:", error)
    return NextResponse.json({ message: "Erro ao importar disciplinas" }, { status: 500 })
  }
}
