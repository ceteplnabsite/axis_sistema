"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { logAudit } from "@/lib/audit"
import { enviarEmail } from "@/lib/mail"
import { destinatariosDoComunicado, publicoDoComunicado } from "@/lib/comunicados"

const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))

async function carregarComunicado(id: string) {
  return prisma.message.findFirst({
    where: { id, category: 'COMUNICADO', parentId: null },
    select: { id: true, subject: true, senderId: true, receiverId: true, requerCiencia: true, fixado: true, createdAt: true, sender: { select: { name: true } } }
  })
}

/** Quem pode ver o relatório e cobrar leitura: quem enviou, Direção e administradores */
const podeGerir = (u: { id: string; isSuperuser?: boolean; isDirecao?: boolean }, senderId: string) =>
  u.id === senderId || !!u.isSuperuser || !!u.isDirecao

/** "Estou ciente" — só para quem é destinatário do comunicado */
export async function darCiencia(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" }
  const c = await carregarComunicado(messageId)
  if (!c) return { error: "Comunicado não encontrado" }
  const destinatarios = await destinatariosDoComunicado(c.receiverId, c.senderId)
  if (!destinatarios.some(d => d.id === session.user.id)) return { error: "Este comunicado não é para você" }

  const ciencia = await prisma.messageCiencia.upsert({
    where: { messageId_userId: { messageId, userId: session.user.id } },
    update: {},
    create: { messageId, userId: session.user.id }
  })
  // ciência implica leitura
  await prisma.messageRead.upsert({
    where: { messageId_userId: { messageId, userId: session.user.id } },
    update: {},
    create: { messageId, userId: session.user.id }
  })
  revalidatePath("/dashboard/mensagens")
  return { success: true, em: ciencia.createdAt.toISOString() }
}

export type LinhaRelatorio = { id: string; nome: string; leuEm: string | null; cienteEm: string | null }

/** Relatório de leitura/ciência de um comunicado */
export async function relatorioLeitura(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" as const }
  const c = await carregarComunicado(messageId)
  if (!c) return { error: "Comunicado não encontrado" as const }
  if (!podeGerir(session.user, c.senderId)) return { error: "Sem permissão" as const }

  const destinatarios = await destinatariosDoComunicado(c.receiverId, c.senderId)
  const ids = destinatarios.map(d => d.id)
  const [leituras, ciencias] = await Promise.all([
    prisma.messageRead.findMany({ where: { messageId, userId: { in: ids } }, select: { userId: true, readAt: true } }),
    prisma.messageCiencia.findMany({ where: { messageId, userId: { in: ids } }, select: { userId: true, createdAt: true } }),
  ])
  const leu = new Map(leituras.map(l => [l.userId, l.readAt.toISOString()]))
  const ciente = new Map(ciencias.map(x => [x.userId, x.createdAt.toISOString()]))

  const linhas: LinhaRelatorio[] = destinatarios.map(d => ({
    id: d.id, nome: d.name?.trim() || d.email, leuEm: leu.get(d.id) ?? null, cienteEm: ciente.get(d.id) ?? null
  }))
  return {
    publico: await publicoDoComunicado(c.receiverId),
    requerCiencia: c.requerCiencia,
    total: linhas.length,
    lidos: linhas.filter(l => l.leuEm).length,
    cientes: linhas.filter(l => l.cienteEm).length,
    linhas,
  }
}

/** Envia e-mail para quem ainda não deu ciência (ou, se não pede ciência, para quem não leu) */
export async function lembrarPendentes(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" }
  const c = await carregarComunicado(messageId)
  if (!c) return { error: "Comunicado não encontrado" }
  if (!podeGerir(session.user, c.senderId)) return { error: "Sem permissão" }

  const rel = await relatorioLeitura(messageId)
  if ('error' in rel) return { error: rel.error }
  const pendentesIds = new Set(rel.linhas.filter(l => (c.requerCiencia ? !l.cienteEm : !l.leuEm)).map(l => l.id))
  const pendentes = (await destinatariosDoComunicado(c.receiverId, c.senderId)).filter(d => pendentesIds.has(d.id))

  const link = `${process.env.NEXTAUTH_URL || 'https://ceteplnab.com.br'}/dashboard/mensagens`
  const acao = c.requerCiencia ? 'confirmar que está ciente' : 'ler'
  const assunto = `Lembrete: ${c.requerCiencia ? 'confirme a ciência do' : 'leia o'} comunicado "${c.subject}"`
  let enviados = 0, falhas = 0, simulados = 0
  for (let i = 0; i < pendentes.length; i += 5) {
    const lote = pendentes.slice(i, i + 5)
    const res = await Promise.all(lote.map(p => enviarEmail(p.email, assunto, `<meta charset="utf-8">
      <div style="font-family:sans-serif; max-width:600px; margin:0 auto; padding:20px; border:1px solid #e2e8f0; border-radius:12px;">
        <h2 style="color:#0f172a; margin-top:0;">Olá, ${esc(p.name?.trim() || 'Professor(a)')}!</h2>
        <p style="color:#475569;">Ainda falta você ${acao} o comunicado <b>${esc(c.subject)}</b>, enviado por ${esc(c.sender.name?.trim() || 'Direção')} em ${c.createdAt.toLocaleDateString('pt-BR', { timeZone: 'America/Bahia' })}.</p>
        <a href="${link}" style="display:inline-block; background:#0f172a; color:white; padding:12px 24px; border-radius:8px; text-decoration:none; font-weight:bold;">Abrir comunicado</a>
        <p style="color:#94a3b8; font-size:12px; margin-top:24px;">Mensagem automática do Áxis — CETEP LNAB.</p>
      </div>`)))
    res.forEach(r => (r === 'smtp' || r === 'resend' ? enviados++ : r === 'simulado' ? simulados++ : falhas++))
  }
  await logAudit(session.user.id, 'USUARIO', messageId, 'UPDATE', { acao: 'LEMBRETE_COMUNICADO', comunicado: c.subject, pendentes: pendentes.length, enviados, falhas, simulados })
  return { success: true, pendentes: pendentes.length, enviados, falhas, simulados }
}

/** Fixa/desafixa no topo da lista (Direção e administradores) */
export async function alternarFixado(messageId: string) {
  const session = await auth()
  if (!session?.user?.id) return { error: "Não autorizado" }
  if (!(session.user.isSuperuser || session.user.isDirecao)) return { error: "Apenas a Direção pode fixar comunicados" }
  const c = await carregarComunicado(messageId)
  if (!c) return { error: "Comunicado não encontrado" }
  await prisma.message.update({ where: { id: messageId }, data: { fixado: !c.fixado } })
  revalidatePath("/dashboard/mensagens")
  return { success: true, fixado: !c.fixado }
}
