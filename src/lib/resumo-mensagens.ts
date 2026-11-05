// Resumo diário de Mensagens por e-mail: o que cada pessoa tem pendente.
import { prisma } from '@/lib/prisma'
import { destinatariosDoComunicado } from '@/lib/comunicados'
import { categoriasQueAtende, resumoChamados } from '@/lib/chamados'

/** Só entra o que aconteceu nos últimos N dias (evita cobrar coisa muito antiga) */
export const DIAS_RESUMO = 30
const MAX_ITENS = 8

export type ItemResumo = { titulo: string; detalhe: string }
export type ResumoPessoa = {
  userId: string; nome: string; email: string
  conversas: ItemResumo[]
  comunicados: ItemResumo[]
  chamados: ItemResumo[]
  fila: { atrasados: number; novos: number } | null
  total: number
}

const limpa = (s: string) => s.replace(/\[Ticket\]\s*|^Re:\s*/gi, '').trim() || 'Sem assunto'
const data = (d: Date) => d.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia', day: '2-digit', month: '2-digit' })

export async function montarResumos(agora = new Date()): Promise<ResumoPessoa[]> {
  const desde = new Date(agora.getTime() - DIAS_RESUMO * 86400_000)
  const pessoas = await prisma.user.findMany({
    where: { isActive: true, isApproved: true, isPortalUser: false, estudanteId: null, NOT: { email: '' } },
    select: { id: true, name: true, username: true, email: true, isSuperuser: true, isDirecao: true, isStaff: true }
  })
  const porId = new Map<string, ResumoPessoa>(pessoas.filter(p => p.email).map(p => [p.id, {
    userId: p.id, nome: p.name?.trim() || p.username, email: p.email!, conversas: [], comunicados: [], chamados: [], fila: null, total: 0
  }]))

  // 1. Conversas diretas não lidas (agrupadas por conversa)
  const diretas = await prisma.message.findMany({
    where: { category: 'GERAL', receiverId: { in: [...porId.keys()] }, createdAt: { gte: desde } },
    select: {
      id: true, parentId: true, subject: true, senderId: true, receiverId: true, createdAt: true,
      sender: { select: { name: true, username: true } },
      parent: { select: { subject: true } },
      readBy: { select: { userId: true } },
      deletedBy: { select: { userId: true } }
    },
    orderBy: { createdAt: 'asc' }
  })
  const conversas = new Map<string, Map<string, { de: string; assunto: string; n: number; ultima: Date }>>()
  for (const m of diretas) {
    const quem = m.receiverId!
    if (m.senderId === quem || m.readBy.some(r => r.userId === quem) || m.deletedBy.some(d => d.userId === quem)) continue
    const raiz = m.parentId ?? m.id
    const doUsuario = conversas.get(quem) ?? new Map()
    const c = doUsuario.get(raiz) ?? { de: m.sender.name?.trim() || m.sender.username, assunto: limpa(m.parent?.subject ?? m.subject), n: 0, ultima: m.createdAt }
    c.n++; c.ultima = m.createdAt; c.de = m.sender.name?.trim() || m.sender.username
    doUsuario.set(raiz, c); conversas.set(quem, doUsuario)
  }
  for (const [quem, cs] of conversas) {
    const r = porId.get(quem); if (!r) continue
    r.conversas = [...cs.values()].sort((a, b) => b.ultima.getTime() - a.ultima.getTime())
      .map(c => ({ titulo: c.assunto, detalhe: `${c.de} · ${c.n} nova${c.n > 1 ? 's' : ''} · ${data(c.ultima)}` }))
  }

  // 2. Comunicados esperando "Estou ciente"
  const comunicados = await prisma.message.findMany({
    where: { category: 'COMUNICADO', parentId: null, requerCiencia: true, createdAt: { gte: desde } },
    select: { id: true, subject: true, senderId: true, receiverId: true, createdAt: true, sender: { select: { name: true } }, ciencias: { select: { userId: true } } },
    orderBy: { createdAt: 'desc' }
  })
  for (const c of comunicados) {
    const cientes = new Set(c.ciencias.map(x => x.userId))
    for (const d of await destinatariosDoComunicado(c.receiverId, c.senderId)) {
      if (cientes.has(d.id)) continue
      porId.get(d.id)?.comunicados.push({ titulo: c.subject, detalhe: `${c.sender.name?.trim() || 'Direção'} · ${data(c.createdAt)}` })
    }
  }

  // 3. Chamados em que a equipe respondeu e espera a pessoa
  const aguardando = await prisma.$queryRaw<{ sender_id: string; ticket_number: number; subject: string; ultima_em: Date }[]>`
    select m.sender_id, m.ticket_number, m.subject, u.created_at as ultima_em
      from messages m
      join lateral (select x.sender_id, x.created_at from messages x where x.parent_id = m.id order by x.created_at desc limit 1) u on true
     where m.parent_id is null and m.category::text in ('SUPORTE', 'DIRECAO')
       and m.status::text not in ('RESOLVIDO', 'FECHADO')
       and m.subject not like '[Cadastro Pendente]%'
       and u.sender_id <> m.sender_id
     order by u.created_at desc`
  for (const a of aguardando) {
    porId.get(a.sender_id)?.chamados.push({ titulo: `#${a.ticket_number} ${limpa(a.subject)}`, detalhe: `a equipe respondeu em ${data(a.ultima_em)}` })
  }

  // 4. Quem atende: chamados esperando a equipe
  for (const p of pessoas) {
    const r = porId.get(p.id)
    if (!r || !categoriasQueAtende(p).length) continue
    const f = await resumoChamados(p)
    if (f.atrasados || f.novos) r.fila = { atrasados: f.atrasados, novos: f.novos }
  }

  const out = [...porId.values()]
  for (const r of out) r.total = r.conversas.length + r.comunicados.length + r.chamados.length + (r.fila?.atrasados ?? 0)
  return out.filter(r => r.total > 0).sort((a, b) => a.nome.localeCompare(b.nome))
}

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

