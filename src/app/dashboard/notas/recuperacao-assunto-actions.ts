'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { assuntoDoBanco, mesmasDisciplinasDoProfessor, podeEditarAssunto, MAX_ASSUNTO, MAX_ORIENTACOES, type AssuntoRecuperacao } from '@/lib/recuperacao-assunto'

const CAMPOS = { recuperacaoAssunto: true, recuperacaoData: true, recuperacaoOrientacoes: true, recuperacaoAtualizadoEm: true, recuperacaoAtualizadoPor: true } as const

export async function getAssuntoRecuperacao(disciplinaId: string): Promise<{ assunto: AssuntoRecuperacao | null; outrasTurmas: { id: string; turma: string }[] } | { erro: string }> {
  const session = await auth()
  if (!session?.user) return { erro: 'Não autorizado' }
  if (!await podeEditarAssunto(session.user, disciplinaId)) return { erro: 'Sem acesso a esta disciplina' }
  const d = await prisma.disciplina.findUnique({ where: { id: disciplinaId }, select: CAMPOS })
  if (!d) return { erro: 'Disciplina não encontrada' }
  return { assunto: assuntoDoBanco(d), outrasTurmas: await mesmasDisciplinasDoProfessor(session.user, disciplinaId) }
}

export async function salvarAssuntoRecuperacao(
  disciplinaId: string,
  dados: { assunto: string; data: string; hora: string; orientacoes: string },
  aplicarEm: string[] = []
): Promise<{ ok: true; salvas: number } | { erro: string }> {
  const session = await auth()
  if (!session?.user) return { erro: 'Não autorizado' }
  const assunto = dados.assunto.trim()
  const orientacoes = dados.orientacoes.trim()
  if (assunto.length > MAX_ASSUNTO) return { erro: `O assunto pode ter no máximo ${MAX_ASSUNTO} caracteres.` }
  if (orientacoes.length > MAX_ORIENTACOES) return { erro: `As orientações podem ter no máximo ${MAX_ORIENTACOES} caracteres.` }
  if (dados.data && !/^\d{4}-\d{2}-\d{2}$/.test(dados.data)) return { erro: 'Data inválida.' }
  if (dados.hora && !/^\d{2}:\d{2}$/.test(dados.hora)) return { erro: 'Horário inválido.' }
  if (dados.hora && !dados.data) return { erro: 'Informe a data junto com o horário.' }

  // sem hora = 00:00 na Bahia (mostrado só como data)
  const quando = dados.data ? new Date(`${dados.data}T${dados.hora || '00:00'}:00-03:00`) : null
  if (quando && isNaN(quando.getTime())) return { erro: 'Data inválida.' }

  const permitidas = new Set((await mesmasDisciplinasDoProfessor(session.user, disciplinaId)).map(o => o.id))
  const ids = [disciplinaId, ...aplicarEm.filter(id => permitidas.has(id))]
  if (!await podeEditarAssunto(session.user, disciplinaId)) return { erro: 'Sem acesso a esta disciplina' }

  const vazio = !assunto
  const r = await prisma.disciplina.updateMany({
    where: { id: { in: ids } },
    data: vazio
      ? { recuperacaoAssunto: null, recuperacaoData: null, recuperacaoOrientacoes: null, recuperacaoAtualizadoEm: new Date(), recuperacaoAtualizadoPor: session.user.name ?? null }
      : { recuperacaoAssunto: assunto, recuperacaoData: quando, recuperacaoOrientacoes: orientacoes || null, recuperacaoAtualizadoEm: new Date(), recuperacaoAtualizadoPor: session.user.name ?? null }
  })
  await prisma.auditLog.create({ data: {
    userId: session.user.id, entityType: 'DISCIPLINA', entityId: disciplinaId, action: 'UPDATE',
    details: JSON.stringify({ acao: vazio ? 'APAGAR_ASSUNTO_RECUPERACAO' : 'ASSUNTO_RECUPERACAO', disciplinas: ids, data: dados.data || null, hora: dados.hora || null })
  } })
  revalidatePath('/resultados')
  return { ok: true, salvas: r.count }
}
