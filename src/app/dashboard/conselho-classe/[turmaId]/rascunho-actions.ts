'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * Rascunho do Conselho no servidor: as decisões marcadas e ainda não gravadas ficam guardadas
 * por turma, para continuar de outro computador. Quem pode: Direção/TI ou quem lança nota na turma.
 */
export type DadosRascunho = { decisoes: Record<string, string>; recs: Record<string, number | null> }
export type RascunhoServidor = DadosRascunho & { atualizadoEm: string; atualizadoPor: string | null }

const LIMITE_ITENS = 5000

async function podeUsar(turmaId: string) {
  const session = await auth()
  if (!session?.user || session.user.isPortalUser) return null
  if (session.user.isSuperuser || session.user.isDirecao) return session
  const leciona = await prisma.disciplina.count({ where: { turmaId, usuariosPermitidos: { some: { id: session.user.id } } } })
  return leciona > 0 ? session : null
}

function limpar(d: DadosRascunho): DadosRascunho {
  const decisoes: Record<string, string> = {}
  for (const [k, v] of Object.entries(d?.decisoes ?? {}).slice(0, LIMITE_ITENS)) if (typeof v === 'string' && v.length < 40) decisoes[String(k).slice(0, 100)] = v
  const recs: Record<string, number | null> = {}
  for (const [k, v] of Object.entries(d?.recs ?? {}).slice(0, LIMITE_ITENS)) if (v === null || (typeof v === 'number' && v >= -1 && v <= 10)) recs[String(k).slice(0, 100)] = v
  return { decisoes, recs }
}

export async function lerRascunho(turmaId: string): Promise<RascunhoServidor | null> {
  if (!(await podeUsar(turmaId))) return null
  const r = await prisma.conselhoRascunho.findUnique({ where: { turmaId } })
  if (!r) return null
  return { ...limpar(r.dados as DadosRascunho), atualizadoEm: r.atualizadoEm.toISOString(), atualizadoPor: r.atualizadoPorNome }
}

/** Salva (ou apaga, se vazio). Devolve a hora gravada. */
export async function salvarRascunho(turmaId: string, dados: DadosRascunho): Promise<{ ok: true; atualizadoEm: string | null } | { erro: string }> {
  const session = await podeUsar(turmaId)
  if (!session) return { erro: 'Sem permissão' }
  const turma = await prisma.turma.findUnique({ where: { id: turmaId }, select: { status: true } })
  if (!turma || turma.status === 'ENCERRADA') return { erro: 'Turma encerrada' }
  const limpo = limpar(dados)
  if (!Object.keys(limpo.decisoes).length && !Object.keys(limpo.recs).length) {
    await prisma.conselhoRascunho.deleteMany({ where: { turmaId } })
    return { ok: true, atualizadoEm: null }
  }
  const r = await prisma.conselhoRascunho.upsert({
    where: { turmaId },
    create: { turmaId, dados: limpo, atualizadoPorId: session.user.id, atualizadoPorNome: session.user.name ?? null },
    update: { dados: limpo, atualizadoPorId: session.user.id, atualizadoPorNome: session.user.name ?? null },
  })
  return { ok: true, atualizadoEm: r.atualizadoEm.toISOString() }
}
