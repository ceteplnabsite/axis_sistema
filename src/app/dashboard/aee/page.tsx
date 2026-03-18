
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AEEDashboardClient from "./AEEDashboardClient"

export const runtime = 'nodejs'

export default async function AEEDashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isDirecao = session.user.isDirecao || session.user.isSuperuser

  // Busca turmas para o filtro (todas para direção, ou apenas permitidas para professor)
  const turmasWhere: any = {}
  if (!isDirecao) {
    turmasWhere.usuariosPermitidos = { some: { id: session.user.id } }
  }

  const todasTurmas = await prisma.turma.findMany({
    where: turmasWhere,
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  })

  // Busca perfis AEE
  const aeeWhere: any = {}
  if (!isDirecao) {
    // Alunos das turmas onde o professor tem aula
    aeeWhere.estudante = {
      turma: { usuariosPermitidos: { some: { id: session.user.id } } }
    }
  }

  const aeeAlunos = await prisma.aEEProfile.findMany({
    where: aeeWhere,
    include: {
      estudante: {
        select: { 
          matricula: true, 
          nome: true, 
          turmaId: true,
          turma: { select: { nome: true } }
        }
      },
      acknowledgements: {
        include: { user: { select: { id: true, name: true } } }
      }
    },
    orderBy: { estudante: { nome: 'asc' } }
  })

  // Busca estudantes que NÃO possuem ficha AEE (apenas para Direção)
  let estudantesSemAee: any[] = []
  if (isDirecao) {
    const config = await prisma.globalConfig.findUnique({ where: { id: 'global' } })
    const currentYear = config?.anoLetivoAtual || 2026

    estudantesSemAee = await prisma.estudante.findMany({
      where: {
        aeeProfile: { is: null },
        turma: { anoLetivo: currentYear }
      },
      select: { 
        matricula: true, 
        nome: true, 
        turma: { select: { nome: true } } 
      },
      orderBy: { nome: 'asc' }
    })
  }

  return (
    <AEEDashboardClient 
      usuario={session.user}
      aeeAlunos={aeeAlunos}
      todasTurmas={todasTurmas}
      estudantesSemAee={estudantesSemAee}
    />
  )
}