function secao(titulo: string, itens: ItemResumo[]) {
  if (!itens.length) return ''
  const mais = itens.length > MAX_ITENS ? `<li style="color:#64748b;">e mais ${itens.length - MAX_ITENS}…</li>` : ''
  return `<h3 style="font-size:15px;color:#0f172a;margin:22px 0 8px;">${titulo} (${itens.length})</h3>
    <ul style="margin:0;padding-left:18px;color:#334155;font-size:14px;line-height:1.5;">
      ${itens.slice(0, MAX_ITENS).map(i => `<li style="margin-bottom:6px;"><b>${esc(i.titulo)}</b><br><span style="color:#64748b;font-size:12px;">${esc(i.detalhe)}</span></li>`).join('')}${mais}
    </ul>`
}

export function emailResumo(r: ResumoPessoa, baseUrl: string) {
  const primeiro = r.nome.split(' ')[0]
  const fila = r.fila ? `<div style="margin-top:22px;padding:12px 16px;border-radius:10px;background:${r.fila.atrasados ? '#fff1f2' : '#f8fafc'};border:1px solid ${r.fila.atrasados ? '#fecdd3' : '#e2e8f0'};color:#0f172a;font-size:14px;">
      <b>Chamados esperando a equipe:</b> ${r.fila.atrasados} sem resposta há mais de 24h${r.fila.novos ? ` · ${r.fila.novos} novo(s)` : ''}.
      <a href="${baseUrl}/dashboard/mensagens?fila=atrasados" style="color:#4338ca;">Abrir a fila</a>
    </div>` : ''
  const html = `<meta charset="utf-8">
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:600px;margin:0 auto;padding:24px;border:1px solid #e2e8f0;border-radius:14px;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#4338ca;">Resumo do dia · Mensagens</p>
      <h2 style="margin:0;color:#0f172a;font-size:20px;">Olá, ${esc(primeiro)}!</h2>
      <p style="color:#475569;font-size:14px;margin:8px 0 0;">Isto está esperando por você no Áxis:</p>
      ${secao('Conversas não lidas', r.conversas)}
      ${secao('Comunicados para confirmar ciência', r.comunicados)}
      ${secao('Chamados aguardando sua resposta', r.chamados)}
      ${fila}
      <a href="${baseUrl}/dashboard/mensagens" style="display:inline-block;margin-top:24px;background:#0f172a;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;">Abrir Mensagens</a>
      <p style="color:#94a3b8;font-size:12px;margin-top:24px;">Resumo automático do Áxis — CETEP LNAB. Só chega quando há algo pendente.</p>
    </div>`
  const partes = [
    r.conversas.length && `${r.conversas.length} conversa${r.conversas.length > 1 ? 's' : ''}`,
    r.comunicados.length && `${r.comunicados.length} comunicado${r.comunicados.length > 1 ? 's' : ''}`,
    r.chamados.length && `${r.chamados.length} chamado${r.chamados.length > 1 ? 's' : ''}`,
    r.fila?.atrasados && `${r.fila.atrasados} na fila`,
  ].filter(Boolean)
  return { assunto: `Áxis: ${partes.join(', ')} esperando você`, html }
}
