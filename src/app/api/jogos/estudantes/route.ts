
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q") || ""
  const turmaId = searchParams.get("turmaId") || ""
  const matricula = searchParams.get("matricula") || ""

  try {
    // Busca um único aluno por matrícula (para o líder do time)
    if (matricula) {
      const student = await prisma.estudante.findUnique({
        where: { matricula },
        include: { turma: true }
      })
      return NextResponse.json(student ? [student] : [])
    }

    // Busca dinâmica por nome e/ou turma
    const students = await prisma.estudante.findMany({
      where: {
        AND: [
          turmaId ? { turmaId } : {},
          query ? {
            OR: [
              { nome: { contains: query, mode: 'insensitive' } },
              { matricula: { contains: query, mode: 'insensitive' } }
            ]
          } : {}
        ]
      },
      include: { turma: true },
      take: 15,
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error("Erro ao buscar alunos:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
