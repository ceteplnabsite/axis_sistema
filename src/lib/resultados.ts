// Dados da tela/PDF de Resultados de uma turma.
import { prisma } from '@/lib/prisma'
import { isTurmaSemestral } from '@/lib/conselho'

export type NotaResultado = {
  id: string; estudanteId: string; disciplinaId: string
  nota: number | null; nota1: number | null; nota2: number | null; nota3: number | null
  notaRecuperacao: number | null; status: string
  isDesistenteUnid1: boolean; isDesistenteUnid2: boolean; isDesistenteUnid3: boolean
}
export type EstudanteResultado = { matricula: string; nome: string; turmaAtual: string | null }

/**
 * Turma ativa: os alunos que estão nela hoje.
 * Turma encerrada: também quem tem notas nela e já foi para outra turma (ex.: promovidos),
 * para o resultado do período continuar completo.
 */
export async function dadosResultados(turmaId: string) {
  const turma = await prisma.turma.findUnique({
    where: { id: turmaId },
    select: { id: true, nome: true, curso: true, turno: true, modalidade: true, status: true, disciplinas: { select: { id: true, nome: true }, orderBy: { nome: 'asc' } } }
  })
  if (!turma) return null
  const encerrada = turma.status === 'ENCERRADA'
  const notas = await prisma.notaFinal.findMany({
    where: { disciplina: { turmaId }, ...(encerrada ? {} : { estudante: { turmaId } }) },
    select: {
      id: true, estudanteId: true, disciplinaId: true, nota: true, nota1: true, nota2: true, nota3: true,
      notaRecuperacao: true, status: true, isDesistenteUnid1: true, isDesistenteUnid2: true, isDesistenteUnid3: true
    }
  })
  const ids = new Set(notas.map(n => n.estudanteId))
  const alunos = await prisma.estudante.findMany({
    where: { OR: [{ turmaId }, { matricula: { in: [...ids] } }] },
    select: { matricula: true, nome: true, turmaId: true, turma: { select: { nome: true } } },
    orderBy: { nome: 'asc' }
  })
  const estudantes: EstudanteResultado[] = alunos
    .filter(a => a.turmaId === turmaId || encerrada)
    .map(a => ({ matricula: a.matricula, nome: a.nome, turmaAtual: a.turmaId === turmaId ? null : a.turma.nome }))
  return { turma, semestral: isTurmaSemestral(turma.modalidade), disciplinas: turma.disciplinas, estudantes, notas: notas as NotaResultado[] }
}
