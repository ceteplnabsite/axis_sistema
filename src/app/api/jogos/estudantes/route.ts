import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

/**
 * Busca pública de estudantes para a inscrição dos Jogos (página /jogos, sem login).
 * Para não virar uma lista aberta de alunos:
 * - só funciona com as inscrições abertas;
 * - busca por nome exige 3 letras ou uma turma;
 * - devolve só o necessário para montar o time (matrícula, nome, turma, sexo) — sem data de nascimento/status.
 */
const CAMPOS = { matricula: true, nome: true, sexo: true, turma: { select: { id: true, nome: true } } } as const

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const query = (searchParams.get("query") || searchParams.get("q") || "").trim()
  const turmaId = searchParams.get("turmaId") || ""
  const matricula = (searchParams.get("matricula") || "").trim()

  try {
    const config = await prisma.sportsSettings.findUnique({ where: { id: "global_config" }, select: { isOpen: true } })
    if (!config?.isOpen) return NextResponse.json({ error: "Inscrições fechadas" }, { status: 403 })

    // Líder do time: busca exata pela matrícula que ele mesmo digitou
    if (matricula) {
      if (matricula.length < 4) return NextResponse.json({ estudante: null })
      const student = await prisma.estudante.findUnique({ where: { matricula }, select: CAMPOS })
      return NextResponse.json({ estudante: student || null })
    }

    if (query.length < 3 && !turmaId) return NextResponse.json({ estudantes: [] })

    const students = await prisma.estudante.findMany({
      where: {
        AND: [
          turmaId ? { turmaId } : {},
          query.length >= 3 ? { nome: { contains: query, mode: 'insensitive' } } : {}
        ]
      },
      select: CAMPOS,
      take: 15,
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json({ estudantes: students })
  } catch (error) {
    console.error("Erro ao buscar alunos:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
