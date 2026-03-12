import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import UploadForm from "./UploadForm"

export const metadata = {
  title: 'Áxis - Estudantes'
}

export default async function ImportarEstudantesPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  // Fetch turmas for the datalist
  const turmas = await (prisma as any).turma.findMany({
    orderBy: { nome: 'asc' },
    select: { id: true, nome: true, modalidade: true, turno: true }
  })

  return <UploadForm turmas={turmas} />
}
