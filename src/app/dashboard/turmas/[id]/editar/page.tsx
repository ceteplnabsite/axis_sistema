import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import TurmaForm from "@/components/TurmaForm"

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

async function getTurma(id: string) {
  return await prisma.turma.findUnique({
    where: { id }
  })
}

export default async function EditarTurmaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const turma = await getTurma(id)

  if (!turma) {
    redirect("/dashboard/turmas")
  }

  const cursos = await prisma.curso.findMany({
    orderBy: { nome: 'asc' }
  })

  return <TurmaForm turma={turma} isEdit={true} dbCursos={cursos} />
}
