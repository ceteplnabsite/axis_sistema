// Chamados (SUPORTE e DIRECAO): quem atende, situação de cada chamado e fechamento automático.
import { prisma } from '@/lib/prisma'

import {
  CATEGORIAS_CHAMADO, DIAS_FECHAMENTO_AUTOMATICO, HORAS_ATRASO, MOTIVO_FECHAMENTO_AUTOMATICO,
  atendeCategoria, categoriasQueAtende, ehChamado, situacaoDoChamado, type CategoriaChamado, type Papel,
} from '@/lib/chamados-regras'
export * from '@/lib/chamados-regras'

type LinhaFila = {
  id: string; categoria: string; status: string; sender_id: string
  ultimo_remetente: string; ultima_em: Date; respondido: boolean
}

/** Chamados em aberto das categorias informadas, com a última mensagem de cada um */
async function chamadosAbertos(categorias: string[]): Promise<LinhaFila[]> {
  if (!categorias.length) return []
  return prisma.$queryRaw<LinhaFila[]>`
    select m.id, m.category::text as categoria, m.status::text as status, m.sender_id,
           coalesce(u.sender_id, m.sender_id) as ultimo_remetente,
           coalesce(u.created_at, m.created_at) as ultima_em,
           exists (select 1 from messages y where y.parent_id = m.id and y.sender_id <> m.sender_id) as respondido
      from messages m
      left join lateral (
        select x.sender_id, x.created_at from messages x
         where x.parent_id = m.id order by x.created_at desc limit 1
      ) u on true
     where m.parent_id is null
       and m.category::text = any(${categorias})
       and m.status::text not in ('RESOLVIDO', 'FECHADO')
       and m.subject not like '[Cadastro Pendente]%'`
}

export type FiltroFila = 'novos' | 'atrasados' | 'aguardando' | 'resolvidos'

export type ResumoChamados = {
  categorias: CategoriaChamado[]
  novos: number; atrasados: number; aguardandoEquipe: number; aguardandoSolicitante: number
  porCategoria: Record<string, { abertos: number; atrasados: number }>
}

const atrasado = (l: LinhaFila, agora: number) =>
  l.ultimo_remetente === l.sender_id && agora - new Date(l.ultima_em).getTime() > HORAS_ATRASO * 3600_000

/** Contagens para o painel da fila e o cartão do dashboard */
export async function resumoChamados(u: Papel): Promise<ResumoChamados> {
  const categorias = categoriasQueAtende(u)
  const linhas = await chamadosAbertos(categorias)
  const agora = Date.now()
  const porCategoria: ResumoChamados['porCategoria'] = Object.fromEntries(categorias.map(c => [c, { abertos: 0, atrasados: 0 }]))
  let novos = 0, atrasados = 0, aguardandoEquipe = 0, aguardandoSolicitante = 0
  for (const l of linhas) {
    const s = situacaoDoChamado({ status: l.status, senderId: l.sender_id, ultimoRemetenteId: l.ultimo_remetente, respondido: l.respondido })
    if (s === 'NOVO') novos++
    if (s === 'AGUARDANDO_EQUIPE') aguardandoEquipe++
    if (s === 'AGUARDANDO_SOLICITANTE') aguardandoSolicitante++
    const pc = porCategoria[l.categoria]
    if (pc && s !== 'AGUARDANDO_SOLICITANTE') pc.abertos++
    if (atrasado(l, agora)) { atrasados++; if (pc) pc.atrasados++ }
  }
  return { categorias, novos, atrasados, aguardandoEquipe, aguardandoSolicitante, porCategoria }
}

/** IDs dos chamados de um filtro da fila (mais antigos esperando primeiro) */
export async function idsDaFila(u: Papel, filtro: FiltroFila): Promise<string[]> {
  const categorias = categoriasQueAtende(u)
  if (!categorias.length) return []
  if (filtro === 'resolvidos') {
    const r = await prisma.message.findMany({
      where: { parentId: null, category: { in: categorias }, status: { in: ['RESOLVIDO', 'FECHADO'] } },
      select: { id: true }, orderBy: { updatedAt: 'desc' }, take: 60
    })
    return r.map(x => x.id)
  }
  const agora = Date.now()
  return (await chamadosAbertos(categorias))
    .filter(l => {
      const s = situacaoDoChamado({ status: l.status, senderId: l.sender_id, ultimoRemetenteId: l.ultimo_remetente, respondido: l.respondido })
      if (filtro === 'novos') return s === 'NOVO'
      if (filtro === 'aguardando') return s === 'AGUARDANDO_SOLICITANTE'
      return atrasado(l, agora)
    })
    .sort((a, b) => new Date(a.ultima_em).getTime() - new Date(b.ultima_em).getTime())
    .map(l => l.id)
}

/**
 * Fecha chamados que a equipe respondeu e o solicitante não voltou a escrever há
 * DIAS_FECHAMENTO_AUTOMATICO dias. Não mexe em updated_at (a lista não reordena).
 * Se o solicitante responder depois, o chamado reabre.
 */
export async function fecharChamadosSemRetorno(opcoes: { simular?: boolean; agora?: Date } = {}) {
  const agora = opcoes.agora ?? new Date()
  const limite = agora.getTime() - DIAS_FECHAMENTO_AUTOMATICO * 86400_000
  const linhas = (await chamadosAbertos([...CATEGORIAS_CHAMADO]))
    .filter(l => l.ultimo_remetente !== l.sender_id && new Date(l.ultima_em).getTime() < limite)
  const ids = linhas.map(l => l.id)
  if (!opcoes.simular && ids.length) {
    await prisma.$executeRaw`
      update messages set status = 'RESOLVIDO', is_resolved = true, fechamento = ${MOTIVO_FECHAMENTO_AUTOMATICO}
       where id = any(${ids}) and status::text not in ('RESOLVIDO', 'FECHADO')`
  }
  const porCategoria: Record<string, number> = {}
  for (const l of linhas) porCategoria[l.categoria] = (porCategoria[l.categoria] ?? 0) + 1
  return { fechados: ids.length, porCategoria, ids }
}

/**
 * Quem pode ler/responder uma conversa: participantes, quem atende a categoria do
 * chamado, e o público de um comunicado.
 */
export async function podeVerConversa(u: Papel, rootId: string): Promise<boolean> {
  const root = await prisma.message.findUnique({
    where: { id: rootId },
    select: { senderId: true, receiverId: true, category: true, parentId: true }
  })
  if (!root) return false
  if (root.senderId === u.id || root.receiverId === u.id) return true
  if (ehChamado(root.category) && atendeCategoria(u, root.category)) return true
  if (root.category === 'COMUNICADO') {
    if (u.isSuperuser || u.isDirecao) return true
    const r = root.receiverId
    if (!r) return true
    if (r === 'GROUP_TEACHERS' || r === 'GROUP_STAFF') return !!u.isStaff
    if (r === 'GROUP_DIRECAO') return false
    if (r === 'GROUP_STUDENTS') return !!u.estudanteId
    if (r.startsWith('TURMA_')) {
      const turmaId = r.slice(6)
      const vinculo = await prisma.user.count({
        where: { id: u.id, OR: [{ disciplinasPermitidas: { some: { turmaId } } }, { estudante: { turmaId } }] }
      })
      return vinculo > 0
    }
  }
  // participou da conversa (respondeu ou recebeu uma resposta)
  const participou = await prisma.message.count({
    where: { parentId: rootId, OR: [{ senderId: u.id }, { receiverId: u.id }] }
  })
  return participou > 0
}
