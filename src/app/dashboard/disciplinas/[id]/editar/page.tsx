import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import DisciplinaForm from "@/components/DisciplinaForm"

export const metadata = {
  title: 'Áxis - Disciplinas'
}

export const runtime = 'nodejs'

async function getDisciplina(id: string) {
  return await prisma.disciplina.findUnique({
    where: { id }
  })
}

export default async function EditarDisciplinaPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { id } = await params
  const disciplina = await getDisciplina(id)

  if (!disciplina) {
    redirect("/dashboard/disciplinas")
  }

  return <DisciplinaForm disciplina={disciplina} isEdit={true} />
}
