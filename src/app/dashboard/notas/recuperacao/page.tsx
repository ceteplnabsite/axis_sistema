import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { ArrowLeft, TrendingUp } from "lucide-react"
import RecuperacaoPageClient from "./RecuperacaoPageClient"

export const metadata = {
  title: 'Áxis - Notas'
}

export const runtime = 'nodejs'

import { getTurmasPermitidas } from "@/lib/data-fetching"
import { Session } from "next-auth"

async function getTurmasComRecuperacao(session: Session) {
  // Buscar apenas as turmas que o usuário tem permissão
  const turmasPermitidas = await getTurmasPermitidas(session)
  const turmasIds = turmasPermitidas.map(t => t.id)

  const turmas = await prisma.turma.findMany({
    where: {
      id: { in: turmasIds }
    },
    include: {
      estudantes: {
        include: {
          notas: {
            where: {
              OR: [
                {
                  AND: [
                    { nota: { lt: 5 } },
                    { nota1: { not: null } },
                    { nota2: { not: null } },
                    { nota3: { not: null } }
                  ]
                },
                { status: 'DESISTENTE' },
                { status: 'RECUPERACAO' }
              ]
            },
            include: {
              disciplina: true
            }
          }
        }
      },
      _count: {
        select: {
          estudantes: true,
          disciplinas: true
        }
      }
    },
    orderBy: {
      nome: 'asc'
    }
  })

  // Filtrar apenas turmas com estudantes em recuperação
  return turmas.filter(turma => 
    turma.estudantes.some(est => est.notas.length > 0)
  ).map(turma => ({
    ...turma,
    totalRecuperacao: turma.estudantes.filter(est => est.notas.length > 0).length
  }))
}

export default async function RecuperacaoPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const turmas = await getTurmasComRecuperacao(session)
  // Calcular total de estudantes em recuperação
  const totalAlunosEmRecuperacao = turmas.reduce((acc, t) => acc + t.totalRecuperacao, 0)

  return <RecuperacaoPageClient turmas={turmas} totalAlunosEmRecuperacao={totalAlunosEmRecuperacao} />
}
