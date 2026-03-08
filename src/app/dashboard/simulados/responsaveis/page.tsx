import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import ResponsaveisClient from "./ResponsaveisClient"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: 'Áxis - Simulados'
}

export default async function ResponsaveisSimuladoPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const user = session.user as any
  if (!user.isSuperuser && !user.isDirecao) {
    redirect("/dashboard/simulados")
  }

  const [turmas, areas, professores] = await Promise.all([
    prisma.turma.findMany({ 
        where: { anoLetivo: 2026 },
        orderBy: { nome: 'asc' } 
    }),
    prisma.areaConhecimento.findMany({ 
        orderBy: { nome: 'asc' } 
    }),
    prisma.user.findMany({
      where: { 
        isPortalUser: false,
        name: {
            notIn: [
                'Equipe Administrativa', 
                'Todos os Estudantes', 
                'Todos os Professores', 
                'Equipe de Suporte',
                'Administrador'
            ]
        }
      },
      select: { id: true, name: true, email: true },
      orderBy: { name: 'asc' }
    })
  ])

  return (
    <ResponsaveisClient 
      turmas={turmas} 
      areas={areas} 
      professores={professores}
    />
  )
}
