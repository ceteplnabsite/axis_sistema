'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { canGradeDisciplina } from '@/lib/permissions'
import { isTurmaSemestral } from '@/lib/conselho'
import { nomeSemLigacoes, normalizarNome, semelhancaComponente } from '@/lib/sigeduc'

export type TurmaCandidata = {
  turmaId: string; turma: string; batem: number; totalAxis: number
  disciplinas: { id: string; nome: string; semelhanca: number }[]
}

/**
 * Procura, entre as turmas ativas em que o usuário lança notas, a que tem os mesmos estudantes
 * da tabela do SIGEduc (pelo nome) e, nela, a disciplina mais parecida com o componente.
 */
export async function procurarTurma(nomes: string[], componente: string): Promise<{ candidatas: TurmaCandidata[] } | { erro: string }> {
  const session = await auth()
  if (!session?.user || session.user.isPortalUser) return { erro: 'Não autorizado' }
  const u = session.user
  const chaves = new Set(nomes.slice(0, 300).map(normalizarNome))
  const chaves2 = new Set(nomes.slice(0, 300).map(nomeSemLigacoes))

  const disciplinas = await prisma.disciplina.findMany({
    where: { turma: { status: 'ATIVA' }, ...(u.isSuperuser || u.isDirecao ? {} : { usuariosPermitidos: { some: { id: u.id } } }) },
    select: { id: true, nome: true, turmaId: true }
  })
  const porTurma = new Map<string, { id: string; nome: string }[]>()
  for (const d of disciplinas) porTurma.set(d.turmaId, [...(porTurma.get(d.turmaId) ?? []), { id: d.id, nome: d.nome }])

  const turmas = await prisma.turma.findMany({
    where: { id: { in: [...porTurma.keys()] } },
    select: { id: true, nome: true, estudantes: { select: { nome: true } } }
  })
  const candidatas: TurmaCandidata[] = turmas.map(t => ({
    turmaId: t.id, turma: t.nome, totalAxis: t.estudantes.length,
    batem: t.estudantes.filter(e => chaves.has(normalizarNome(e.nome)) || chaves2.has(nomeSemLigacoes(e.nome))).length,
    disciplinas: (porTurma.get(t.id) ?? [])
      .map(d => ({ ...d, semelhanca: semelhancaComponente(d.nome, componente) }))
      .sort((a, b) => b.semelhanca - a.semelhanca || a.nome.localeCompare(b.nome))
  })).filter(c => c.batem > 0).sort((a, b) => b.batem - a.batem || a.turma.localeCompare(b.turma)).slice(0, 8)
  return { candidatas }
}

export type AlunoAxis = {
  matricula: string; nome: string
  n1: number | null; n2: number | null; n3: number | null
  inf1: boolean; inf2: boolean; inf3: boolean
}

/** Notas atuais da disciplina no Áxis (para comparar com o SIGEduc) */
export async function notasAtuais(disciplinaId: string): Promise<{ semestral: boolean; turma: string; disciplina: string; encerrada: boolean; alunos: AlunoAxis[] } | { erro: string }> {
  const session = await auth()
  if (!session?.user) return { erro: 'Não autorizado' }
  if (!await canGradeDisciplina(session.user, disciplinaId)) return { erro: 'Você não lança notas nesta disciplina' }
  const d = await prisma.disciplina.findUnique({
    where: { id: disciplinaId },
    select: { nome: true, turma: { select: { id: true, nome: true, modalidade: true, status: true, estudantes: { select: { matricula: true, nome: true }, orderBy: { nome: 'asc' } } } } }
  })
  if (!d) return { erro: 'Disciplina não encontrada' }
  const notas = await prisma.notaFinal.findMany({
    where: { disciplinaId, estudante: { turmaId: d.turma.id } },
    select: { estudanteId: true, nota1: true, nota2: true, nota3: true, isDesistenteUnid1: true, isDesistenteUnid2: true, isDesistenteUnid3: true }
  })
  const porAluno = new Map(notas.map(n => [n.estudanteId, n]))
  return {
    semestral: isTurmaSemestral(d.turma.modalidade), turma: d.turma.nome, disciplina: d.nome, encerrada: d.turma.status === 'ENCERRADA',
    alunos: d.turma.estudantes.map(e => {
      const n = porAluno.get(e.matricula)
      return { matricula: e.matricula, nome: e.nome, n1: n?.nota1 ?? null, n2: n?.nota2 ?? null, n3: n?.nota3 ?? null,
        inf1: !!n?.isDesistenteUnid1, inf2: !!n?.isDesistenteUnid2, inf3: !!n?.isDesistenteUnid3 }
    })
  }
}
