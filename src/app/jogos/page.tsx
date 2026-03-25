
import { prisma } from "@/lib/prisma"
import JogosClient from "./JogosClient"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Jogos Escolares CETEP - Inscrições Abertas!",
  description: "Faça sua inscrição nos jogos escolares, acompanhe seu time e represente sua turma!",
}

export const dynamic = 'force-dynamic'

export default async function JogosPage() {
  // Buscar Configurações e Modalidades do Banco
  let settings = await prisma.sportsSettings.findUnique({
    where: { id: "global_config" }
  })

  // Criar config inicial se não existir
  if (!settings) {
    settings = await prisma.sportsSettings.create({
      data: {
        id: "global_config",
        termsContent: "Para participar, os alunos devem manter média mínima de 6.0, frequência de 75% e comportamento exemplar. Aceito que minha data de nascimento e demais dados sejam utilizados para fins de organização esportiva.",
        minGrade: 6.0,
        minAttendance: 75.0,
        maxInfrequentPercent: 20.0,
        isOpen: true
      }
    })
  }

  const modalities = await prisma.sportModality.findMany({
    where: { isActive: true },
    orderBy: { nome: 'asc' }
  })

  const turmas = await prisma.turma.findMany({
    select: { id: true, nome: true },
    orderBy: { nome: 'asc' }
  })

  return <JogosClient 
    initialConfig={JSON.parse(JSON.stringify(settings))} 
    modalities={JSON.parse(JSON.stringify(modalities))} 
    turmas={JSON.parse(JSON.stringify(turmas))}
  />
}
