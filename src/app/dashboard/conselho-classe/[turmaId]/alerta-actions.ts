'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/** A Direção confere a nota alterada no SIGEduc e marca o alerta como resolvido (não mexe em nota). */
export async function resolverAlertaSigeduc(alertaId: string): Promise<{ ok: true } | { erro: string }> {
  const session = await auth()
  if (!session?.user || !(session.user.isSuperuser || session.user.isDirecao)) return { erro: 'Apenas a Direção pode resolver' }
  const a = await prisma.alertaNotaSigeduc.findUnique({ where: { id: alertaId }, select: { id: true, resolvidoEm: true } })
  if (!a) return { erro: 'Alerta não encontrado' }
  if (a.resolvidoEm) return { ok: true }
  await prisma.$transaction([
    prisma.alertaNotaSigeduc.update({ where: { id: alertaId }, data: { resolvidoEm: new Date(), resolvidoPorNome: session.user.name ?? null } }),
    prisma.auditLog.create({ data: { userId: session.user.id, entityType: 'NOTA', entityId: alertaId, action: 'UPDATE', details: JSON.stringify({ acao: 'ALERTA_SIGEDUC_RESOLVIDO' }) } }),
  ])
  return { ok: true }
}
