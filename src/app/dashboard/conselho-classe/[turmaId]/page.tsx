import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ConselhoClasseClient from "./ConselhoClasseClient"

export const metadata = {
  title: 'Áxis - Conselho classe'
}

export const runtime = 'nodejs'

async function getNotasConselho(turmaId: string) {
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    include: {
      estudantes: {
        include: {
          notas: {
            include: {
              disciplina: true
            }
          }
        }
      }
    }
  })

  if (!turma) return null

  const isSemestral = turma.modalidade === 'PROEJA' || turma.modalidade === 'SUBSEQUENTE'

  // Filtrar notas que precisam de conselho
  const notasFiltradas = turma.estudantes.flatMap((estudante: any) =>
    estudante.notas.filter((nota: any) => {
      // 1. Status que explicitamente pedem conselho
      const statusConselho = [
        'RECUPERACAO', 
        'DESISTENTE', 
        'APROVADO_CONSELHO', 
        'DEPENDENCIA', 
        'CONSERVADO', 
        'APROVADO_RECUPERACAO'
      ]
      if (statusConselho.includes(nota.status)) return true

      // 2. Turmas anuais: precisa de 3 notas (ou flag desistente) e ainda não aprovado
      if (!isSemestral) {
        const hasN1 = nota.nota1 !== null || nota.isDesistenteUnid1
        const hasN2 = nota.nota2 !== null || nota.isDesistenteUnid2
        const hasN3 = nota.nota3 !== null || nota.isDesistenteUnid3
        return hasN1 && hasN2 && hasN3 && nota.status !== 'APROVADO'
      }

      // 3. Turmas semestrais: precisa de 2 notas (ou flag desistente) e ainda não aprovado
      const hasU1 = nota.nota1 !== null || nota.isDesistenteUnid1
      const hasU2 = nota.nota2 !== null || nota.isDesistenteUnid2
      return hasU1 && hasU2 && nota.status !== 'APROVADO'
    }).map((nota: any) => ({
      id: nota.id,
      nota: nota.nota,
      nota1: nota.nota1,
      nota2: nota.nota2,
      nota3: nota.nota3,
      notaRecuperacao: nota.notaRecuperacao,
      status: nota.status,
      isDesistenteUnid1: nota.isDesistenteUnid1,
      isDesistenteUnid2: nota.isDesistenteUnid2,
      isDesistenteUnid3: nota.isDesistenteUnid3,
      estudanteId: estudante.matricula,
      estudanteNome: estudante.nome,
      disciplinaId: nota.disciplinaId,
      disciplinaNome: nota.disciplina.nome
    }))
  )

  return {
    turma,
    notasConselho: notasFiltradas
  }
}

export default async function ConselhoClasseTurmaPage({
  params
}: {
  params: Promise<{ turmaId: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { turmaId } = await params
  const data = await getNotasConselho(turmaId)

  if (!data) {
    redirect("/dashboard/conselho-classe")
  }

  return (
    <ConselhoClasseClient
      turmaId={data.turma.id}
      turmaNome={data.turma.nome}
      turmaCurso={data.turma.curso}
      turmaTurno={data.turma.turno}
      turmaModalidade={data.turma.modalidade}
      notasConselho={data.notasConselho}
    />
  )
}
