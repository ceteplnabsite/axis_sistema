import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ConselhoClasseClient, { type ItemConselho } from "./ConselhoClasseClient"
import { ESTUDANTE_ATIVO } from "@/lib/notas-pendentes"
import { isTurmaSemestral, unidadesFaltando, mediaDasUnidades, infrequenteNaUnidade, unidadesDaTurma } from "@/lib/conselho"

export const metadata = {
  title: 'Áxis - Conselho classe'
}

export const runtime = 'nodejs'

async function getDadosConselho(turmaId: string) {
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    include: {
      disciplinas: {
        select: { id: true, nome: true, usuariosPermitidos: { select: { name: true } } },
        orderBy: { nome: 'asc' }
      },
      estudantes: {
        where: ESTUDANTE_ATIVO, // removidos na varredura / concluídos não entram no Conselho
        select: {
          matricula: true,
          nome: true,
          notas: { where: { disciplina: { turmaId } } }
        },
        orderBy: { nome: 'asc' }
      }
    }
  })

  if (!turma) return null

  const semestral = isTurmaSemestral(turma.modalidade)

  // Uma linha por aluno × disciplina da turma. Fica de fora só o que já está APROVADO
  // direto; o resto vai para o Conselho — inclusive disciplina sem nenhuma nota lançada
  // (professor esqueceu de lançar), que aparece como "aguardando nota".
  const itens: ItemConselho[] = []
  for (const est of turma.estudantes) {
    for (const disc of turma.disciplinas) {
      const nota = est.notas.find(n => n.disciplinaId === disc.id)
      if (nota?.status === 'APROVADO') continue

      const base = {
        estudanteId: est.matricula,
        estudanteNome: est.nome,
        disciplinaId: disc.id,
        disciplinaNome: disc.nome,
        professores: disc.usuariosPermitidos.map(u => u.name?.trim() || 'Sem nome'),
      }

      if (!nota) {
        itens.push({
          ...base,
          key: `${est.matricula}:${disc.id}`,
          notaId: null,
          nota1: null, nota2: null, nota3: null,
          media: null,
          notaRecuperacao: null,
          status: 'SEM_NOTA',
          unidadesFaltando: unidadesDaTurma(semestral),
          infrequente: [],
        })
        continue
      }

      itens.push({
        ...base,
        key: nota.id,
        notaId: nota.id,
        nota1: nota.nota1, nota2: nota.nota2, nota3: semestral ? null : nota.nota3,
        media: mediaDasUnidades(nota, semestral),
        notaRecuperacao: nota.notaRecuperacao,
        status: nota.status,
        unidadesFaltando: unidadesFaltando(nota, semestral),
        infrequente: unidadesDaTurma(semestral).filter(u => infrequenteNaUnidade(nota, u)),
      })
    }
  }

  return { turma, semestral, itens }
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
  const data = await getDadosConselho(turmaId)

  if (!data) {
    redirect("/dashboard/conselho-classe")
  }

  return (
    <ConselhoClasseClient
      turmaId={data.turma.id}
      turmaNome={data.turma.nome}
      turmaCurso={data.turma.curso}
      turmaTurno={data.turma.turno}
      semestral={data.semestral}
      encerrada={data.turma.status === 'ENCERRADA'}
      ehDirecao={!!(session.user.isSuperuser || session.user.isDirecao)}
      itens={data.itens}
    />
  )
}
