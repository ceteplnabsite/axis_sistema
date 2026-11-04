import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import RecuperacaoClient from "./RecuperacaoClient"
import { ESTUDANTE_ATIVO } from "@/lib/notas-pendentes"
import { isTurmaSemestral, unidadesFaltando } from "@/lib/conselho"

export const metadata = {
  title: 'Áxis - Notas'
}

import { Session } from "next-auth"

export const runtime = 'nodejs'

async function getNotasRecuperacao(turmaId: string, session: Session) {
  // 1. Buscar disciplinas permitidas para o usuário nesta turma
  const whereDisciplinas: any = { turmaId }
  
  if (!session.user.isSuperuser && !session.user.isDirecao) {
    whereDisciplinas.usuariosPermitidos = {
      some: { id: session.user.id }
    }
  }

  const disciplinas = await prisma.disciplina.findMany({
    where: whereDisciplinas,
    orderBy: { nome: 'asc' }
  })

  const disciplinasIds = new Set(disciplinas.map((d: any) => d.id))

  // 2. Turma, estudantes ativos e notas que não foram aprovadas direto pelas unidades
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    include: {
      estudantes: {
        where: ESTUDANTE_ATIVO, // removidos na varredura / concluídos não entram (igual ao Conselho)
        orderBy: { nome: 'asc' },
        include: {
          notas: {
            where: { status: { not: 'APROVADO' } },
            include: { disciplina: true }
          }
        }
      }
    }
  })

  if (!turma) return null
  const semestral = isTurmaSemestral(turma.modalidade)

  // 3. Só entra quem já tem todas as unidades lançadas; os demais são contados à parte
  const aguardandoUnidades: Record<string, number> = {}
  const notasRecuperacao = turma.estudantes.flatMap(estudante =>
    estudante.notas
      .filter(nota => disciplinasIds.has(nota.disciplinaId))
      .filter(nota => {
        if (unidadesFaltando(nota, semestral).length === 0) return true
        aguardandoUnidades[nota.disciplinaId] = (aguardandoUnidades[nota.disciplinaId] ?? 0) + 1
        return false
      })
      .map(nota => ({
        id: nota.id,
        nota: nota.nota,
        status: nota.status,
        estudanteId: estudante.matricula,
        estudanteNome: estudante.nome,
        disciplinaId: nota.disciplinaId,
        disciplinaNome: nota.disciplina.nome,
        notaRecuperacao: nota.notaRecuperacao
      }))
  )

  return {
    turma,
    notasRecuperacao,
    aguardandoUnidades,
    disciplinas
  }
}

export default async function RecuperacaoTurmaPage({
  params
}: {
  params: Promise<{ turmaId: string }>
}) {
  const session = await auth()
  
  if (!session) {
    redirect("/login")
  }

  const { turmaId } = await params
  const data = await getNotasRecuperacao(turmaId, session)

  if (!data) {
    redirect("/dashboard/notas/recuperacao")
  }

  return (
    <RecuperacaoClient
      turmaId={data.turma.id}
      turmaNome={data.turma.nome}
      turmaEncerrada={data.turma.status === 'ENCERRADA'}
      notasRecuperacao={data.notasRecuperacao}
      aguardandoUnidades={data.aguardandoUnidades}
      disciplinas={data.disciplinas}
    />
  )
}
