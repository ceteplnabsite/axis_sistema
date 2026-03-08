import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import MatrizCurricularClient from "@/components/MatrizCurricularClient"

export const metadata = {
  title: 'Áxis - Matriz'
}

export default async function MatrizCurricularPage() {
  const session = await auth()
  if (!session?.user?.isSuperuser && !session?.user?.isDirecao) {
    redirect("/dashboard")
  }

  const dbCursos = await prisma.curso.findMany({
    orderBy: { nome: 'asc' }
  })
  const cursos = dbCursos.map(c => ({ id: c.id, nome: c.nome, modalidade: c.modalidade }))
  const areas = await prisma.areaConhecimento.findMany({
    orderBy: { nome: 'asc' }
  })

  return <MatrizCurricularClient cursos={cursos} areas={areas} />

}
