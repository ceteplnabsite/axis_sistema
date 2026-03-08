import TurmaForm from "@/components/TurmaForm"
import { prisma } from "@/lib/prisma"

export const metadata = {
  title: 'Áxis - Turmas'
}

export const runtime = 'nodejs'

export default async function NovaTurmaPage() {
  const cursos = await prisma.curso.findMany({
    orderBy: { nome: 'asc' }
  })
  
  return <TurmaForm dbCursos={cursos} />
}
