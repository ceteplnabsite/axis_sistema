// Assunto da recuperação por disciplina: regras e formatação (usado pelo professor, pelo /resultados e pelo lembrete).
import { prisma } from '@/lib/prisma'

export type AssuntoRecuperacao = {
  assunto: string
  /** "AAAA-MM-DD" (opcional) */
  data: string | null
  /** "HH:MM" (opcional) */
  hora: string | null
  orientacoes: string | null
  atualizadoEm: string | null
  atualizadoPor: string | null
}

const TZ = 'America/Bahia'
export const MAX_ASSUNTO = 1500
export const MAX_ORIENTACOES = 300

/** Converte o que está no banco para os campos da tela (data e hora no horário da Bahia; 00:00 = sem hora) */
export function assuntoDoBanco(d: { recuperacaoAssunto: string | null; recuperacaoData: Date | null; recuperacaoOrientacoes: string | null; recuperacaoAtualizadoEm: Date | null; recuperacaoAtualizadoPor: string | null }): AssuntoRecuperacao | null {
  if (!d.recuperacaoAssunto) return null
  let data: string | null = null, hora: string | null = null
  if (d.recuperacaoData) {
    data = new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d.recuperacaoData)
    const h = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d.recuperacaoData)
    hora = h === '00:00' ? null : h
  }
  return {
    assunto: d.recuperacaoAssunto, data, hora, orientacoes: d.recuperacaoOrientacoes,
    atualizadoEm: d.recuperacaoAtualizadoEm?.toISOString() ?? null, atualizadoPor: d.recuperacaoAtualizadoPor
  }
}

/** "20/11 (sexta) às 19:00" */
export function quandoRecuperacao(a: Pick<AssuntoRecuperacao, 'data' | 'hora'>) {
  if (!a.data) return null
  const d = new Date(`${a.data}T12:00:00-03:00`)
  const dia = d.toLocaleDateString('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' })
  const semana = d.toLocaleDateString('pt-BR', { timeZone: TZ, weekday: 'long' }).replace('-feira', '')
  return `${dia} (${semana})${a.hora ? ` às ${a.hora}` : ''}`
}

type Usuario = { id: string; isSuperuser?: boolean; isDirecao?: boolean }

/** Professor da disciplina, Direção ou TI */
export async function podeEditarAssunto(u: Usuario, disciplinaId: string) {
  if (u.isSuperuser || u.isDirecao) return true
  return !!await prisma.disciplina.findFirst({ where: { id: disciplinaId, usuariosPermitidos: { some: { id: u.id } } }, select: { id: true } })
}

/** Outras turmas ativas do mesmo professor com disciplina de mesmo nome (para "usar o mesmo assunto") */
export async function mesmasDisciplinasDoProfessor(u: Usuario, disciplinaId: string) {
  const d = await prisma.disciplina.findUnique({ where: { id: disciplinaId }, select: { nome: true, turmaId: true } })
  if (!d) return []
  const outras = await prisma.disciplina.findMany({
    where: {
      id: { not: disciplinaId }, nome: { equals: d.nome, mode: 'insensitive' }, turma: { status: 'ATIVA' },
      ...(u.isSuperuser || u.isDirecao ? {} : { usuariosPermitidos: { some: { id: u.id } } })
    },
    select: { id: true, turma: { select: { nome: true } } },
    orderBy: { turma: { nome: 'asc' } }
  })
  return outras.map(o => ({ id: o.id, turma: o.turma.nome }))
}
