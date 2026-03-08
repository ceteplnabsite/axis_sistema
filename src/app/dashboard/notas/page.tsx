import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { ArrowLeft, Award, TrendingUp, FileText } from "lucide-react"
import NotasClient from "./NotasClient"

export const metadata = {
  title: 'Áxis - Notas'
}

import { getTurmasPermitidas } from "@/lib/data-fetching"

export const runtime = 'nodejs'



export default async function LancarNotasPage() {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const turmas = await getTurmasPermitidas(session)

  return <NotasClient turmas={turmas} />
}
