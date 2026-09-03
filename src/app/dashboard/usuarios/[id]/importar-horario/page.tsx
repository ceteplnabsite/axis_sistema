import { auth } from "@/lib/auth"
import { redirect, notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ImportarHorarioClient from "./ImportarHorarioClient"

export const runtime = 'nodejs'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await prisma.user.findUnique({ where: { id }, select: { name: true } })
  return { title: `Importar Horário — ${user?.name ?? 'Professor'}` }
}

export default async function ImportarHorarioPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user.isSuperuser) redirect("/dashboard")

  const { id } = await params
  const usuario = await prisma.user.findUnique({
    where: { id },
    select: { id: true, name: true, isStaff: true }
  })

  if (!usuario) notFound()

  const cursos = await prisma.curso.findMany({
    select: { id: true, nome: true, sigla: true, modalidade: true, turnos: true },
    orderBy: { nome: 'asc' }
  })

  return <ImportarHorarioClient usuario={usuario} cursos={cursos} />
}
