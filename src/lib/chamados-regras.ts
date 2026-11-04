// Regras dos chamados sem acesso ao banco (usadas no servidor e na tela).

export const CATEGORIAS_CHAMADO = ['SUPORTE', 'DIRECAO'] as const
export type CategoriaChamado = (typeof CATEGORIAS_CHAMADO)[number]
export const ehChamado = (cat: string | null | undefined): cat is CategoriaChamado =>
  cat === 'SUPORTE' || cat === 'DIRECAO'

/** Dias sem retorno do solicitante até o chamado respondido ser fechado sozinho */
export const DIAS_FECHAMENTO_AUTOMATICO = 7
/** Horas até um chamado esperando a equipe ser considerado atrasado */
export const HORAS_ATRASO = 24
export const MOTIVO_FECHAMENTO_AUTOMATICO = 'AUTO_SEM_RETORNO'
/** Chamado antigo nunca respondido, encerrado na limpeza de 04/11/2026 */
export const MOTIVO_LIMPEZA_ANTIGOS = 'LIMPEZA_ANTIGOS'

export type Papel = { id: string; isSuperuser?: boolean; isDirecao?: boolean; isStaff?: boolean; estudanteId?: string | null }

/** Suporte: administradores. Direção: Direção e administradores. */
export function atendeCategoria(u: Papel, cat: string | null | undefined): boolean {
  if (cat === 'SUPORTE') return !!u.isSuperuser
  if (cat === 'DIRECAO') return !!u.isSuperuser || !!u.isDirecao
  return false
}
export const categoriasQueAtende = (u: Papel): CategoriaChamado[] =>
  CATEGORIAS_CHAMADO.filter(c => atendeCategoria(u, c))

/**
 * Situação de um chamado, calculada pelas mensagens (não depende do status gravado,
 * que nos chamados antigos ficou sempre ABERTO):
 * - NOVO: ninguém além do solicitante escreveu
 * - AGUARDANDO_EQUIPE: a última mensagem é do solicitante (já houve resposta antes)
 * - AGUARDANDO_SOLICITANTE: a última mensagem é da equipe
 * - RESOLVIDO
 */
export type Situacao = 'NOVO' | 'AGUARDANDO_EQUIPE' | 'AGUARDANDO_SOLICITANTE' | 'RESOLVIDO'

export function situacaoDoChamado(c: { status: string; senderId: string; ultimoRemetenteId: string; respondido: boolean }): Situacao {
  if (c.status === 'RESOLVIDO' || c.status === 'FECHADO') return 'RESOLVIDO'
  if (c.ultimoRemetenteId !== c.senderId) return 'AGUARDANDO_SOLICITANTE'
  return c.respondido ? 'AGUARDANDO_EQUIPE' : 'NOVO'
}

/** Situação a partir da mensagem da lista (raiz + última resposta) ou da conversa aberta */
export function situacaoDaMensagem(msg: {
  status: string; senderId: string; respondido?: boolean; createdAt: string | Date
  replies?: { senderId: string; createdAt: string | Date }[]
}, conversa?: { senderId: string; createdAt: string | Date }[]) {
  const ultima = conversa?.length ? conversa[conversa.length - 1] : (msg.replies?.[0] ?? { senderId: msg.senderId, createdAt: msg.createdAt })
  const respondido = conversa?.length ? conversa.some(m => m.senderId !== msg.senderId) : !!msg.respondido
  const situacao = situacaoDoChamado({ status: msg.status, senderId: msg.senderId, ultimoRemetenteId: ultima.senderId, respondido })
  const horasEsperando = (Date.now() - new Date(ultima.createdAt).getTime()) / 3600_000
  return { situacao, atrasado: situacao !== 'RESOLVIDO' && situacao !== 'AGUARDANDO_SOLICITANTE' && horasEsperando > HORAS_ATRASO, horasEsperando }
}

/** "há 3 dias", "há 5 h" */
export const tempoEsperando = (horas: number) =>
  horas >= 48 ? `há ${Math.floor(horas / 24)} dias` : horas >= 24 ? 'há 1 dia' : `há ${Math.max(1, Math.floor(horas))} h`
