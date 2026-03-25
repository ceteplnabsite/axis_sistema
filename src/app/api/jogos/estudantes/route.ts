
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  // Aceita 'query' (padrão do front) ou 'q' (padrão antigo)
  const query = searchParams.get("query") || searchParams.get("q") || ""
  const turmaId = searchParams.get("turmaId") || ""
  const matricula = searchParams.get("matricula") || ""

  try {
    // Função auxiliar para verificar elegibilidade
    const checkEligibility = async (student: any) => {
      if (!student) return null;

      // 1. Contar total de disciplinas da turma
      const totalDisciplinas = await prisma.disciplina.count({
        where: { turmaId: student.turmaId }
      });

      // 2. Contar disciplinas onde o aluno tem média >= 6.0
      const disciplinasAprovadas = await prisma.notaFinal.count({
        where: {
          estudanteId: student.matricula,
          nota: { gte: 6.0 }
        }
      });

      const percAprovacao = totalDisciplinas > 0 ? (disciplinasAprovadas / totalDisciplinas) : 0;
      const isEligible = percAprovacao >= 0.75;

      return {
        isEligible,
        stats: {
          total: totalDisciplinas,
          aprovadas: disciplinasAprovadas,
          percentual: Math.round(percAprovacao * 100)
        },
        motivo: !isEligible ? `Média >= 6.0 em apenas ${Math.round(percAprovacao * 100)}% das disciplinas (mínimo 75%)` : null
      };
    };

    // Busca um único aluno por matrícula (para o líder do time)
    if (matricula) {
      const student = await prisma.estudante.findUnique({
        where: { matricula },
        include: { turma: true }
      })

      if (student) {
        const eligibility = await checkEligibility(student);
        return NextResponse.json({ 
          estudante: { 
            ...student, 
            eligibility 
          } 
        })
      }
      return NextResponse.json({ estudante: null })
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

    // Adicionar elegibilidade para cada resultado da busca
    const studentsWithEligibility = await Promise.all(students.map(async (s) => ({
      ...s,
      eligibility: await checkEligibility(s)
    })));

    // Retorna no formato que o JogosClient.tsx espera (data.estudantes)
    return NextResponse.json({ estudantes: studentsWithEligibility })
  } catch (error) {
    console.error("Erro ao buscar alunos:", error)
    return NextResponse.json({ error: "Erro interno" }, { status: 500 })
  }
}
