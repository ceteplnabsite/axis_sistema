import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { dadosResultados } from "@/lib/resultados"
import ResultadosClient from "./ResultadosClient"

export const metadata = {
  title: 'Áxis - Resultados'
}

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function ResultadosTurmaPage({
  params
}: {
  params: Promise<{ turmaId: string }>
}) {
  const session = await auth()
  if (!session) redirect("/login")
  // Mesma regra da lista de Resultados: só Direção e TI
  if (!session.user.isSuperuser && !session.user.isDirecao) redirect("/dashboard")

  const { turmaId } = await params
  const data = await dadosResultados(turmaId)
  if (!data) redirect("/dashboard/resultados")

  return (
    <ResultadosClient
      turmaId={data.turma.id}
      turmaNome={data.turma.nome}
      turmaEncerrada={data.turma.status === 'ENCERRADA'}
      semestral={data.semestral}
      disciplinas={data.disciplinas}
      initialNotas={data.notas}
      initialEstudantes={data.estudantes}
    />
  )
}
