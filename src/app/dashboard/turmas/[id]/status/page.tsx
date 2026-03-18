import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RelatorioStatusClient from "./RelatorioStatusClient"

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

async function getRelatorioStatus(turmaId: string) {
  return await prisma.turma.findUnique({
    where: { id: turmaId },
    include: {
      disciplinas: {
        orderBy: { nome: 'asc' }
      },
      estudantes: {
        include: {
          aeeProfile: { select: { id: true } },
          notas: {
            include: {
              disciplina: true
            }
          }
        },
        orderBy: { nome: 'asc' }
      }
    }
  })
}

export default async function RelatorioStatusPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const turma = await getRelatorioStatus(id)

  if (turma?.estudantes?.[0]?.notas) {
    console.log('DEBUG NOTAS (First Student):', JSON.stringify(turma.estudantes[0].notas, null, 2))
  }

  if (!turma) {
    redirect("/dashboard/turmas")
  }

  return <RelatorioStatusClient turma={turma} />
}
