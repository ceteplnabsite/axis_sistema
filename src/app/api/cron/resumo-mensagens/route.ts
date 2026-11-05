import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { enviarEmail, type ResultadoEnvio } from '@/lib/mail'
import { emailResumo, montarResumos } from '@/lib/resumo-mensagens'
import { hojeNaBahia } from '@/config/lembrete-notas'

/**
 * Resumo diário de Mensagens (vercel.json → seg a sex 21:00 UTC = 18h Bahia).
 *
 * Um e-mail por pessoa com algo pendente: conversas não lidas, comunicados esperando
 * "Estou ciente", chamados aguardando a pessoa e, para quem atende, a fila atrasada.
 * Quem não tem pendência não recebe. Liga/desliga em Configurações. Nunca envia duas
 * vezes no mesmo dia (registro na Auditoria).
 *
 * Acesso: a Vercel chama com "Authorization: Bearer <CRON_SECRET>".
 * Administrador logado: ?simular=1 mostra quem receberia; ?simular=1&exemplo=1 mostra o
 * e-mail da primeira pessoa (nada é enviado).
 */
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const ACAO = 'RESUMO_MENSAGENS'

export async function GET(request: NextRequest) {
  const simular = request.nextUrl.searchParams.get('simular') === '1'
  const segredo = process.env.CRON_SECRET
  const viaCron = !!segredo && request.headers.get('authorization') === `Bearer ${segredo}`

  if (!viaCron) {
    const session = await auth()
    if (!session?.user?.isSuperuser || !simular) {
      return NextResponse.json({ message: 'Não autorizado' }, { status: 401 })
    }
  }

  const config = await prisma.globalConfig.findUnique({ where: { id: 'global' }, select: { resumoMensagensAtivo: true } })
  const ativo = config?.resumoMensagensAtivo ?? true
  const hoje = hojeNaBahia()
  const diaSemana = new Date().toLocaleDateString('en-US', { timeZone: 'America/Bahia', weekday: 'short' })
  const diaUtil = !['Sat', 'Sun'].includes(diaSemana)

  if (!simular) {
    if (!ativo) return NextResponse.json({ pulado: true, motivo: 'Resumo desligado em Configurações', hoje })
    if (!diaUtil) return NextResponse.json({ pulado: true, motivo: 'Fim de semana', hoje })
  }

  const resumos = await montarResumos()
  const baseUrl = process.env.NEXTAUTH_URL || 'https://www.ceteplnab.com.br'

  if (simular) {
    if (request.nextUrl.searchParams.get('exemplo') === '1' && resumos[0]) {
      return new NextResponse(emailResumo(resumos[0], baseUrl).html, { headers: { 'content-type': 'text/html; charset=utf-8' } })
    }
    return NextResponse.json({
      simulacao: true, hoje, resumoAtivo: ativo, enviariaHoje: ativo && diaUtil,
      pessoas: resumos.length,
      resumo: resumos.map(r => ({
        nome: r.nome, email: r.email,
        conversas: r.conversas.length, comunicados: r.comunicados.length, chamados: r.chamados.length,
        filaAtrasados: r.fila?.atrasados ?? 0, assunto: emailResumo(r, baseUrl).assunto
      }))
    })
  }

  const sistema = await prisma.user.findFirst({ where: { isSuperuser: true, isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true } })
  const jaEnviado = await prisma.auditLog.findFirst({
    where: { action: 'CREATE', entityType: 'USUARIO', details: { contains: `"acao":"${ACAO}","dia":"${hoje}"` } },
    select: { id: true }
  })
  if (jaEnviado) return NextResponse.json({ pulado: true, motivo: `Resumo de ${hoje} já foi enviado`, hoje })
  // marca o dia antes de enviar: se a Vercel repetir a chamada, não duplica
  const registro = sistema && await prisma.auditLog.create({
    data: { userId: sistema.id, entityType: 'USUARIO', entityId: 'resumo-mensagens', action: 'CREATE', details: JSON.stringify({ acao: ACAO, dia: hoje, status: 'enviando' }) }
  })

  const resultados: { email: string; resultado: ResultadoEnvio }[] = []
  for (let i = 0; i < resumos.length; i += 5) {
    const lote = resumos.slice(i, i + 5)
    resultados.push(...await Promise.all(lote.map(async r => {
      const { assunto, html } = emailResumo(r, baseUrl)
      return { email: r.email, resultado: await enviarEmail(r.email, assunto, html) }
    })))
  }
  const contagem = resultados.reduce<Record<string, number>>((acc, r) => { acc[r.resultado] = (acc[r.resultado] ?? 0) + 1; return acc }, {})
  if (registro) {
    await prisma.auditLog.update({
      where: { id: registro.id },
      data: { details: JSON.stringify({ acao: ACAO, dia: hoje, status: 'concluido', contagem, falhas: resultados.filter(r => r.resultado === 'erro').map(r => r.email) }) }
    })
  }
  return NextResponse.json({ hoje, pessoas: resumos.length, contagem })
}
