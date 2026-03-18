
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import AEEDashboardClient from "./AEEDashboardClient"

export const runtime = 'nodejs'

export default async function AEEDashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const isDirecao = session.user.isDirecao || session.user.isSuperuser

  const turmasWhere: any = {}
  if (!isDirecao) {
    // Turmas vinculadas via Disciplinas OU manual
    turmasWhere.OR = [
      { usuariosPermitidos: { some: { id: session.user.id } } },
      { disciplinas: { some: { usuariosPermitidos: { some: { id: session.user.id } } } } }
    ]
  }

  const todasTurmas = await prisma.turma.findMany({
    where: turmasWhere,
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  })

  // Busca perfis AEE
  const aeeWhere: any = {}
  if (!isDirecao) {
    // Alunos das turmas onde o professor tem disciplina vinculada OU manual
    aeeWhere.estudante = {
      turma: { 
        OR: [
          { usuariosPermitidos: { some: { id: session.user.id } } },
          { 
            disciplinas: {
              some: {
                usuariosPermitidos: {
                  some: { id: session.user.id }
                }
              }
            }
          }
        ]
      }
    }
  }

  const aeeAlunos = await prisma.aEEProfile.findMany({
    where: aeeWhere,
    include: {
      estudante: {
        include: {
          turma: { select: { id: true, nome: true, serie: true } }
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
