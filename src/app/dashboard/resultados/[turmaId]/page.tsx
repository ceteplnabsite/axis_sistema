import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ResultadosClient from "./ResultadosClient"

export const metadata = {
  title: 'Áxis - Resultados'
}

export const runtime = 'nodejs'

async function getNotasResultados(turmaId: string) {
  // Usamos Row SQL para contornar o cache do Prisma Client desatualizado no servidor Next.js dev
  // e garantir que os campos nota_1, nota_2 e nota_3 sejam lidos corretamente.
  try {
    const rawNotas = await prisma.$queryRaw<any[]>`
      SELECT 
        nf.id,
        nf.nota,
        nf."nota_1" as "nota1",
        nf."nota_2" as "nota2",
        nf."nota_3" as "nota3",
        nf."nota_recuperacao" as "notaRecuperacao",
        nf.status,
        nf."is_desistente_unid1" as "isDesistenteUnid1",
        nf."is_desistente_unid2" as "isDesistenteUnid2",
        nf."is_desistente_unid3" as "isDesistenteUnid3",
        nf."estudante_id" as "estudanteId",
        e.nome as "estudanteNome",
        nf."disciplina_id" as "disciplinaId",
        d.nome as "disciplinaNome"
      FROM "notas_finais" nf
      INNER JOIN "estudantes" e ON e.matricula = nf."estudante_id"
      INNER JOIN "disciplinas" d ON d.id = nf."disciplina_id"
      WHERE e."turma_id" = ${turmaId}
    `

    const turma = await prisma.turma.findUnique({
      where: { id: turmaId },
      include: {
        disciplinas: {
          orderBy: { nome: 'asc' }
        }
      }
    })

    if (!turma) return null

    return {
      turma,
      disciplinas: turma.disciplinas,
      notasResultados: rawNotas
    }
  } catch (error) {
    console.error("Erro ao buscar notas via SQL na página de resultados:", error)
    return null
  }
}

export default async function ResultadosTurmaPage({
  params
}: {
  params: Promise<{ turmaId: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { turmaId } = await params
  const data = await getNotasResultados(turmaId)

  if (!data) {
    redirect("/dashboard/resultados")
  }

  return (
    <ResultadosClient
      turmaId={data.turma.id}
      turmaNome={data.turma.nome}
      disciplinas={data.disciplinas}
      initialNotas={data.notasResultados}
    />
  )
}
