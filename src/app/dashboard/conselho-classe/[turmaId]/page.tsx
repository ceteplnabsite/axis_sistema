import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import ConselhoClasseClient, { type ItemConselho } from "./ConselhoClasseClient"
import { lerRascunho } from "./rascunho-actions"
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
        select: { id: true, nome: true, usuariosPermitidos: { select: { id: true, name: true } } },
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

  // notas que professores informaram ter sido alteradas no SIGEduc por outra pessoa (ainda não resolvidas)
  const alertas = await prisma.alertaNotaSigeduc.findMany({
    where: { disciplinaId: { in: turma.disciplinas.map(d => d.id) }, resolvidoEm: null },
    select: { id: true, estudanteId: true, disciplinaId: true, unidade: true, notaAxis: true, notaSigeduc: true, informadoPorNome: true, criadoEm: true },
    orderBy: { criadoEm: 'asc' }
  })
  const alertasDe = (mat: string, disc: string) => alertas
    .filter(a => a.estudanteId === mat && a.disciplinaId === disc)
    .map(a => ({ id: a.id, unidade: a.unidade, notaAxis: a.notaAxis, notaSigeduc: a.notaSigeduc, por: a.informadoPorNome, em: a.criadoEm.toISOString() }))

  // Uma linha por aluno × disciplina da turma. Fica de fora só o que já está APROVADO
  // direto; o resto vai para o Conselho — inclusive disciplina sem nenhuma nota lançada
  // (professor esqueceu de lançar), que aparece como "aguardando nota".
  const itens: ItemConselho[] = []
  for (const est of turma.estudantes) {
    for (const disc of turma.disciplinas) {
      const nota = est.notas.find(n => n.disciplinaId === disc.id)
      const alertasSigeduc = alertasDe(est.matricula, disc.id)
      if (nota?.status === 'APROVADO' && !alertasSigeduc.length) continue // aprovada com alerta continua aparecendo

      const base = {
        estudanteId: est.matricula,
        estudanteNome: est.nome,
        disciplinaId: disc.id,
        disciplinaNome: disc.nome,
        professores: disc.usuariosPermitidos.map(u => u.name?.trim() || 'Sem nome'),
        alertasSigeduc,
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

  // Para a ata: todos os estudantes ativos (inclusive quem já está aprovado em tudo) e os professores da turma
  const estudantesTurma = turma.estudantes.map(e => ({ matricula: e.matricula, nome: e.nome }))
  const porProf = new Map<string, { id: string; nome: string; disciplinas: string[] }>()
  for (const d of turma.disciplinas) for (const u of d.usuariosPermitidos) {
    if (!porProf.has(u.id)) porProf.set(u.id, { id: u.id, nome: u.name?.trim() || 'Sem nome', disciplinas: [] })
    porProf.get(u.id)!.disciplinas.push(d.nome)
  }
  const professoresTurma = [...porProf.values()].sort((a, b) => a.nome.localeCompare(b.nome))

  const disciplinasTurma = turma.disciplinas.map(d => d.nome)

  return { turma, semestral, itens, estudantesTurma, professoresTurma, disciplinasTurma }
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
      estudantesTurma={data.estudantesTurma}
      professoresTurma={data.professoresTurma}
      disciplinasTurma={data.disciplinasTurma}
      rascunhoServidor={data.turma.status === 'ENCERRADA' ? null : await lerRascunho(data.turma.id)}
    />
  )
}
