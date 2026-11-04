// Comunicados: quem recebe cada comunicado (fonte única para e-mail, "Estou ciente" e relatório de leitura).
import { prisma } from '@/lib/prisma'

export type Destinatario = { id: string; name: string | null; email: string }

/** Rótulo do público de um comunicado, a partir do receiverId gravado na mensagem */
export async function publicoDoComunicado(receiverId: string | null): Promise<string> {
  if (!receiverId) return 'Todos'
  if (receiverId === 'GROUP_TEACHERS') return 'Professores'
  if (receiverId === 'GROUP_DIRECAO') return 'Direção'
  if (receiverId === 'GROUP_STUDENTS') return 'Estudantes'
  if (receiverId.startsWith('TURMA_')) {
    const t = await prisma.turma.findUnique({ where: { id: receiverId.slice(6) }, select: { nome: true } })
    return `Professores da turma ${t?.nome ?? '?'}`
  }
  return 'Pessoa específica'
}

/**
 * Pessoas que devem receber o comunicado (exceto quem enviou).
 * Mesmas regras que já valiam para o e-mail de comunicado.
 */
export async function destinatariosDoComunicado(receiverId: string | null, senderId: string): Promise<Destinatario[]> {
  const base = { isActive: true, id: { not: senderId } }
  const select = { id: true, name: true, email: true } as const
  const ordem = { name: 'asc' } as const

  if (!receiverId) {
    return prisma.user.findMany({
      where: { ...base, isApproved: true, estudanteId: null, isPortalUser: false, NOT: { id: { startsWith: 'GROUP_' } } },
      select, orderBy: ordem
    })
  }
  if (receiverId === 'GROUP_TEACHERS') {
    return prisma.user.findMany({ where: { ...base, isStaff: true, isApproved: true }, select, orderBy: ordem })
  }
  if (receiverId === 'GROUP_DIRECAO') {
    return prisma.user.findMany({ where: { ...base, OR: [{ isDirecao: true }, { isSuperuser: true }] }, select, orderBy: ordem })
  }
  if (receiverId === 'GROUP_STUDENTS') {
    return prisma.user.findMany({ where: { ...base, estudanteId: { not: null } }, select, orderBy: ordem })
  }
  if (receiverId.startsWith('TURMA_')) {
    return prisma.user.findMany({
      where: { ...base, disciplinasPermitidas: { some: { turmaId: receiverId.slice(6) } } },
      select, orderBy: ordem
    })
  }
  return prisma.user.findMany({ where: { id: receiverId }, select })
}
