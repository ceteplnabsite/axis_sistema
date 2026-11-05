'use server'

import { headers } from 'next/headers'
import { prisma } from '@/lib/prisma'
import { boletimDoAluno, normalizarMatricula, type Boletim } from '@/lib/boletim'

const ENTIDADE = 'BOLETIM_ONLINE'
const JANELA_MIN = 15
const MAX_ERROS = 10

export type RespostaBoletim = { ok: true; boletim: Boletim } | { ok: false; erro: string }

/**
 * Consulta pública pela matrícula. A data de nascimento é pedida na tela mas NÃO é conferida
 * (decisão da Direção: a escola não tem a data de todos os alunos). Proteção que existe:
 * a consulta só funciona quando ligada em Configurações, e cada IP tem no máximo
 * MAX_ERROS matrículas inexistentes a cada JANELA_MIN minutos. Toda consulta vai para a Auditoria.
 */
export async function consultarBoletim(matriculaDigitada: string, nascimento: string): Promise<RespostaBoletim> {
  const config = await prisma.globalConfig.findUnique({ where: { id: 'global' }, select: { boletimOnlineAtivo: true } })
  if (!config?.boletimOnlineAtivo) return { ok: false, erro: 'A consulta de resultados está fechada no momento.' }

  const matricula = normalizarMatricula(matriculaDigitada)
  if (matricula.length < 4) return { ok: false, erro: 'Digite a matrícula completa.' }
  if (!/^\d{2}\/\d{2}\/\d{4}$/.test(nascimento)) return { ok: false, erro: 'Informe a data de nascimento (dd/mm/aaaa).' }

  const h = await headers()
  const ip = (h.get('x-forwarded-for')?.split(',')[0] || h.get('x-real-ip') || 'desconhecido').trim()
  const desde = new Date(Date.now() - JANELA_MIN * 60_000)
  const erros = await prisma.auditLog.count({ where: { entityType: ENTIDADE, action: 'FALHA', ipAddress: ip, createdAt: { gte: desde } } })
  if (erros >= MAX_ERROS) return { ok: false, erro: `Muitas tentativas. Tente de novo daqui a ${JANELA_MIN} minutos.` }

  const boletim = await boletimDoAluno(matricula)
  const sistema = await prisma.user.findFirst({ where: { isSuperuser: true, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } })
  if (sistema) {
    await prisma.auditLog.create({ data: {
      userId: sistema.id, entityType: ENTIDADE, entityId: matricula, action: boletim ? 'CONSULTA' : 'FALHA', ipAddress: ip,
      details: JSON.stringify({ origem: 'boletim online', encontrado: !!boletim })
    } })
  }
  if (!boletim) return { ok: false, erro: 'Matrícula não encontrada. Confira o número no seu comprovante de matrícula.' }
  if (!boletim.disciplinas.length) return { ok: false, erro: 'Ainda não há resultado para a sua turma. Procure a secretaria.' }
  return { ok: true, boletim }
}
