import { Metadata } from "next"
import OcorrenciasClient from "./OcorrenciasClient"

export const metadata: Metadata = {
  title: "Registro de Ocorrências | Áxis",
  description: "Livro de registros e ocorrências escolares.",
}

import { prisma } from "@/lib/prisma"
import { getGlobalConfig } from "@/lib/data-fetching"

export default async function OcorrenciasPage() {
  const config = await getGlobalConfig()
  const currentYear = config?.anoLetivoAtual || new Date().getFullYear()

  const turmas = await prisma.turma.findMany({
    where: {
      anoLetivo: currentYear
    },
    select: {
      id: true,
      nome: true
    },
    orderBy: {
      nome: 'asc'
    }
  })

  return (
    <OcorrenciasClient turmas={turmas} />
  )
}
