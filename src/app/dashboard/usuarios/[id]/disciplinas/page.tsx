
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import VincularDisciplinasClient from "./VincularDisciplinasClient"

export const metadata = {
  title: 'Áxis - Usuarios'
}

export const runtime = 'nodejs'

async function getUsuarioEDisciplinas(id: string) {
  const usuario = await prisma.user.findUnique({
    where: { id },
    include: {
      disciplinasPermitidas: { select: { id: true } }
    }
  })

  if (!usuario) return null

  const todasDisciplinas = await prisma.disciplina.findMany({
    include: {
      turma: { select: { nome: true } }
    },
    orderBy: [
      { turma: { nome: 'asc' } },
      { nome: 'asc' }
    ]
  })

  return { usuario, todasDisciplinas }
}

export default async function VincularDisciplinasPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const session = await auth()
  
  if (!session || !session.user.isSuperuser) {
    redirect("/dashboard")
  }

  const { id } = await params
  const data = await getUsuarioEDisciplinas(id)

  if (!data) {
    redirect("/dashboard/usuarios")
  }

  return (
    <VincularDisciplinasClient 
      usuario={data.usuario} 
      todasDisciplinas={data.todasDisciplinas} 
    />
  )
}
